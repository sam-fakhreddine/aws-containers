#!/usr/bin/env python3
"""
Unit tests for sso_manager module.

Uses mocks extensively to avoid file system and network dependencies.
"""

import pytest
import json
from unittest.mock import Mock, mock_open, patch, MagicMock
from pathlib import Path
from datetime import datetime, timezone, timedelta

from aws_profile_bridge.sso_manager import (
    SSOTokenCache,
    SSOCredentialsProvider,
    SSOProfileEnricher
)


class TestSSOTokenCache:
    """Test SSOTokenCache class."""

    def test_get_token_returns_none_for_nonexistent_cache_dir(self):
        """Test get_token returns None when cache directory doesn't exist."""
        mock_cache_dir = Mock(spec=Path)
        mock_cache_dir.exists.return_value = False

        cache = SSOTokenCache(mock_cache_dir)
        result = cache.get_token('https://example.com/start')

        assert result is None

    def test_get_token_returns_valid_token_from_hashed_file(self):
        """Test get_token retrieves valid token from hashed cache file."""
        start_url = 'https://example.com/start'
        expires_at = datetime.now(timezone.utc) + timedelta(hours=1)

        token_data = {
            'startUrl': start_url,
            'accessToken': 'test-token',
            'expiresAt': expires_at.isoformat()
        }

        mock_cache_dir = Mock(spec=Path)
        mock_cache_dir.exists.return_value = True

        # Mock the cache file
        cache_file = Mock(spec=Path)
        cache_file.exists.return_value = True
        mock_cache_dir.__truediv__ = Mock(return_value=cache_file)

        cache = SSOTokenCache(mock_cache_dir)

        with patch('builtins.open', mock_open(read_data=json.dumps(token_data))):
            result = cache.get_token(start_url)

        assert result is not None
        assert result['accessToken'] == 'test-token'

    def test_get_token_returns_none_for_expired_token(self):
        """Test get_token returns None for expired tokens."""
        start_url = 'https://example.com/start'
        expires_at = datetime.now(timezone.utc) - timedelta(hours=1)  # Expired

        token_data = {
            'startUrl': start_url,
            'accessToken': 'test-token',
            'expiresAt': expires_at.isoformat()
        }

        mock_cache_dir = Mock(spec=Path)
        mock_cache_dir.exists.return_value = True

        cache_file = Mock(spec=Path)
        cache_file.exists.return_value = True
        cache_file.name = 'test.json'
        mock_cache_dir.__truediv__ = Mock(return_value=cache_file)
        # Mock glob to return the same file (for fallback search)
        mock_cache_dir.glob.return_value = [cache_file]

        cache = SSOTokenCache(mock_cache_dir)

        with patch('builtins.open', mock_open(read_data=json.dumps(token_data))):
            result = cache.get_token(start_url)

        assert result is None

    def test_get_token_uses_memory_cache(self):
        """Test get_token uses memory cache for repeated calls."""
        start_url = 'https://example.com/start'
        expires_at = datetime.now(timezone.utc) + timedelta(hours=1)

        token_data = {
            'startUrl': start_url,
            'accessToken': 'test-token',
            'expiresAt': expires_at.isoformat()
        }

        mock_cache_dir = Mock(spec=Path)
        mock_cache_dir.exists.return_value = True

        cache_file = Mock(spec=Path)
        cache_file.exists.return_value = True
        mock_cache_dir.__truediv__ = Mock(return_value=cache_file)

        cache = SSOTokenCache(mock_cache_dir)

        # First call - loads from file
        with patch('builtins.open', mock_open(read_data=json.dumps(token_data))) as mock_file:
            result1 = cache.get_token(start_url)
            file_open_count = mock_file.call_count

        # Second call - should use memory cache
        with patch('builtins.open', mock_open(read_data=json.dumps(token_data))) as mock_file:
            result2 = cache.get_token(start_url)
            # Should not open file again (memory cache hit)
            assert mock_file.call_count == 0

        assert result1 == result2

    def test_get_token_searches_all_cache_files_as_fallback(self):
        """Test get_token searches all cache files when hash lookup fails."""
        start_url = 'https://example.com/start'
        expires_at = datetime.now(timezone.utc) + timedelta(hours=1)

        token_data = {
            'startUrl': start_url,
            'accessToken': 'test-token',
            'expiresAt': expires_at.isoformat()
        }

        mock_cache_dir = Mock(spec=Path)
        mock_cache_dir.exists.return_value = True

        # Hash lookup fails
        hashed_cache_file = Mock(spec=Path)
        hashed_cache_file.exists.return_value = False
        hashed_cache_file.name = 'hash.json'

        # But we have other cache files
        other_cache_file = Mock(spec=Path)
        other_cache_file.name = 'other.json'
        mock_cache_dir.glob.return_value = [hashed_cache_file, other_cache_file]

        # Setup path division to return the hashed file
        mock_cache_dir.__truediv__ = Mock(return_value=hashed_cache_file)

        cache = SSOTokenCache(mock_cache_dir)

        with patch('builtins.open', mock_open(read_data=json.dumps(token_data))):
            result = cache.get_token(start_url)

        # Should have searched all files
        mock_cache_dir.glob.assert_called_once_with('*.json')

    def test_clear_removes_memory_cache(self):
        """Test clear removes all cached tokens from memory."""
        cache = SSOTokenCache(Mock(spec=Path))

        # Manually add to memory cache
        cache._memory_cache['test'] = ({'token': 'value'}, datetime.now(timezone.utc))

        cache.clear()

        assert len(cache._memory_cache) == 0


