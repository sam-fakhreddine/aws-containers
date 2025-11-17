#!/usr/bin/env python3
"""
Unit tests for bridge module.

Tests the main application orchestration for API-based architecture.
"""

import pytest
from unittest.mock import Mock, patch

from aws_profile_bridge.core.bridge import (
    AWSProfileBridgeHandler,
    AWSProfileBridge,
)


class TestAWSProfileBridgeHandler:
    """Test AWSProfileBridgeHandler class."""

    def test_handle_message_dispatches_get_profiles(self):
        """Test handle_message dispatches to getProfiles handler."""
        mock_aggregator = Mock()
        mock_aggregator.get_all_profiles.return_value = [
            {"name": "test", "is_sso": False}
        ]

        mock_url_generator = Mock()

        mock_metadata = Mock()
        mock_metadata.enrich_profile.return_value = {
            "name": "test",
            "is_sso": False,
            "color": "blue",
            "icon": "circle",
        }

        handler = AWSProfileBridgeHandler(
            mock_aggregator, mock_url_generator, mock_metadata
        )

        message = {"action": "getProfiles"}
        result = handler.handle_message(message)

        assert result["action"] == "profileList"
        assert "profiles" in result
        mock_aggregator.get_all_profiles.assert_called_once()

    def test_handle_message_dispatches_open_profile(self):
        """Test handle_message dispatches to openProfile handler."""
        mock_aggregator = Mock()

        mock_url_generator = Mock()
        mock_url_generator.generate_url.return_value = {
            "url": "https://console.aws.amazon.com/"
        }

        mock_metadata = Mock()
        mock_metadata.get_color.return_value = "blue"
        mock_metadata.get_icon.return_value = "circle"

        handler = AWSProfileBridgeHandler(
            mock_aggregator, mock_url_generator, mock_metadata
        )

        message = {"action": "openProfile", "profileName": "test-profile"}
        result = handler.handle_message(message)

        assert result["action"] == "consoleUrl"
        assert result["profileName"] == "test-profile"
        assert "url" in result
        mock_url_generator.generate_url.assert_called_once_with("test-profile")

    def test_handle_message_returns_error_for_unknown_action(self):
        """Test handle_message returns error for unknown actions."""
        handler = AWSProfileBridgeHandler(Mock(), Mock(), Mock())

        message = {"action": "unknownAction"}
        result = handler.handle_message(message)

        assert result["action"] == "error"
        assert "Unknown action" in result["message"]

    def test_get_profiles_enriches_with_metadata(self):
        """Test getProfiles adds color and icon metadata."""
        mock_aggregator = Mock()
        mock_aggregator.get_all_profiles.return_value = [
            {"name": "prod-profile", "is_sso": False},
            {"name": "dev-profile", "is_sso": True},
        ]

        mock_metadata = Mock()
        mock_metadata.enrich_profile.side_effect = [
            {
                "name": "prod-profile",
                "is_sso": False,
                "color": "red",
                "icon": "briefcase",
            },
            {
                "name": "dev-profile",
                "is_sso": True,
                "color": "green",
                "icon": "fingerprint",
            },
        ]

        handler = AWSProfileBridgeHandler(mock_aggregator, Mock(), mock_metadata)

        result = handler.handle_message({"action": "getProfiles"})

        assert len(result["profiles"]) == 2
        assert mock_metadata.enrich_profile.call_count == 2

    def test_get_profiles_cleans_sso_fields_for_non_sso_profiles(self):
        """Test getProfiles removes SSO fields from non-SSO profiles."""
        mock_aggregator = Mock()
        mock_aggregator.get_all_profiles.return_value = [
            {
                "name": "regular-profile",
                "is_sso": False,
                "sso_start_url": "https://should-be-removed.com",
                "sso_region": "us-east-1",
            }
        ]

        mock_metadata = Mock()
        mock_metadata.enrich_profile.side_effect = lambda p: p

        handler = AWSProfileBridgeHandler(mock_aggregator, Mock(), mock_metadata)

        result = handler.handle_message({"action": "getProfiles"})

        profile = result["profiles"][0]
        assert "sso_start_url" not in profile
        assert "sso_region" not in profile

    def test_open_profile_returns_error_when_missing_profile_name(self):
        """Test openProfile returns error when profileName is missing."""
        handler = AWSProfileBridgeHandler(Mock(), Mock(), Mock())

        message = {"action": "openProfile"}  # No profileName
        result = handler.handle_message(message)

        assert result["action"] == "error"
        assert "Missing profileName" in result["message"]

    def test_open_profile_returns_error_when_url_generation_fails(self):
        """Test openProfile returns error when URL generation fails."""
        mock_url_generator = Mock()
        mock_url_generator.generate_url.return_value = {"error": "No credentials found"}

        handler = AWSProfileBridgeHandler(Mock(), mock_url_generator, Mock())

        message = {"action": "openProfile", "profileName": "test"}
        result = handler.handle_message(message)

        assert result["action"] == "error"
        assert "No credentials found" in result["message"]

    def test_open_profile_includes_metadata_in_response(self):
        """Test openProfile includes color and icon in response."""
        mock_url_generator = Mock()
        mock_url_generator.generate_url.return_value = {
            "url": "https://console.aws.amazon.com/"
        }

        mock_metadata = Mock()
        mock_metadata.get_color.return_value = "red"
        mock_metadata.get_icon.return_value = "briefcase"

        handler = AWSProfileBridgeHandler(Mock(), mock_url_generator, mock_metadata)

        message = {"action": "openProfile", "profileName": "prod-account"}
        result = handler.handle_message(message)

        assert result["color"] == "red"
        assert result["icon"] == "briefcase"
        mock_metadata.get_color.assert_called_once_with("prod-account")
        mock_metadata.get_icon.assert_called_once_with("prod-account")


