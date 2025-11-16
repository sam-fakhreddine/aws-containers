#!/usr/bin/env python3
"""
AWS Profile Bridge - Native Messaging Host for Firefox Extension

Refactored to follow SOLID, DRY, and KISS principles.

SECURITY NOTICE:
This script handles sensitive AWS credentials. It:
- Reads ~/.aws/credentials (local filesystem only)
- Reads ~/.aws/config for SSO profiles
- Reads ~/.aws/sso/cache/ for SSO tokens
- Sends credentials to AWS Federation API (HTTPS, official AWS service)
- Never stores or caches credentials
- Never logs credentials
- Communicates only with Firefox extension via native messaging

For security documentation, see SECURITY.md in the project root.
"""

# CRITICAL: Import logging configuration FIRST, before any other modules
# This prevents boto3 and other libraries from writing to stderr
from . import logging_config  # noqa: F401

from pathlib import Path
from typing import Dict

from .debug_logger import get_logger, section, log_operation, log_result, log_error, timer
from .native_messaging import (
    NativeMessagingHost,
    NativeMessagingReader,
    NativeMessagingWriter,
    MessageHandler
)
from .file_parsers import (
    CredentialsFileParser,
    ConfigFileParser,
    ProfileConfigReader,
    FileCache
)
from .sso_manager import (
    SSOTokenCache,
    SSOCredentialsProvider,
    SSOProfileEnricher
)
from .credential_provider import (
    CredentialProvider,
    ProfileAggregator
)
from .profile_metadata import create_default_metadata_provider
from .console_url_generator import (
    ConsoleURLGenerator,
    ProfileConsoleURLGenerator
)


class AWSProfileBridgeHandler(MessageHandler):
    """
    Handles messages from browser extension.

    Follows Single Responsibility Principle - only message handling logic.
    """

    def __init__(
        self,
        profile_aggregator: ProfileAggregator,
        console_url_generator: ProfileConsoleURLGenerator,
        metadata_provider
    ):
        self.profile_aggregator = profile_aggregator
        self.console_url_generator = console_url_generator
        self.metadata_provider = metadata_provider

    def handle_message(self, message: Dict) -> Dict:
        """Handle incoming messages from the extension."""
        action = message.get('action')

        log_operation(f"Received message", {"action": action})

        if action == 'getProfiles':
            return self._handle_get_profiles()

        elif action == 'enrichSSOProfiles':
            return self._handle_enrich_sso_profiles(message)

        elif action == 'openProfile':
            return self._handle_open_profile(message)

        else:
            error_msg = f'Unknown action: {action}'
            log_result(error_msg, success=False)
            return {
                'action': 'error',
                'message': error_msg
            }

    def _handle_get_profiles(self) -> Dict:
        """
        Handle getProfiles action.

        Returns profiles quickly without SSO token validation (instant load).
        Use enrichSSOProfiles action to validate SSO tokens on-demand.
        """
        with section("Get Profiles (Fast Mode)"):
            # Get all profiles (skip SSO enrichment for fast initial load)
            log_operation("Fetching all profiles (skip SSO enrichment)")
            profiles = self.profile_aggregator.get_all_profiles(skip_sso_enrichment=True)
            log_result(f"Found {len(profiles)} profiles")

            # Add metadata (color, icon)
            log_operation("Adding metadata to profiles")
            for profile in profiles:
                self.metadata_provider.enrich_profile(profile)

                # Clean up SSO-specific fields for non-SSO profiles
                if not profile.get('is_sso'):
                    for key in ['sso_start_url', 'sso_session', 'sso_region', 'sso_account_id', 'sso_role_name']:
                        profile.pop(key, None)

            # Count profile types
            sso_count = sum(1 for p in profiles if p.get('is_sso'))
            cred_count = len(profiles) - sso_count
            log_result(f"Processed profiles: {cred_count} credential-based, {sso_count} SSO")

            return {
                'action': 'profileList',
                'profiles': profiles
            }

    def _handle_enrich_sso_profiles(self, message: Dict) -> Dict:
        """
        Handle enrichSSOProfiles action.

        Validates SSO tokens and returns enriched profile information.
        This is a slow operation that should be triggered on-demand.
        """
        profile_names = message.get('profileNames', [])

        with section("Enrich SSO Profiles (Slow Mode)"):
            if not profile_names:
                # If no specific profiles requested, enrich all SSO profiles
                log_operation("Enriching ALL SSO profiles")
                profiles = self.profile_aggregator.get_all_profiles(skip_sso_enrichment=False)
            else:
                # Enrich only requested profiles
                log_operation(f"Enriching {len(profile_names)} specific profiles",
                             {"profiles": profile_names})
                all_profiles = self.profile_aggregator.get_all_profiles(skip_sso_enrichment=True)
                profiles = []

                for profile in all_profiles:
                    if profile['name'] in profile_names and profile.get('is_sso'):
                        # Re-build with enrichment
                        log_operation(f"Enriching profile: {profile['name']}")
                        enriched = self.profile_aggregator._build_profile_info(
                            profile['name'],
                            skip_sso_enrichment=False
                        )
                        if enriched:
                            profiles.append(enriched)
                    else:
                        profiles.append(profile)

            # Add metadata (color, icon)
            log_operation("Adding metadata to profiles")
            for profile in profiles:
                self.metadata_provider.enrich_profile(profile)

                # Clean up SSO-specific fields for non-SSO profiles
                if not profile.get('is_sso'):
                    for key in ['sso_start_url', 'sso_session', 'sso_region', 'sso_account_id', 'sso_role_name']:
                        profile.pop(key, None)

            log_result(f"Enriched {len(profiles)} profiles")

            return {
                'action': 'profileList',
                'profiles': profiles
            }

    def _handle_open_profile(self, message: Dict) -> Dict:
        """Handle openProfile action."""
        profile_name = message.get('profileName')

        with section(f"Open Profile: {profile_name}"):
            if not profile_name:
                error_msg = 'Missing profileName'
                log_result(error_msg, success=False)
                return {
                    'action': 'error',
                    'message': error_msg
                }

            # Generate console URL
            log_operation("Generating console URL")
            result = self.console_url_generator.generate_url(profile_name)

            if 'error' in result:
                log_result(f"Failed to generate URL: {result['error']}", success=False)
                return {
                    'action': 'error',
                    'message': result['error']
                }

            log_result("Successfully generated console URL")

            return {
                'action': 'consoleUrl',
                'profileName': profile_name,
                'url': result['url'],
                'color': self.metadata_provider.get_color(profile_name),
                'icon': self.metadata_provider.get_icon(profile_name)
            }


