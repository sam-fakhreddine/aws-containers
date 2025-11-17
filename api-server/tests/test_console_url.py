#!/usr/bin/env python3
"""
Unit tests for console_url module.

Uses mocks to avoid network calls.
"""

import pytest
import json
from unittest.mock import Mock, patch, MagicMock

from aws_profile_bridge.core.console_url import (
    ConsoleURLGenerator,
    ProfileConsoleURLGenerator,
)


class TestConsoleURLGenerator:
    """Test ConsoleURLGenerator class."""

    def test_generate_url_validates_required_fields(self):
        """Test generate_url validates required credential fields."""
        generator = ConsoleURLGenerator()

        # Missing access key ID
        result = generator.generate_url({"aws_secret_access_key": "SECRET"})
        assert "error" in result
        assert "aws_access_key_id" in result["error"]

        # Missing secret access key
        result = generator.generate_url({"aws_access_key_id": "AKIAIOSFODNN7EXAMPLE"})
        assert "error" in result
        assert "aws_secret_access_key" in result["error"]

    def test_generate_url_returns_basic_url_for_longterm_credentials(self):
        """Test generate_url returns basic console URL for long-term credentials."""
        generator = ConsoleURLGenerator()

        credentials = {
            "aws_access_key_id": "AKIAIOSFODNN7EXAMPLE",
            "aws_secret_access_key": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
            # No session token - long-term credentials
        }

        result = generator.generate_url(credentials)

        assert "url" in result
        assert result["url"] == "https://console.aws.amazon.com/"

    @patch("urllib.request.urlopen")
    def test_generate_url_creates_federation_url(self, mock_urlopen):
        """Test generate_url creates federation URL for temporary credentials."""
        # Mock AWS Federation API response
        mock_response = MagicMock()
        mock_response.status = 200
        mock_response.read.return_value = json.dumps(
            {"SigninToken": "test-signin-token"}
        ).encode()
        mock_response.__enter__.return_value = mock_response
        mock_urlopen.return_value = mock_response

        generator = ConsoleURLGenerator()

        credentials = {
            "aws_access_key_id": "ASIAIOSFODNN7EXAMPLE",
            "aws_secret_access_key": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
            "aws_session_token": "SESSION-TOKEN",
        }

        result = generator.generate_url(credentials)

        assert "url" in result
        assert "test-signin-token" in result["url"]
        assert "signin.aws.amazon.com" in result["url"]

    @patch("urllib.request.urlopen")
    def test_generate_url_handles_api_error(self, mock_urlopen):
        """Test generate_url handles AWS API errors gracefully."""
        # Mock API error
        mock_response = MagicMock()
        mock_response.status = 403
        mock_response.__enter__.return_value = mock_response
        mock_urlopen.return_value = mock_response

        generator = ConsoleURLGenerator()

        credentials = {
            "aws_access_key_id": "ASIAIOSFODNN7EXAMPLE",
            "aws_secret_access_key": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
            "aws_session_token": "SESSION-TOKEN",
        }

        result = generator.generate_url(credentials)

        assert "error" in result
        assert "federation token" in result["error"]

    @patch("urllib.request.urlopen")
    def test_generate_url_handles_network_exception(self, mock_urlopen):
        """Test generate_url handles network exceptions."""
        mock_urlopen.side_effect = Exception("Network error")

        generator = ConsoleURLGenerator()

        credentials = {
            "aws_access_key_id": "ASIAIOSFODNN7EXAMPLE",
            "aws_secret_access_key": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
            "aws_session_token": "SESSION-TOKEN",
        }

        result = generator.generate_url(credentials)

        assert "error" in result

    @patch("urllib.request.urlopen")
    def test_generate_url_uses_custom_parameters(self, mock_urlopen):
        """Test generate_url uses custom federation endpoint and timeout."""
        mock_response = MagicMock()
        mock_response.status = 200
        mock_response.read.return_value = json.dumps(
            {"SigninToken": "test-token"}
        ).encode()
        mock_response.__enter__.return_value = mock_response
        mock_urlopen.return_value = mock_response

        generator = ConsoleURLGenerator(
            federation_endpoint="https://custom.endpoint.com/federation",
            session_duration=3600,
            timeout=5,
        )

        credentials = {
            "aws_access_key_id": "ASIAIOSFODNN7EXAMPLE",
            "aws_secret_access_key": "SECRET",
            "aws_session_token": "TOKEN",
        }

        result = generator.generate_url(credentials)

        # Verify custom endpoint was used
        assert "url" in result
        # Verify timeout was passed (check call args)
        call_args = mock_urlopen.call_args
        assert call_args[1]["timeout"] == 5

    @patch("urllib.request.urlopen")
    def test_generate_url_returns_none_signin_token(self, mock_urlopen):
        """Test generate_url handles missing signin token."""
        mock_response = MagicMock()
        mock_response.status = 200
        mock_response.read.return_value = json.dumps({}).encode()  # No SigninToken
        mock_response.__enter__.return_value = mock_response
        mock_urlopen.return_value = mock_response

        generator = ConsoleURLGenerator()

        credentials = {
            "aws_access_key_id": "ASIAIOSFODNN7EXAMPLE",
            "aws_secret_access_key": "SECRET",
            "aws_session_token": "TOKEN",
        }

        result = generator.generate_url(credentials)

        assert "error" in result

    def test_generate_url_exception_in_generate(self):
        """Test exception handling in generate_url."""
        generator = ConsoleURLGenerator()

        # Pass invalid credentials that will fail validation
        result = generator.generate_url({"invalid": "data"})

        assert "error" in result
        assert "aws_access_key_id" in result["error"]