class TestAWSProfileBridge:
    """Test AWSProfileBridge main class."""

    def test_init_creates_all_components(self):
        """Test __init__ creates all required components."""
        bridge = AWSProfileBridge()

        assert bridge.credentials_file is not None
        assert bridge.config_file is not None
        assert bridge.sso_cache_dir is not None
        assert bridge.message_handler is not None
        assert bridge.aws_dir is not None

    def test_init_uses_correct_aws_paths(self):
        """Test __init__ uses correct AWS configuration paths."""
        bridge = AWSProfileBridge()

        assert str(bridge.credentials_file).endswith(".aws/credentials")
        assert str(bridge.config_file).endswith(".aws/config")
        assert str(bridge.sso_cache_dir).endswith(".aws/sso/cache")

    def test_handle_message_delegates_to_handler(self):
        """Test handle_message delegates to message handler."""
        bridge = AWSProfileBridge()
        bridge.message_handler = Mock()
        bridge.message_handler.handle_message.return_value = {"action": "profileList"}

        message = {"action": "getProfiles"}
        result = bridge.handle_message(message)

        assert result["action"] == "profileList"
        bridge.message_handler.handle_message.assert_called_once_with(message)


class TestAWSProfileBridgeHandlerEnrichSSO:
    """Test SSO enrichment functionality."""

    def test_enrich_sso_profiles_all_profiles(self):
        """Test enriching all SSO profiles when no specific profiles requested."""
        mock_aggregator = Mock()
        mock_aggregator.get_all_profiles.return_value = [
            {"name": "sso-profile", "is_sso": True},
            {"name": "cred-profile", "is_sso": False},
        ]

        mock_metadata = Mock()
        mock_metadata.enrich_profile.side_effect = lambda p: p

        handler = AWSProfileBridgeHandler(mock_aggregator, Mock(), mock_metadata)

        result = handler._handle_enrich_sso_profiles({})

        assert result["action"] == "profileList"
        assert len(result["profiles"]) == 2
        mock_aggregator.get_all_profiles.assert_called_once_with(
            skip_sso_enrichment=False
        )

    def test_enrich_sso_profiles_specific_profiles(self):
        """Test enriching specific SSO profiles."""
        mock_aggregator = Mock()
        mock_aggregator.get_all_profiles.return_value = [
            {"name": "sso-profile", "is_sso": True},
            {"name": "cred-profile", "is_sso": False},
        ]
        mock_aggregator._build_profile_info.return_value = {
            "name": "sso-profile",
            "is_sso": True,
            "has_credentials": True,
        }

        mock_metadata = Mock()
        mock_metadata.enrich_profile.side_effect = lambda p: p

        handler = AWSProfileBridgeHandler(mock_aggregator, Mock(), mock_metadata)

        result = handler._handle_enrich_sso_profiles({"profileNames": ["sso-profile"]})

        assert result["action"] == "profileList"
        assert len(result["profiles"]) == 2

    def test_enrich_sso_profiles_skips_non_sso(self):
        """Test enriching specific profiles skips non-SSO profiles."""
        mock_aggregator = Mock()
        mock_aggregator.get_all_profiles.return_value = [
            {"name": "sso-profile", "is_sso": True},
            {"name": "cred-profile", "is_sso": False},
        ]
        mock_aggregator._build_profile_info.return_value = {
            "name": "sso-profile",
            "is_sso": True,
            "has_credentials": True,
        }

        mock_metadata = Mock()
        mock_metadata.enrich_profile.side_effect = lambda p: p

        handler = AWSProfileBridgeHandler(mock_aggregator, Mock(), mock_metadata)

        # Request enrichment for credential profile (should be skipped)
        result = handler._handle_enrich_sso_profiles({"profileNames": ["cred-profile"]})

        assert result["action"] == "profileList"
        # Should not call _build_profile_info for non-SSO profile
        mock_aggregator._build_profile_info.assert_not_called()

    def test_enrich_sso_profiles_handles_none_result(self):
        """Test enriching handles None result from build_profile_info."""
        mock_aggregator = Mock()
        mock_aggregator.get_all_profiles.return_value = [
            {"name": "sso-profile", "is_sso": True}
        ]
        mock_aggregator._build_profile_info.return_value = None

        mock_metadata = Mock()
        mock_metadata.enrich_profile.side_effect = lambda p: p

        handler = AWSProfileBridgeHandler(mock_aggregator, Mock(), mock_metadata)

        result = handler._handle_enrich_sso_profiles({"profileNames": ["sso-profile"]})

        assert result["action"] == "profileList"
        # Should not include the None result
        assert len(result["profiles"]) == 0


class TestAWSProfileBridgeMain:
    """Test main entry point."""

    @patch("aws_profile_bridge.app.start_server")
    def test_main_calls_start_server(self, mock_start_server):
        """Test main function calls start_server."""
        from aws_profile_bridge.core.bridge import main

        main()

        mock_start_server.assert_called_once()
