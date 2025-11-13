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
from .profile_cache import ProfileCache


class AWSProfileBridgeHandler(MessageHandler):
    """
    Handles messages from browser extension.

    Follows Single Responsibility Principle - only message handling logic.
    """

    def __init__(
        self,
        profile_aggregator: ProfileAggregator,
        console_url_generator: ProfileConsoleURLGenerator,
        metadata_provider,
        profile_cache: ProfileCache
    ):
        self.profile_aggregator = profile_aggregator
        self.console_url_generator = console_url_generator
        self.metadata_provider = metadata_provider
        self.profile_cache = profile_cache

    def handle_message(self, message: Dict) -> Dict:
        """Handle incoming messages from the extension."""
        action = message.get('action')

        log_operation(f"Received message", {"action": action})

        if action == 'getCachedProfiles':
            return self._handle_get_cached_profiles()

        elif action == 'getProfiles':
            return self._handle_get_profiles()

        elif action == 'refreshCache':
            return self._handle_refresh_cache()

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

    def _handle_get_cached_profiles(self) -> Dict:
        """
        Handle getCachedProfiles action.

        Returns profiles from cache instantly if available.
        Falls back to reading from files if cache is empty/expired.
        """
        with section("Get Cached Profiles (Instant Mode)"):
            # Try to get from cache first
            cached_profiles = self.profile_cache.get_cached_profiles()

            if cached_profiles is not None:
                log_result(f"Returning {len(cached_profiles)} profiles from cache (instant)")
                return {
                    'action': 'profileList',
                    'profiles': cached_profiles,
                    'fromCache': True
                }

            # Cache miss - fall back to reading from files
            log_operation("Cache miss - reading from files")
            return self._handle_get_profiles()

    def _handle_get_profiles(self) -> Dict:
        """
        Handle getProfiles action.

        Returns profiles WITH expiration metadata (fast - just file I/O, no API calls).
        Also updates the cache for future fast access.
        """
        with section("Get Profiles (Fast Mode with TTL)"):
            # Get all profiles WITH SSO token expiration (fast - just reads token files)
            # This does NOT call AWS APIs, just reads ~/.aws/sso/cache/*.json
            log_operation("Fetching all profiles with token expiration metadata")
            profiles = self.profile_aggregator.get_all_profiles(skip_sso_enrichment=False)
            log_result(f"Found {len(profiles)} profiles")

            # Add metadata (color, icon) and TTL info
            log_operation("Adding metadata and TTL info to profiles")
            for profile in profiles:
                self.metadata_provider.enrich_profile(profile)

                # Clean up SSO-specific fields for non-SSO profiles
                if not profile.get('is_sso'):
                    for key in ['sso_start_url', 'sso_session', 'sso_region', 'sso_account_id', 'sso_role_name']:
                        profile.pop(key, None)

            # Count profile types
            sso_count = sum(1 for p in profiles if p.get('is_sso'))
            cred_count = len(profiles) - sso_count

            # Count expired profiles
            expired_count = sum(1 for p in profiles if p.get('expired'))
            has_ttl_count = sum(1 for p in profiles if p.get('expiration'))

            log_result(
                f"Processed profiles: {cred_count} credential-based, {sso_count} SSO "
                f"({has_ttl_count} with TTL info, {expired_count} expired)"
            )

            # Update cache for next time
            log_operation("Updating profile cache")
            self.profile_cache.update_cache(profiles)

            return {
                'action': 'profileList',
                'profiles': profiles,
                'fromCache': False
            }

    def _handle_refresh_cache(self) -> Dict:
        """
        Handle refreshCache action.

        Reads profiles from files with expiration metadata and updates cache.
        Returns success status (doesn't return profile data).
        """
        with section("Refresh Cache"):
            log_operation("Refreshing profile cache in background")

            # Get profiles with TTL metadata
            profiles = self.profile_aggregator.get_all_profiles(skip_sso_enrichment=False)
            log_result(f"Found {len(profiles)} profiles")

            # Add metadata
            for profile in profiles:
                self.metadata_provider.enrich_profile(profile)
                if not profile.get('is_sso'):
                    for key in ['sso_start_url', 'sso_session', 'sso_region', 'sso_account_id', 'sso_role_name']:
                        profile.pop(key, None)

            # Count TTL stats
            expired_count = sum(1 for p in profiles if p.get('expired'))
            has_ttl_count = sum(1 for p in profiles if p.get('expiration'))

            # Update cache
            success = self.profile_cache.update_cache(profiles)

            if success:
                log_result(f"Cache refreshed successfully ({len(profiles)} profiles, {has_ttl_count} with TTL, {expired_count} expired)")
                return {
                    'action': 'cacheRefreshed',
                    'success': True,
                    'profile_count': len(profiles),
                    'expired_count': expired_count,
                    'has_ttl_count': has_ttl_count
                }
            else:
                log_result("Failed to refresh cache", success=False)
                return {
                    'action': 'cacheRefreshed',
                    'success': False,
                    'error': 'Failed to update cache'
                }

    def _handle_enrich_sso_profiles(self, message: Dict) -> Dict:
        """
        Handle enrichSSOProfiles action.

        NOTE: This action now does the same thing as getProfiles (reads token expiration).
        Kept for backward compatibility. Token expiration is fast (file I/O only).
        For actual credential validation (slow AWS API calls), use a future validateTokens action.
        """
        # Just call getProfiles - they're now equivalent
        log_operation("enrichSSOProfiles called (now equivalent to getProfiles)")
        return self._handle_get_profiles()

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

        # Profile cache
        profile_cache = ProfileCache()

        # Message handler
        message_handler = AWSProfileBridgeHandler(
            profile_aggregator,
            console_url_generator,
            metadata_provider,
            profile_cache
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
