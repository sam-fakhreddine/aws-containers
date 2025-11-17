#!/usr/bin/env python3
"""
Unit tests for credentials module.
"""

import pytest
from unittest.mock import Mock, patch
from pathlib import Path

from aws_profile_bridge.core.credentials import (
    CredentialProvider,
    ProfileAggregator,
    BOTO3_AVAILABLE,
)
from unittest.mock import patch


class TestCredentialProvider:
    """Test CredentialProvider class."""

    def test_get_credentials_from_credentials_file(self):
        """Test getting credentials from credentials file."""
        mock_config_reader = Mock()
        mock_config_reader.get_credentials.return_value = {
            "aws_access_key_id": "KEY",
            "aws_secret_access_key": "SECRET",
        }

        provider = CredentialProvider(
            Path("/fake/credentials"),
            Path("/fake/config"),
            Mock(),
            mock_config_reader,
        )

        result = provider.get_credentials("test-profile")

        assert result is not None
        assert result["aws_access_key_id"] == "KEY"
        mock_config_reader.get_credentials.assert_called_once_with("test-profile")

    def test_get_credentials_from_sso(self):
        """Test getting credentials from SSO."""
        mock_config_reader = Mock()
        mock_config_reader.get_credentials.return_value = None
        mock_config_reader.get_config.return_value = {
            "sso_start_url": "https://example.com/start",
            "sso_region": "us-east-1",
        }

        mock_sso_provider = Mock()
        mock_sso_provider.get_credentials.return_value = {
            "aws_access_key_id": "SSO_KEY",
            "aws_secret_access_key": "SSO_SECRET",
        }

        provider = CredentialProvider(
            Path("/fake/credentials"),
            Path("/fake/config"),
            mock_sso_provider,
            mock_config_reader,
        )

        result = provider.get_credentials("sso-profile")

        assert result is not None
        assert result["aws_access_key_id"] == "SSO_KEY"


class TestCredentialProviderBoto3:
    """Test CredentialProvider with boto3."""

    @patch("aws_profile_bridge.core.credentials.BOTO3_AVAILABLE", True)
    @patch("aws_profile_bridge.core.credentials.boto3")
    def test_get_credentials_with_boto3(self, mock_boto3):
        """Test getting credentials using boto3."""
        mock_session = Mock()
        mock_credentials = Mock()
        mock_credentials.access_key = "BOTO3_KEY"
        mock_credentials.secret_key = "BOTO3_SECRET"
        mock_credentials.token = "BOTO3_TOKEN"
        mock_session.get_credentials.return_value = mock_credentials
        mock_boto3.Session.return_value = mock_session

        provider = CredentialProvider(
            Path("/fake/credentials"),
            Path("/fake/config"),
            Mock(),
            Mock(),
        )

        result = provider.get_credentials("test-profile")

        assert result is not None
        assert result["aws_access_key_id"] == "BOTO3_KEY"
        assert result["aws_secret_access_key"] == "BOTO3_SECRET"
        assert result["aws_session_token"] == "BOTO3_TOKEN"

    @patch("aws_profile_bridge.core.credentials.BOTO3_AVAILABLE", True)
    @patch("aws_profile_bridge.core.credentials.boto3")
    def test_get_credentials_boto3_no_token(self, mock_boto3):
        """Test getting credentials using boto3 without session token."""
        mock_session = Mock()
        mock_credentials = Mock()
        mock_credentials.access_key = "BOTO3_KEY"
        mock_credentials.secret_key = "BOTO3_SECRET"
        mock_credentials.token = None
        mock_session.get_credentials.return_value = mock_credentials
        mock_boto3.Session.return_value = mock_session

        provider = CredentialProvider(
            Path("/fake/credentials"),
            Path("/fake/config"),
            Mock(),
            Mock(),
        )

        result = provider.get_credentials("test-profile")

        assert result is not None
        assert "aws_session_token" not in result

    @patch("aws_profile_bridge.core.credentials.BOTO3_AVAILABLE", True)
    @patch("aws_profile_bridge.core.credentials.boto3")
    def test_get_credentials_boto3_fails_fallback(self, mock_boto3):
        """Test fallback when boto3 fails."""
        mock_boto3.Session.side_effect = Exception("Boto3 error")

        mock_config_reader = Mock()
        mock_config_reader.get_credentials.return_value = {
            "aws_access_key_id": "FALLBACK_KEY",
            "aws_secret_access_key": "FALLBACK_SECRET",
        }

        provider = CredentialProvider(
            Path("/fake/credentials"),
            Path("/fake/config"),
            Mock(),
            mock_config_reader,
        )

        result = provider.get_credentials("test-profile")

        assert result is not None
        assert result["aws_access_key_id"] == "FALLBACK_KEY"