class AWSProfileBridge:
    """
    Main application class - coordinates all components.

    Follows Dependency Inversion Principle and uses dependency injection.
    Much simpler than original - just wires components together.
    """

    def __init__(self):
        # Setup file paths
        self.aws_dir = Path.home() / '.aws'
        self.credentials_file = self.aws_dir / 'credentials'
        self.config_file = self.aws_dir / 'config'
        self.sso_cache_dir = self.aws_dir / 'sso' / 'cache'

        # Initialize components
        self._initialize_components()

    def _initialize_components(self):
        """Initialize all components with proper dependencies (DI pattern)."""
        # Shared cache
        file_cache = FileCache()

        # File parsers
        credentials_parser = CredentialsFileParser(self.credentials_file, file_cache)
        config_parser = ConfigFileParser(self.config_file, file_cache)
        config_reader = ProfileConfigReader(self.credentials_file, self.config_file)

        # SSO components
        sso_token_cache = SSOTokenCache(self.sso_cache_dir)
        sso_credentials_provider = SSOCredentialsProvider(sso_token_cache)
        sso_enricher = SSOProfileEnricher(sso_token_cache)

        # Credential provider
        credential_provider = CredentialProvider(
            self.credentials_file,
            self.config_file,
            sso_credentials_provider,
            config_reader
        )

        # Profile aggregator
        profile_aggregator = ProfileAggregator(
            credentials_parser,
            config_parser,
            sso_enricher,
            config_reader,
            self.aws_dir
        )

        # Metadata provider
        metadata_provider = create_default_metadata_provider()

        # Console URL generator
        url_generator = ConsoleURLGenerator()
        console_url_generator = ProfileConsoleURLGenerator(
            credential_provider,
            url_generator
        )

        # Message handler
        message_handler = AWSProfileBridgeHandler(
            profile_aggregator,
            console_url_generator,
            metadata_provider
        )

        # Native messaging host
        self.host = NativeMessagingHost(
            NativeMessagingReader(),
            NativeMessagingWriter(),
            message_handler
        )

    def run(self):
        """Run the native messaging host."""
        self.host.run()


def main():
    """Application entry point."""
    bridge = AWSProfileBridge()
    bridge.run()


if __name__ == '__main__':
    main()
