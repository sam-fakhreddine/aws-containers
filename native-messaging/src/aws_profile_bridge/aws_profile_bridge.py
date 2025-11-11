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

from pathlib import Path
from typing import Dict

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

        if action == 'getProfiles':
            return self._handle_get_profiles()

        elif action == 'openProfile':
            return self._handle_open_profile(message)

        else:
            return {
                'action': 'error',
                'message': f'Unknown action: {action}'
            }

    def _handle_get_profiles(self) -> Dict:
        """Handle getProfiles action."""
        # Get all profiles
        profiles = self.profile_aggregator.get_all_profiles()

        # Add metadata (color, icon)
        for profile in profiles:
            self.metadata_provider.enrich_profile(profile)

            # Clean up SSO-specific fields for non-SSO profiles
            if not profile.get('is_sso'):
                for key in ['sso_start_url', 'sso_region', 'sso_account_id', 'sso_role_name']:
                    profile.pop(key, None)

        return {
            'action': 'profileList',
            'profiles': profiles
        }

    def _handle_open_profile(self, message: Dict) -> Dict:
        """Handle openProfile action."""
        profile_name = message.get('profileName')

        if not profile_name:
            return {
                'action': 'error',
                'message': 'Missing profileName'
            }

        # Generate console URL
        result = self.console_url_generator.generate_url(profile_name)

        if 'error' in result:
            return {
                'action': 'error',
                'message': result['error']
            }

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
        aws_dir = Path.home() / '.aws'
        self.credentials_file = aws_dir / 'credentials'
        self.config_file = aws_dir / 'config'
        self.sso_cache_dir = aws_dir / 'sso' / 'cache'

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
            config_reader
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