class TestSSOCredentialsProvider:
    """Test SSOCredentialsProvider class."""

    def test_get_credentials_returns_none_for_missing_start_url(self):
        """Test get_credentials returns None when start URL is missing."""
        mock_token_cache = Mock(spec=SSOTokenCache)
        provider = SSOCredentialsProvider(mock_token_cache)

        result = provider.get_credentials({'sso_region': 'us-east-1'})

        assert result is None

    def test_get_credentials_returns_none_for_missing_account_id(self):
        """Test get_credentials returns None when account ID is missing."""
        mock_token_cache = Mock(spec=SSOTokenCache)
        provider = SSOCredentialsProvider(mock_token_cache)

        profile_config = {
            'sso_start_url': 'https://example.com/start',
            'sso_role_name': 'Admin'
        }

        result = provider.get_credentials(profile_config)

        assert result is None

    def test_get_credentials_returns_none_for_missing_role_name(self):
        """Test get_credentials returns None when role name is missing."""
        mock_token_cache = Mock(spec=SSOTokenCache)
        provider = SSOCredentialsProvider(mock_token_cache)

        profile_config = {
            'sso_start_url': 'https://example.com/start',
            'sso_account_id': '123456789012'
        }

        result = provider.get_credentials(profile_config)

        assert result is None

    def test_get_credentials_returns_none_when_no_token(self):
        """Test get_credentials returns None when SSO token is not available."""
        mock_token_cache = Mock(spec=SSOTokenCache)
        mock_token_cache.get_token.return_value = None

        provider = SSOCredentialsProvider(mock_token_cache)

        profile_config = {
            'sso_start_url': 'https://example.com/start',
            'sso_region': 'us-east-1',
            'sso_account_id': '123456789012',
            'sso_role_name': 'Admin'
        }

        result = provider.get_credentials(profile_config)

        assert result is None
        mock_token_cache.get_token.assert_called_once_with('https://example.com/start')

    @patch('urllib.request.urlopen')
    def test_get_credentials_fetches_role_credentials(self, mock_urlopen):
        """Test get_credentials successfully fetches role credentials."""
        # Mock SSO token
        mock_token_cache = Mock(spec=SSOTokenCache)
        mock_token_cache.get_token.return_value = {
            'accessToken': 'test-sso-token',
            'expiresAt': (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
        }

        # Mock API response
        api_response = {
            'roleCredentials': {
                'accessKeyId': 'ASIA-ACCESS-KEY',
                'secretAccessKey': 'SECRET-KEY',
                'sessionToken': 'SESSION-TOKEN',
                'expiration': int((datetime.now(timezone.utc) + timedelta(hours=1)).timestamp() * 1000)
            }
        }

        mock_response = MagicMock()
        mock_response.status = 200
        mock_response.read.return_value = json.dumps(api_response).encode()
        mock_response.__enter__.return_value = mock_response
        mock_urlopen.return_value = mock_response

        provider = SSOCredentialsProvider(mock_token_cache)

        profile_config = {
            'sso_start_url': 'https://example.com/start',
            'sso_region': 'us-east-1',
            'sso_account_id': '123456789012',
            'sso_role_name': 'Admin'
        }

        result = provider.get_credentials(profile_config)

        assert result is not None
        assert result['aws_access_key_id'] == 'ASIA-ACCESS-KEY'
        assert result['aws_secret_access_key'] == 'SECRET-KEY'
        assert result['aws_session_token'] == 'SESSION-TOKEN'
        assert 'expiration' in result

    @patch('urllib.request.urlopen')
    def test_get_credentials_returns_none_on_api_error(self, mock_urlopen):
        """Test get_credentials returns None when API call fails."""
        mock_token_cache = Mock(spec=SSOTokenCache)
        mock_token_cache.get_token.return_value = {
            'accessToken': 'test-sso-token',
            'expiresAt': (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
        }

        # Mock API error
        mock_response = MagicMock()
        mock_response.status = 403
        mock_response.__enter__.return_value = mock_response
        mock_urlopen.return_value = mock_response

        provider = SSOCredentialsProvider(mock_token_cache)

        profile_config = {
            'sso_start_url': 'https://example.com/start',
            'sso_region': 'us-east-1',
            'sso_account_id': '123456789012',
            'sso_role_name': 'Admin'
        }

        result = provider.get_credentials(profile_config)

        assert result is None

    @patch('urllib.request.urlopen')
    def test_get_credentials_handles_network_exception(self, mock_urlopen):
        """Test get_credentials handles network exceptions gracefully."""
        mock_token_cache = Mock(spec=SSOTokenCache)
        mock_token_cache.get_token.return_value = {
            'accessToken': 'test-sso-token',
            'expiresAt': (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
        }

        # Mock network error
        mock_urlopen.side_effect = Exception('Network error')

        provider = SSOCredentialsProvider(mock_token_cache)

        profile_config = {
            'sso_start_url': 'https://example.com/start',
            'sso_region': 'us-east-1',
            'sso_account_id': '123456789012',
            'sso_role_name': 'Admin'
        }

        result = provider.get_credentials(profile_config)

        assert result is None


class TestSSOProfileEnricher:
    """Test SSOProfileEnricher class."""

    def test_enrich_profile_returns_unchanged_for_non_sso_profile(self):
        """Test enrich_profile returns unchanged profile for non-SSO profiles."""
        mock_token_cache = Mock(spec=SSOTokenCache)
        enricher = SSOProfileEnricher(mock_token_cache)

        profile = {
            'name': 'test-profile',
            'is_sso': False
        }

        result = enricher.enrich_profile(profile)

        assert result == profile
        mock_token_cache.get_token.assert_not_called()

    def test_enrich_profile_adds_expiration_info_for_valid_token(self):
        """Test enrich_profile adds expiration info when token is valid."""
        expires_at = datetime.now(timezone.utc) + timedelta(hours=1)

        mock_token_cache = Mock(spec=SSOTokenCache)
        mock_token_cache.get_token.return_value = {
            'accessToken': 'test-token',
            'expiresAt': expires_at.isoformat()
        }

        enricher = SSOProfileEnricher(mock_token_cache)

        profile = {
            'name': 'sso-profile',
            'is_sso': True,
            'sso_start_url': 'https://example.com/start'
        }

        result = enricher.enrich_profile(profile)

        assert result['expiration'] == expires_at.isoformat()
        assert result['expired'] is False
        assert result['has_credentials'] is True

    def test_enrich_profile_marks_expired_token(self):
        """Test enrich_profile marks profile as expired when token is expired."""
        expires_at = datetime.now(timezone.utc) - timedelta(hours=1)  # Expired

        mock_token_cache = Mock(spec=SSOTokenCache)
        mock_token_cache.get_token.return_value = {
            'accessToken': 'test-token',
            'expiresAt': expires_at.isoformat()
        }

        enricher = SSOProfileEnricher(mock_token_cache)

        profile = {
            'name': 'sso-profile',
            'is_sso': True,
            'sso_start_url': 'https://example.com/start'
        }

        result = enricher.enrich_profile(profile)

        assert result['expired'] is True
        assert result['has_credentials'] is False

    def test_enrich_profile_marks_no_token_as_expired(self):
        """Test enrich_profile marks profile as expired when no token exists."""
        mock_token_cache = Mock(spec=SSOTokenCache)
        mock_token_cache.get_token.return_value = None

        enricher = SSOProfileEnricher(mock_token_cache)

        profile = {
            'name': 'sso-profile',
            'is_sso': True,
            'sso_start_url': 'https://example.com/start'
        }

        result = enricher.enrich_profile(profile)

        assert result['expired'] is True
        assert result['has_credentials'] is False
