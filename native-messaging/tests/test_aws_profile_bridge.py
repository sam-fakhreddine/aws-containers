#!/usr/bin/env python3
"""
Unit tests for aws_profile_bridge module.

Tests the main application orchestration.
"""

import pytest
from unittest.mock import Mock, patch

from aws_profile_bridge.aws_profile_bridge import (
    AWSProfileBridgeHandler,
    AWSProfileBridge
)


class TestAWSProfileBridgeHandler:
    """Test AWSProfileBridgeHandler class."""

    def test_handle_message_dispatches_get_profiles(self):
        """Test handle_message dispatches to getProfiles handler."""
        mock_aggregator = Mock()
        mock_aggregator.get_all_profiles.return_value = [
            {'name': 'test', 'is_sso': False}
        ]

        mock_url_generator = Mock()

        mock_metadata = Mock()
        mock_metadata.enrich_profile.return_value = {
            'name': 'test',
            'is_sso': False,
            'color': 'blue',
            'icon': 'circle'
        }

        handler = AWSProfileBridgeHandler(
            mock_aggregator,
            mock_url_generator,
            mock_metadata
        )

        message = {'action': 'getProfiles'}
        result = handler.handle_message(message)

        assert result['action'] == 'profileList'
        assert 'profiles' in result
        mock_aggregator.get_all_profiles.assert_called_once()

    def test_handle_message_dispatches_open_profile(self):
        """Test handle_message dispatches to openProfile handler."""
        mock_aggregator = Mock()

        mock_url_generator = Mock()
        mock_url_generator.generate_url.return_value = {
            'url': 'https://console.aws.amazon.com/'
        }

        mock_metadata = Mock()
        mock_metadata.get_color.return_value = 'blue'
        mock_metadata.get_icon.return_value = 'circle'

        handler = AWSProfileBridgeHandler(
            mock_aggregator,
            mock_url_generator,
            mock_metadata
        )

        message = {'action': 'openProfile', 'profileName': 'test-profile'}
        result = handler.handle_message(message)

        assert result['action'] == 'consoleUrl'
        assert result['profileName'] == 'test-profile'
        assert 'url' in result
        mock_url_generator.generate_url.assert_called_once_with('test-profile')

    def test_handle_message_returns_error_for_unknown_action(self):
        """Test handle_message returns error for unknown actions."""
        handler = AWSProfileBridgeHandler(Mock(), Mock(), Mock())

        message = {'action': 'unknownAction'}
        result = handler.handle_message(message)

        assert result['action'] == 'error'
        assert 'Unknown action' in result['message']

    def test_get_profiles_enriches_with_metadata(self):
        """Test getProfiles adds color and icon metadata."""
        mock_aggregator = Mock()
        mock_aggregator.get_all_profiles.return_value = [
            {'name': 'prod-profile', 'is_sso': False},
            {'name': 'dev-profile', 'is_sso': True}
        ]

        mock_metadata = Mock()
        mock_metadata.enrich_profile.side_effect = [
            {'name': 'prod-profile', 'is_sso': False, 'color': 'red', 'icon': 'briefcase'},
            {'name': 'dev-profile', 'is_sso': True, 'color': 'green', 'icon': 'fingerprint'}
        ]

        handler = AWSProfileBridgeHandler(
            mock_aggregator,
            Mock(),
            mock_metadata
        )

        result = handler.handle_message({'action': 'getProfiles'})

        assert len(result['profiles']) == 2
        assert mock_metadata.enrich_profile.call_count == 2

    def test_get_profiles_cleans_sso_fields_for_non_sso_profiles(self):
        """Test getProfiles removes SSO fields from non-SSO profiles."""
        mock_aggregator = Mock()
        mock_aggregator.get_all_profiles.return_value = [
            {
                'name': 'regular-profile',
                'is_sso': False,
                'sso_start_url': 'https://should-be-removed.com',
                'sso_region': 'us-east-1'
            }
        ]

        mock_metadata = Mock()
        mock_metadata.enrich_profile.side_effect = lambda p: p

        handler = AWSProfileBridgeHandler(
            mock_aggregator,
            Mock(),
            mock_metadata
        )

        result = handler.handle_message({'action': 'getProfiles'})

        profile = result['profiles'][0]
        assert 'sso_start_url' not in profile
        assert 'sso_region' not in profile

    def test_open_profile_returns_error_when_missing_profile_name(self):
        """Test openProfile returns error when profileName is missing."""
        handler = AWSProfileBridgeHandler(Mock(), Mock(), Mock())

        message = {'action': 'openProfile'}  # No profileName
        result = handler.handle_message(message)

        assert result['action'] == 'error'
        assert 'Missing profileName' in result['message']

    def test_open_profile_returns_error_when_url_generation_fails(self):
        """Test openProfile returns error when URL generation fails."""
        mock_url_generator = Mock()
        mock_url_generator.generate_url.return_value = {
            'error': 'No credentials found'
        }

        handler = AWSProfileBridgeHandler(
            Mock(),
            mock_url_generator,
            Mock()
        )

        message = {'action': 'openProfile', 'profileName': 'test'}
        result = handler.handle_message(message)

        assert result['action'] == 'error'
        assert 'No credentials found' in result['message']

    def test_open_profile_includes_metadata_in_response(self):
        """Test openProfile includes color and icon in response."""
        mock_url_generator = Mock()
        mock_url_generator.generate_url.return_value = {
            'url': 'https://console.aws.amazon.com/'
        }

        mock_metadata = Mock()
        mock_metadata.get_color.return_value = 'red'
        mock_metadata.get_icon.return_value = 'briefcase'

        handler = AWSProfileBridgeHandler(
            Mock(),
            mock_url_generator,
            mock_metadata
        )

        message = {'action': 'openProfile', 'profileName': 'prod-account'}
        result = handler.handle_message(message)

        assert result['color'] == 'red'
        assert result['icon'] == 'briefcase'
        mock_metadata.get_color.assert_called_once_with('prod-account')
        mock_metadata.get_icon.assert_called_once_with('prod-account')


class TestAWSProfileBridge:
    """Test AWSProfileBridge main class."""

    def test_init_creates_all_components(self):
        """Test __init__ creates all required components."""
        bridge = AWSProfileBridge()

        assert bridge.credentials_file is not None
        assert bridge.config_file is not None
        assert bridge.sso_cache_dir is not None
        assert bridge.host is not None

    def test_init_uses_correct_aws_paths(self):
        """Test __init__ uses correct AWS configuration paths."""
        bridge = AWSProfileBridge()

        assert str(bridge.credentials_file).endswith('.aws/credentials')
        assert str(bridge.config_file).endswith('.aws/config')
        assert str(bridge.sso_cache_dir).endswith('.aws/sso/cache')

    def test_run_delegates_to_host(self):
        """Test run method delegates to native messaging host."""
        bridge = AWSProfileBridge()

        # Mock the host
        bridge.host = Mock()

        bridge.run()

        bridge.host.run.assert_called_once()

    @patch('aws_profile_bridge.aws_profile_bridge.NativeMessagingHost')
    def test_dependency_injection_pattern(self, mock_host_class):
        """Test that bridge uses dependency injection pattern."""
        # This tests that all components are created and injected properly
        bridge = AWSProfileBridge()

        # Verify that NativeMessagingHost was created with dependencies
        mock_host_class.assert_called_once()

        # Verify it received reader, writer, and handler
        call_args = mock_host_class.call_args[0]
        assert len(call_args) == 3  # reader, writer, handler
