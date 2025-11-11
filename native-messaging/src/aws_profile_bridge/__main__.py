#!/usr/bin/env python3
"""
Entry point for AWS Profile Bridge when run as a module or PyInstaller executable.

This file uses absolute imports to avoid the "attempted relative import with no known parent package"
error that occurs when PyInstaller bundles the application.

Usage:
    python3 -m aws_profile_bridge
    or
    ./aws_profile_bridge (PyInstaller executable)
"""

from pathlib import Path
from typing import Dict

# Use absolute imports for PyInstaller compatibility
from aws_profile_bridge.native_messaging import (
    NativeMessagingHost,
    NativeMessagingReader,
    NativeMessagingWriter,
    MessageHandler
)
from aws_profile_bridge.file_parsers import (
    CredentialsFileParser,
    ConfigFileParser
)
from aws_profile_bridge.sso_manager import SSOManager
from aws_profile_bridge.credential_provider import CredentialProvider
from aws_profile_bridge.profile_metadata import ProfileMetadataProvider
from aws_profile_bridge.console_url_generator import ConsoleUrlGenerator


class AWSProfileBridgeHandler(MessageHandler):
    """
    Handles native messaging protocol for AWS Profile Bridge.

    Receives messages from Firefox extension, processes them, and sends responses.
    """

    def __init__(
        self,
        credential_provider: CredentialProvider,
        profile_metadata_provider: ProfileMetadataProvider,
        console_url_generator: ConsoleUrlGenerator
    ):
        self.credential_provider = credential_provider
        self.profile_metadata = profile_metadata_provider
        self.console_url_generator = console_url_generator

    def handle_message(self, message: Dict) -> Dict:
        """Process incoming message and return response."""
        action = message.get('action')

        if action == 'getProfiles':
            return self._handle_get_profiles()
        elif action == 'openProfile':
            return self._handle_open_profile(message)
        else:
            return {'error': f'Unknown action: {action}'}

    def _handle_get_profiles(self) -> Dict:
        """Return list of all AWS profiles with metadata."""
        profiles = self.credential_provider.get_all_profiles()

        profile_list = []
        for profile_name in profiles:
            metadata = self.profile_metadata.get_metadata(profile_name)
            profile_list.append({
                'name': profile_name,
                'color': metadata.get('color', 'blue'),
                'icon': metadata.get('icon', 'briefcase'),
                'expiration': metadata.get('expiration'),
                'is_sso': metadata.get('is_sso', False)
            })

        return {
            'action': 'profileList',
            'profiles': profile_list
        }

    def _handle_open_profile(self, message: Dict) -> Dict:
        """Generate console URL for specified profile."""
        profile_name = message.get('profileName')
        region = message.get('region', 'us-east-1')

        if not profile_name:
            return {'error': 'Missing profileName'}

        try:
            credentials = self.credential_provider.get_credentials(profile_name)
            console_url = self.console_url_generator.generate_url(
                credentials=credentials,
                region=region
            )

            metadata = self.profile_metadata.get_metadata(profile_name)

            return {
                'action': 'consoleUrl',
                'url': console_url,
                'profileName': profile_name,
                'color': metadata.get('color', 'blue'),
                'icon': metadata.get('icon', 'briefcase')
            }
        except Exception as e:
            return {
                'error': f'Failed to open profile: {str(e)}'
            }


def main():
    """Main entry point for the native messaging host."""
    # Setup paths
    home = Path.home()
    credentials_path = home / '.aws' / 'credentials'
    config_path = home / '.aws' / 'config'
    sso_cache_dir = home / '.aws' / 'sso' / 'cache'

    # Initialize components (Dependency Injection)
    credentials_parser = CredentialsFileParser(credentials_path)
    config_parser = ConfigFileParser(config_path)
    sso_manager = SSOManager(sso_cache_dir, config_parser)

    credential_provider = CredentialProvider(
        credentials_parser=credentials_parser,
        config_parser=config_parser,
        sso_manager=sso_manager
    )

    profile_metadata_provider = ProfileMetadataProvider(
        credentials_parser=credentials_parser,
        config_parser=config_parser,
        sso_manager=sso_manager
    )

    console_url_generator = ConsoleUrlGenerator()

    # Create message handler
    handler = AWSProfileBridgeHandler(
        credential_provider=credential_provider,
        profile_metadata_provider=profile_metadata_provider,
        console_url_generator=console_url_generator
    )

    # Create native messaging host
    reader = NativeMessagingReader()
    writer = NativeMessagingWriter()
    host = NativeMessagingHost(reader, writer, handler)

    # Run the host (blocks until stdin closes)
    host.run()


if __name__ == '__main__':
    main()