class TestProfileAggregator:
    """Test ProfileAggregator class."""

    def test_should_skip_sso_profiles_when_nosso_exists(self):
        """Test that SSO profiles are skipped when .nosso file exists."""
        mock_aws_dir = Mock(spec=Path)
        mock_nosso_file = Mock(spec=Path)
        mock_nosso_file.exists.return_value = True
        mock_aws_dir.__truediv__ = Mock(return_value=mock_nosso_file)

        aggregator = ProfileAggregator(Mock(), Mock(), Mock(), Mock(), mock_aws_dir)

        assert aggregator._should_skip_sso_profiles() is True

    def test_should_not_skip_sso_profiles_when_nosso_missing(self):
        """Test that SSO profiles are not skipped when .nosso file is missing."""
        mock_aws_dir = Mock(spec=Path)
        mock_nosso_file = Mock(spec=Path)
        mock_nosso_file.exists.return_value = False
        mock_aws_dir.__truediv__ = Mock(return_value=mock_nosso_file)

        aggregator = ProfileAggregator(Mock(), Mock(), Mock(), Mock(), mock_aws_dir)

        assert aggregator._should_skip_sso_profiles() is False

    def test_get_profiles_manual_skips_sso_when_nosso_exists(self):
        """Test manual profile parsing skips SSO when .nosso exists."""
        mock_cred_parser = Mock()
        mock_cred_parser.parse.return_value = [
            {"name": "cred-profile", "has_credentials": True}
        ]

        mock_config_parser = Mock()
        mock_config_parser.parse.return_value = [
            {"name": "sso-profile", "is_sso": True}
        ]

        mock_aws_dir = Mock(spec=Path)
        mock_nosso_file = Mock(spec=Path)
        mock_nosso_file.exists.return_value = True
        mock_aws_dir.__truediv__ = Mock(return_value=mock_nosso_file)

        aggregator = ProfileAggregator(
            mock_cred_parser,
            mock_config_parser,
            Mock(),
            Mock(),
            mock_aws_dir,
        )

        result = aggregator._get_profiles_manual()

        # Should only return credential profiles
        assert len(result) == 1
        assert result[0]["name"] == "cred-profile"
        mock_config_parser.parse.assert_not_called()

    def test_get_profiles_manual_includes_sso_when_nosso_missing(self):
        """Test manual profile parsing includes SSO when .nosso is missing."""
        mock_cred_parser = Mock()
        mock_cred_parser.parse.return_value = [
            {"name": "cred-profile", "has_credentials": True}
        ]

        mock_config_parser = Mock()
        mock_config_parser.parse.return_value = [
            {"name": "sso-profile", "is_sso": True}
        ]

        mock_aws_dir = Mock(spec=Path)
        mock_nosso_file = Mock(spec=Path)
        mock_nosso_file.exists.return_value = False
        mock_aws_dir.__truediv__ = Mock(return_value=mock_nosso_file)

        aggregator = ProfileAggregator(
            mock_cred_parser,
            mock_config_parser,
            Mock(),
            Mock(),
            mock_aws_dir,
        )

        result = aggregator._get_profiles_manual()

        # Should return both profiles
        assert len(result) == 2
        profile_names = {p["name"] for p in result}
        assert "cred-profile" in profile_names
        assert "sso-profile" in profile_names

    @patch("aws_profile_bridge.core.credentials.BOTO3_AVAILABLE", True)
    @patch("aws_profile_bridge.core.credentials.boto3")
    def test_get_profiles_with_boto3(self, mock_boto3):
        """Test getting profiles using boto3."""
        mock_session = Mock()
        mock_session.available_profiles = ["profile1", "profile2"]
        mock_boto3.Session.return_value = mock_session

        mock_config_reader = Mock()
        mock_config_reader.get_config.return_value = None

        mock_cred_parser = Mock()
        mock_cred_parser.parse.return_value = [
            {"name": "profile1", "has_credentials": True},
            {"name": "profile2", "has_credentials": True},
        ]

        mock_aws_dir = Mock(spec=Path)
        mock_nosso_file = Mock(spec=Path)
        mock_nosso_file.exists.return_value = False
        mock_aws_dir.__truediv__ = Mock(return_value=mock_nosso_file)

        aggregator = ProfileAggregator(
            mock_cred_parser,
            Mock(),
            Mock(),
            mock_config_reader,
            mock_aws_dir,
        )

        result = aggregator._get_profiles_with_boto3()

        assert len(result) == 2
        mock_boto3.Session.assert_called()

    @patch("aws_profile_bridge.core.credentials.BOTO3_AVAILABLE", True)
    @patch("aws_profile_bridge.core.credentials.boto3")
    def test_get_profiles_with_boto3_error_fallback(self, mock_boto3):
        """Test fallback to manual parsing when boto3 fails."""
        mock_session = Mock()
        mock_session.available_profiles = Mock(side_effect=Exception("Boto3 error"))
        mock_boto3.Session.return_value = mock_session

        mock_cred_parser = Mock()
        mock_cred_parser.parse.return_value = [
            {"name": "profile1", "has_credentials": True}
        ]

        mock_config_parser = Mock()
        mock_config_parser.parse.return_value = []

        mock_aws_dir = Mock(spec=Path)
        mock_nosso_file = Mock(spec=Path)
        mock_nosso_file.exists.return_value = False
        mock_aws_dir.__truediv__ = Mock(return_value=mock_nosso_file)

        aggregator = ProfileAggregator(
            mock_cred_parser,
            mock_config_parser,
            Mock(),
            Mock(),
            mock_aws_dir,
        )

        result = aggregator._get_profiles_with_boto3()

        assert len(result) == 1
        assert result[0]["name"] == "profile1"

    def test_build_profile_info_sso_profile(self):
        """Test building profile info for SSO profile."""
        mock_config_reader = Mock()
        mock_config_reader.get_config.return_value = {
            "sso_start_url": "https://example.com/start",
            "sso_region": "us-east-1",
            "sso_account_id": "123456789012",
            "sso_role_name": "Admin",
            "region": "us-west-2",
        }

        mock_aws_dir = Mock(spec=Path)
        mock_nosso_file = Mock(spec=Path)
        mock_nosso_file.exists.return_value = False
        mock_aws_dir.__truediv__ = Mock(return_value=mock_nosso_file)

        aggregator = ProfileAggregator(
            Mock(),
            Mock(),
            Mock(),
            mock_config_reader,
            mock_aws_dir,
        )

        result = aggregator._build_profile_info("sso-profile")

        assert result is not None
        assert result["is_sso"] is True
        assert result["sso_start_url"] == "https://example.com/start"

    def test_build_profile_info_sso_skipped_with_nosso(self):
        """Test SSO profile is skipped when .nosso exists."""
        mock_config_reader = Mock()
        mock_config_reader.get_config.return_value = {
            "sso_start_url": "https://example.com/start"
        }

        mock_aws_dir = Mock(spec=Path)
        mock_nosso_file = Mock(spec=Path)
        mock_nosso_file.exists.return_value = True
        mock_aws_dir.__truediv__ = Mock(return_value=mock_nosso_file)

        aggregator = ProfileAggregator(
            Mock(),
            Mock(),
            Mock(),
            mock_config_reader,
            mock_aws_dir,
        )

        result = aggregator._build_profile_info("sso-profile")

        assert result is None

    def test_build_profile_info_credential_profile(self):
        """Test building profile info for credential-based profile."""
        mock_config_reader = Mock()
        mock_config_reader.get_config.return_value = {"region": "us-east-1"}

        mock_cred_parser = Mock()
        mock_cred_parser.parse.return_value = [
            {
                "name": "cred-profile",
                "has_credentials": True,
                "expiration": None,
                "expired": False,
            }
        ]

        mock_aws_dir = Mock(spec=Path)
        mock_nosso_file = Mock(spec=Path)
        mock_nosso_file.exists.return_value = False
        mock_aws_dir.__truediv__ = Mock(return_value=mock_nosso_file)

        aggregator = ProfileAggregator(
            mock_cred_parser,
            Mock(),
            Mock(),
            mock_config_reader,
            mock_aws_dir,
        )

        result = aggregator._build_profile_info("cred-profile")

        assert result is not None
        assert result["is_sso"] is False
        assert result["has_credentials"] is True

    def test_build_profile_info_no_config(self):
        """Test building profile info when no config exists."""
        mock_config_reader = Mock()
        mock_config_reader.get_config.return_value = None

        mock_cred_parser = Mock()
        mock_cred_parser.parse.return_value = [
            {
                "name": "simple-profile",
                "has_credentials": True,
                "expiration": None,
                "expired": False,
            }
        ]

        mock_aws_dir = Mock(spec=Path)
        mock_nosso_file = Mock(spec=Path)
        mock_nosso_file.exists.return_value = False
        mock_aws_dir.__truediv__ = Mock(return_value=mock_nosso_file)

        aggregator = ProfileAggregator(
            mock_cred_parser,
            Mock(),
            Mock(),
            mock_config_reader,
            mock_aws_dir,
        )

        result = aggregator._build_profile_info("simple-profile")

        assert result is not None
        assert result["has_credentials"] is True

    def test_build_profile_info_error_handling(self):
        """Test error handling in profile info building."""
        mock_config_reader = Mock()
        mock_config_reader.get_config.side_effect = Exception("Config error")

        mock_aws_dir = Mock(spec=Path)
        mock_nosso_file = Mock(spec=Path)
        mock_nosso_file.exists.return_value = False
        mock_aws_dir.__truediv__ = Mock(return_value=mock_nosso_file)

        aggregator = ProfileAggregator(
            Mock(),
            Mock(),
            Mock(),
            mock_config_reader,
            mock_aws_dir,
        )

        result = aggregator._build_profile_info("error-profile")

        assert result is None

    def test_build_profile_info_with_sso_session(self):
        """Test building profile info for SSO profile with sso_session."""
        mock_config_reader = Mock()
        mock_config_reader.get_config.return_value = {
            "sso_session": "my-sso",
            "sso_region": "us-east-1",
            "region": "us-west-2",
        }

        mock_aws_dir = Mock(spec=Path)
        mock_nosso_file = Mock(spec=Path)
        mock_nosso_file.exists.return_value = False
        mock_aws_dir.__truediv__ = Mock(return_value=mock_nosso_file)

        aggregator = ProfileAggregator(
            Mock(),
            Mock(),
            Mock(),
            mock_config_reader,
            mock_aws_dir,
        )

        result = aggregator._build_profile_info("sso-session-profile")

        assert result is not None
        assert result["is_sso"] is True
        assert result["sso_session"] == "my-sso"

    def test_build_profile_info_with_sso_enrichment(self):
        """Test building profile info with SSO enrichment enabled."""
        mock_config_reader = Mock()
        mock_config_reader.get_config.return_value = {
            "sso_start_url": "https://example.com/start",
            "sso_region": "us-east-1",
        }

        mock_sso_enricher = Mock()
        mock_sso_enricher.enrich_profile.return_value = {
            "name": "sso-profile",
            "is_sso": True,
            "has_credentials": True,
            "expired": False,
        }

        mock_aws_dir = Mock(spec=Path)
        mock_nosso_file = Mock(spec=Path)
        mock_nosso_file.exists.return_value = False
        mock_aws_dir.__truediv__ = Mock(return_value=mock_nosso_file)

        aggregator = ProfileAggregator(
            Mock(),
            Mock(),
            mock_sso_enricher,
            mock_config_reader,
            mock_aws_dir,
        )

        result = aggregator._build_profile_info(
            "sso-profile", skip_sso_enrichment=False
        )

        assert result is not None
        mock_sso_enricher.enrich_profile.assert_called_once()

    def test_get_profiles_manual_with_enrichment(self):
        """Test manual profile parsing with SSO enrichment."""
        mock_cred_parser = Mock()
        mock_cred_parser.parse.return_value = [
            {"name": "cred-profile", "has_credentials": True}
        ]

        mock_config_parser = Mock()
        mock_config_parser.parse.return_value = [
            {"name": "sso-profile", "is_sso": True}
        ]

        mock_sso_enricher = Mock()
        mock_sso_enricher.enrich_profile.side_effect = lambda p: p

        mock_aws_dir = Mock(spec=Path)
        mock_nosso_file = Mock(spec=Path)
        mock_nosso_file.exists.return_value = False
        mock_aws_dir.__truediv__ = Mock(return_value=mock_nosso_file)

        aggregator = ProfileAggregator(
            mock_cred_parser,
            mock_config_parser,
            mock_sso_enricher,
            Mock(),
            mock_aws_dir,
        )

        result = aggregator._get_profiles_manual(skip_sso_enrichment=False)

        assert len(result) == 2
        mock_sso_enricher.enrich_profile.assert_called_once()

    @patch("aws_profile_bridge.core.credentials.BOTO3_AVAILABLE", False)
    def test_get_all_profiles_without_boto3(self):
        """Test getting all profiles when boto3 is not available."""
        mock_cred_parser = Mock()
        mock_cred_parser.parse.return_value = [
            {"name": "profile1", "has_credentials": True}
        ]

        mock_config_parser = Mock()
        mock_config_parser.parse.return_value = []

        mock_aws_dir = Mock(spec=Path)
        mock_nosso_file = Mock(spec=Path)
        mock_nosso_file.exists.return_value = False
        mock_aws_dir.__truediv__ = Mock(return_value=mock_nosso_file)

        aggregator = ProfileAggregator(
            mock_cred_parser,
            mock_config_parser,
            Mock(),
            Mock(),
            mock_aws_dir,
        )

        result = aggregator.get_all_profiles()

        assert len(result) == 1
        assert result[0]["name"] == "profile1"

    def test_build_profile_info_no_credentials_in_file(self):
        """Test building profile when credentials file has no actual credentials."""
        mock_config_reader = Mock()
        mock_config_reader.get_config.return_value = {"region": "us-east-1"}

        mock_cred_parser = Mock()
        mock_cred_parser.parse.return_value = [
            {
                "name": "empty-profile",
                "has_credentials": False,
                "expiration": None,
                "expired": False,
            }
        ]

        mock_aws_dir = Mock(spec=Path)
        mock_nosso_file = Mock(spec=Path)
        mock_nosso_file.exists.return_value = False
        mock_aws_dir.__truediv__ = Mock(return_value=mock_nosso_file)

        aggregator = ProfileAggregator(
            mock_cred_parser,
            Mock(),
            Mock(),
            mock_config_reader,
            mock_aws_dir,
        )

        result = aggregator._build_profile_info("empty-profile")

        assert result is not None
        assert result["has_credentials"] is False

    def test_boto3_not_available_import(self):
        """Test behavior when boto3 is not available."""
        # This tests the import error handling at module level
        # The BOTO3_AVAILABLE flag should be False when boto3 is not installed
        # We can't easily test the actual import error, but we can verify the flag works
        with patch("aws_profile_bridge.core.credentials.BOTO3_AVAILABLE", False):
            mock_config_reader = Mock()
            mock_config_reader.get_credentials.return_value = {
                "aws_access_key_id": "KEY",
                "aws_secret_access_key": "SECRET",
            }

            provider = CredentialProvider(
                Path("/fake/credentials"),
                Path("/fake/config"),
                Mock(),
                mock_config_reader,
            )

            result = provider.get_credentials("test-profile")

            # Should fall back to config_reader when boto3 not available
            assert result is not None
            assert result["aws_access_key_id"] == "KEY"