class TestProfileConsoleURLGenerator:
    """Test ProfileConsoleURLGenerator class."""

    def test_generate_url_gets_credentials_from_provider(self):
        """Test generate_url gets credentials from credential provider."""
        mock_credential_provider = Mock()
        mock_credential_provider.get_credentials.return_value = {
            "aws_access_key_id": "KEY",
            "aws_secret_access_key": "SECRET",
        }

        mock_url_generator = Mock()
        mock_url_generator.generate_url.return_value = {
            "url": "https://console.aws.amazon.com/"
        }

        generator = ProfileConsoleURLGenerator(
            mock_credential_provider, mock_url_generator
        )

        result = generator.generate_url("test-profile")

        mock_credential_provider.get_credentials.assert_called_once_with("test-profile")
        mock_url_generator.generate_url.assert_called_once()

    def test_generate_url_returns_error_when_no_credentials(self):
        """Test generate_url returns error when credentials not found."""
        mock_credential_provider = Mock()
        mock_credential_provider.get_credentials.return_value = None

        mock_url_generator = Mock()

        generator = ProfileConsoleURLGenerator(
            mock_credential_provider, mock_url_generator
        )

        result = generator.generate_url("test-profile")

        assert "error" in result
        assert "test-profile" in result["error"]
        assert "aws sso login" in result["error"].lower()

    def test_generate_url_passes_credentials_to_url_generator(self):
        """Test generate_url passes credentials to URL generator."""
        credentials = {
            "aws_access_key_id": "KEY",
            "aws_secret_access_key": "SECRET",
            "aws_session_token": "TOKEN",
        }

        mock_credential_provider = Mock()
        mock_credential_provider.get_credentials.return_value = credentials

        mock_url_generator = Mock()
        mock_url_generator.generate_url.return_value = {
            "url": "https://console.aws.amazon.com/"
        }

        generator = ProfileConsoleURLGenerator(
            mock_credential_provider, mock_url_generator
        )

        result = generator.generate_url("test-profile")

        mock_url_generator.generate_url.assert_called_once_with(credentials)

    def test_generate_url_returns_url_from_generator(self):
        """Test generate_url returns URL from URL generator."""
        mock_credential_provider = Mock()
        mock_credential_provider.get_credentials.return_value = {
            "aws_access_key_id": "KEY",
            "aws_secret_access_key": "SECRET",
        }

        expected_result = {"url": "https://signin.aws.amazon.com/federation?..."}

        mock_url_generator = Mock()
        mock_url_generator.generate_url.return_value = expected_result

        generator = ProfileConsoleURLGenerator(
            mock_credential_provider, mock_url_generator
        )

        result = generator.generate_url("test-profile")

        assert result == expected_result

    def test_generate_url_propagates_error_from_generator(self):
        """Test generate_url propagates errors from URL generator."""
        mock_credential_provider = Mock()
        mock_credential_provider.get_credentials.return_value = {
            "aws_access_key_id": "KEY",
            "aws_secret_access_key": "SECRET",
        }

        error_result = {"error": "Some error occurred"}

        mock_url_generator = Mock()
        mock_url_generator.generate_url.return_value = error_result

        generator = ProfileConsoleURLGenerator(
            mock_credential_provider, mock_url_generator
        )

        result = generator.generate_url("test-profile")

        assert result == error_result
