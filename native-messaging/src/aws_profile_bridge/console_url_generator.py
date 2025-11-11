#!/usr/bin/env python3
"""
AWS Console URL Generator

Generates AWS console federation URLs from temporary credentials.
Follows Single Responsibility Principle.

SECURITY NOTICE:
This module handles sensitive AWS credentials. It:
- Receives credentials (never stores them)
- Sends only temporary credentials to AWS Federation API (HTTPS)
- Returns console URL with signin token
- Never logs credentials
"""

import json
import urllib.parse as parse
import urllib.request as request
from typing import Dict, Optional


class ConsoleURLGenerator:
    """
    Generates AWS console federation URLs.

    SECURITY: Only handles temporary credentials (with session token).
    Long-term credentials are not sent over the network.
    """

    def __init__(
        self,
        federation_endpoint: str = "https://signin.aws.amazon.com/federation",
        console_url: str = "https://console.aws.amazon.com/",
        session_duration: int = 43200,  # 12 hours
        timeout: int = 10
    ):
        self.federation_endpoint = federation_endpoint
        self.console_url = console_url
        self.session_duration = session_duration
        self.timeout = timeout

    def generate_url(self, credentials: Dict[str, str]) -> Dict[str, str]:
        """
        Generate console URL from credentials.

        Args:
            credentials: Dict with aws_access_key_id, aws_secret_access_key,
                        and optionally aws_session_token

        Returns:
            Dict with 'url' key or 'error' key
        """
        try:
            # Validate credentials
            validation_error = self._validate_credentials(credentials)
            if validation_error:
                return {'error': validation_error}

            # Check if credentials are temporary
            if not credentials.get('aws_session_token'):
                # Long-term credentials - return basic console URL
                # SECURITY: Don't send long-term credentials over network
                return {'url': self.console_url}

            # Get signin token from AWS
            signin_token = self._get_signin_token(credentials)
            if not signin_token:
                return {'error': 'Failed to get federation token from AWS'}

            # Build console URL
            console_url = self._build_console_url(signin_token)
            return {'url': console_url}

        except Exception as e:
            # SECURITY: Don't include credentials in error message
            return {'error': f'Failed to generate console URL: {str(e)}'}

    @staticmethod
    def _validate_credentials(credentials: Dict[str, str]) -> Optional[str]:
        """Validate that required credential fields are present."""
        if not credentials.get('aws_access_key_id'):
            return 'Missing aws_access_key_id'

        if not credentials.get('aws_secret_access_key'):
            return 'Missing aws_secret_access_key'

        return None

    def _get_signin_token(self, credentials: Dict[str, str]) -> Optional[str]:
        """
        Get signin token from AWS Federation API.

        SECURITY: Sends temporary credentials to official AWS endpoint.
        """
        try:
            # Format credentials for federation API
            session_credentials = {
                'sessionId': credentials['aws_access_key_id'],
                'sessionKey': credentials['aws_secret_access_key'],
                'sessionToken': credentials['aws_session_token']
            }

            # Build request URL
            request_url = self._build_federation_request_url(session_credentials)

            # Call AWS Federation API
            with request.urlopen(request_url, timeout=self.timeout) as response:
                if response.status != 200:
                    return None

                result = json.loads(response.read())
                return result.get('SigninToken')

        except Exception:
            return None

    def _build_federation_request_url(self, session_credentials: Dict[str, str]) -> str:
        """Build AWS Federation API request URL."""
        params = {
            'Action': 'getSigninToken',
            'DurationSeconds': str(self.session_duration),
            'Session': json.dumps(session_credentials)
        }

        query_string = '&'.join(
            f"{key}={parse.quote_plus(value)}"
            for key, value in params.items()
        )

        return f"{self.federation_endpoint}?{query_string}"

    def _build_console_url(self, signin_token: str) -> str:
        """Build final console URL with signin token."""
        params = {
            'Action': 'login',
            'Destination': self.console_url,
            'SigninToken': signin_token,
            'Issuer': 'https://example.com'
        }

        query_string = '&'.join(
            f"{key}={parse.quote_plus(value)}"
            for key, value in params.items()
        )

        return f"{self.federation_endpoint}?{query_string}"


class ProfileConsoleURLGenerator:
    """High-level interface for generating console URLs from profiles."""

    def __init__(
        self,
        credential_provider,  # Type: CredentialProvider
        url_generator: ConsoleURLGenerator
    ):
        self.credential_provider = credential_provider
        self.url_generator = url_generator

    def generate_url(self, profile_name: str) -> Dict[str, str]:
        """
        Generate console URL for a profile.

        Args:
            profile_name: AWS profile name

        Returns:
            Dict with 'url' key or 'error' key
        """
        # Get credentials for profile
        credentials = self.credential_provider.get_credentials(profile_name)

        if not credentials:
            return {
                'error': f'No credentials found for profile: {profile_name}. '
                        f'For SSO profiles, run: aws sso login --profile {profile_name}'
            }

        # Generate URL
        return self.url_generator.generate_url(credentials)
