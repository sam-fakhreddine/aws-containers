#!/usr/bin/env python3
"""
Unit tests for file_parsers module.

Uses mocks extensively to avoid file system dependencies.
"""

import pytest
from unittest.mock import Mock, mock_open, patch, MagicMock
from pathlib import Path
from datetime import datetime, timezone

from aws_profile_bridge.core.parsers import (
    FileCache,
    CredentialsFileParser,
    ConfigFileParser,
    ProfileConfigReader,
)


class TestFileCache:
    """Test FileCache class."""

    def test_cache_returns_none_for_nonexistent_file(self):
        """Test cache returns None for files that don't exist."""
        cache = FileCache()
        result = cache.get(Path("/nonexistent/file"))
        assert result is None

    def test_cache_returns_none_for_uncached_file(self):
        """Test cache returns None for files not in cache."""
        cache = FileCache()
        mock_path = Mock(spec=Path)
        mock_path.exists.return_value = True

        result = cache.get(mock_path)
        assert result is None

    def test_cache_stores_and_retrieves_data(self):
        """Test cache can store and retrieve data."""
        cache = FileCache()
        mock_path = Mock(spec=Path)
        mock_path.exists.return_value = True
        mock_stat = Mock()
        mock_stat.st_mtime = 12345.0
        mock_path.stat.return_value = mock_stat

        # Set data
        test_data = [{"name": "test"}]
        cache.set(mock_path, test_data)

        # Get data
        result = cache.get(mock_path)
        assert result == test_data

    def test_cache_invalidates_on_mtime_change(self):
        """Test cache invalidates when file modification time changes."""
        cache = FileCache()
        mock_path = Mock(spec=Path)
        mock_path.exists.return_value = True

        # First mtime
        mock_stat1 = Mock()
        mock_stat1.st_mtime = 12345.0
        mock_path.stat.return_value = mock_stat1

        test_data = [{"name": "test"}]
        cache.set(mock_path, test_data)

        # Change mtime
        mock_stat2 = Mock()
        mock_stat2.st_mtime = 67890.0
        mock_path.stat.return_value = mock_stat2

        # Should return None (cache invalidated)
        result = cache.get(mock_path)
        assert result is None

    def test_cache_clear(self):
        """Test cache clear removes all entries."""
        cache = FileCache()
        mock_path = Mock(spec=Path)
        mock_path.exists.return_value = True
        mock_stat = Mock()
        mock_stat.st_mtime = 12345.0
        mock_path.stat.return_value = mock_stat

        cache.set(mock_path, [{"name": "test"}])
        cache.clear()

        result = cache.get(mock_path)
        assert result is None


class TestCredentialsFileParser:
    """Test CredentialsFileParser class."""

    def test_parser_returns_empty_list_for_nonexistent_file(self):
        """Test parser returns empty list when file doesn't exist."""
        mock_path = Mock(spec=Path)
        mock_path.exists.return_value = False

        parser = CredentialsFileParser(mock_path)
        result = parser.parse()

        assert result == []

    def test_parser_parses_simple_profile(self):
        """Test parser correctly parses a simple profile."""
        credentials_content = """[default]
aws_access_key_id = AKIAIOSFODNN7EXAMPLE
aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
"""
        mock_path = Mock(spec=Path)
        mock_path.exists.return_value = True
        mock_stat = Mock()
        mock_stat.st_mtime = 12345.0
        mock_path.stat.return_value = mock_stat

        parser = CredentialsFileParser(mock_path)

        with patch("builtins.open", mock_open(read_data=credentials_content)):
            result = parser.parse()

        assert len(result) == 1
        assert result[0]["name"] == "default"
        assert result[0]["has_credentials"] is True
        assert result[0]["expired"] is False

    def test_parser_parses_multiple_profiles(self):
        """Test parser correctly parses multiple profiles."""
        credentials_content = """[profile1]
aws_access_key_id = KEY1
aws_secret_access_key = SECRET1

[profile2]
aws_access_key_id = KEY2
aws_secret_access_key = SECRET2
"""
        mock_path = Mock(spec=Path)
        mock_path.exists.return_value = True
        mock_stat = Mock()
        mock_stat.st_mtime = 12345.0
        mock_path.stat.return_value = mock_stat

        parser = CredentialsFileParser(mock_path)

        with patch("builtins.open", mock_open(read_data=credentials_content)):
            result = parser.parse()

        assert len(result) == 2
        assert result[0]["name"] == "profile1"
        assert result[1]["name"] == "profile2"
        assert all(p["has_credentials"] for p in result)

    def test_parser_parses_expiration_comment(self):
        """Test parser correctly parses expiration comments."""
        credentials_content = """[temp-profile]
# Expires 2024-12-31 23:59:59 UTC
aws_access_key_id = KEY
aws_secret_access_key = SECRET
aws_session_token = TOKEN
"""
        mock_path = Mock(spec=Path)
        mock_path.exists.return_value = True
        mock_stat = Mock()
        mock_stat.st_mtime = 12345.0
        mock_path.stat.return_value = mock_stat

        parser = CredentialsFileParser(mock_path)

        with patch("builtins.open", mock_open(read_data=credentials_content)):
            result = parser.parse()

        assert len(result) == 1
        assert result[0]["expiration"] is not None
        assert "2024-12-31" in result[0]["expiration"]

    def test_parser_uses_cache(self):
        """Test parser uses cache for repeated calls."""
        credentials_content = """[default]
aws_access_key_id = KEY
aws_secret_access_key = SECRET
"""
        mock_path = Mock(spec=Path)
        mock_path.exists.return_value = True
        mock_stat = Mock()
        mock_stat.st_mtime = 12345.0
        mock_path.stat.return_value = mock_stat

        mock_cache = Mock(spec=FileCache)
        mock_cache.get.return_value = None  # First call

        parser = CredentialsFileParser(mock_path, mock_cache)

        with patch("builtins.open", mock_open(read_data=credentials_content)):
            result1 = parser.parse()

        # Verify cache was used
        mock_cache.get.assert_called_once()
        mock_cache.set.assert_called_once()

        # Second call should use cache
        mock_cache.get.return_value = result1
        result2 = parser.parse()

        assert result1 == result2
        assert mock_cache.get.call_count == 2

    def test_parser_handles_profile_without_credentials(self):
        """Test parser handles profile sections without actual credentials."""
        credentials_content = """[empty-profile]
region = us-east-1
"""
        mock_path = Mock(spec=Path)
        mock_path.exists.return_value = True
        mock_stat = Mock()
        mock_stat.st_mtime = 12345.0
        mock_path.stat.return_value = mock_stat

        parser = CredentialsFileParser(mock_path)

        with patch("builtins.open", mock_open(read_data=credentials_content)):
            result = parser.parse()

        assert len(result) == 1
        assert result[0]["has_credentials"] is False


class TestConfigFileParser:
    """Test ConfigFileParser class."""

    def test_parser_returns_empty_list_for_nonexistent_file(self):
        """Test parser returns empty list when file doesn't exist."""
        mock_path = Mock(spec=Path)
        mock_path.exists.return_value = False

        parser = ConfigFileParser(mock_path)
        result = parser.parse()

        assert result == []

    def test_parser_parses_sso_profile(self):
        """Test parser correctly parses SSO profile."""
        config_content = """[profile sso-dev]
sso_start_url = https://my-sso-portal.awsapps.com/start
sso_region = us-east-1
sso_account_id = 123456789012
sso_role_name = DeveloperAccess
region = us-west-2
"""
        mock_path = Mock(spec=Path)
        mock_path.exists.return_value = True
        mock_stat = Mock()
        mock_stat.st_mtime = 12345.0
        mock_path.stat.return_value = mock_stat

        parser = ConfigFileParser(mock_path)

        with patch("builtins.open", mock_open(read_data=config_content)):
            result = parser.parse()

        assert len(result) == 1
        profile = result[0]
        assert profile["name"] == "sso-dev"
        assert profile["is_sso"] is True
        assert profile["sso_start_url"] == "https://my-sso-portal.awsapps.com/start"
        assert profile["sso_region"] == "us-east-1"
        assert profile["sso_account_id"] == "123456789012"
        assert profile["sso_role_name"] == "DeveloperAccess"
        assert profile["aws_region"] == "us-west-2"

    def test_parser_strips_profile_prefix(self):
        """Test parser strips 'profile ' prefix from section names."""
        config_content = """[profile my-profile]
sso_start_url = https://example.com/start
sso_region = us-east-1
sso_account_id = 123456789012
sso_role_name = Admin
"""
        mock_path = Mock(spec=Path)
        mock_path.exists.return_value = True
        mock_stat = Mock()
        mock_stat.st_mtime = 12345.0
        mock_path.stat.return_value = mock_stat

        parser = ConfigFileParser(mock_path)

        with patch("builtins.open", mock_open(read_data=config_content)):
            result = parser.parse()

        assert result[0]["name"] == "my-profile"

    def test_parser_ignores_non_sso_profiles(self):
        """Test parser only returns SSO profiles."""
        config_content = """[profile regular]
region = us-east-1

[profile sso-profile]
sso_start_url = https://example.com/start
sso_region = us-east-1
sso_account_id = 123456789012
sso_role_name = Admin
"""
        mock_path = Mock(spec=Path)
        mock_path.exists.return_value = True
        mock_stat = Mock()
        mock_stat.st_mtime = 12345.0
        mock_path.stat.return_value = mock_stat

        parser = ConfigFileParser(mock_path)

        with patch("builtins.open", mock_open(read_data=config_content)):
            result = parser.parse()

        # Should only return SSO profile
        assert len(result) == 1
        assert result[0]["name"] == "sso-profile"


class TestProfileConfigReader:
    """Test ProfileConfigReader class."""

    def test_get_credentials_returns_none_for_nonexistent_file(self):
        """Test get_credentials returns None when file doesn't exist."""
        mock_cred_path = Mock(spec=Path)
        mock_cred_path.exists.return_value = False
        mock_config_path = Mock(spec=Path)

        reader = ProfileConfigReader(mock_cred_path, mock_config_path)
        result = reader.get_credentials("test-profile")

        assert result is None

    def test_get_credentials_extracts_profile_credentials(self):
        """Test get_credentials correctly extracts credentials."""
        credentials_content = """[default]
aws_access_key_id = KEY1
aws_secret_access_key = SECRET1

[test-profile]
aws_access_key_id = KEY2
aws_secret_access_key = SECRET2
aws_session_token = TOKEN2

[another-profile]
aws_access_key_id = KEY3
aws_secret_access_key = SECRET3
"""
        mock_cred_path = Mock(spec=Path)
        mock_cred_path.exists.return_value = True
        mock_config_path = Mock(spec=Path)

        reader = ProfileConfigReader(mock_cred_path, mock_config_path)

        with patch("builtins.open", mock_open(read_data=credentials_content)):
            result = reader.get_credentials("test-profile")

        assert result is not None
        assert result["aws_access_key_id"] == "KEY2"
        assert result["aws_secret_access_key"] == "SECRET2"
        assert result["aws_session_token"] == "TOKEN2"

    def test_get_credentials_returns_none_for_missing_profile(self):
        """Test get_credentials returns None for missing profile."""
        credentials_content = """[default]
aws_access_key_id = KEY
aws_secret_access_key = SECRET
"""
        mock_cred_path = Mock(spec=Path)
        mock_cred_path.exists.return_value = True
        mock_config_path = Mock(spec=Path)

        reader = ProfileConfigReader(mock_cred_path, mock_config_path)

        with patch("builtins.open", mock_open(read_data=credentials_content)):
            result = reader.get_credentials("nonexistent")

        assert result is None

    def test_get_config_extracts_profile_config(self):
        """Test get_config correctly extracts configuration."""
        config_content = """[profile test-profile]
region = us-west-2
output = json
sso_start_url = https://example.com/start
sso_region = us-east-1
sso_account_id = 123456789012
sso_role_name = Admin
"""
        mock_cred_path = Mock(spec=Path)
        mock_config_path = Mock(spec=Path)
        mock_config_path.exists.return_value = True

        reader = ProfileConfigReader(mock_cred_path, mock_config_path)

        with patch("builtins.open", mock_open(read_data=config_content)):
            result = reader.get_config("test-profile")

        assert result is not None
        assert result["region"] == "us-west-2"
        assert result["output"] == "json"
        assert result["sso_start_url"] == "https://example.com/start"
        assert result["sso_account_id"] == "123456789012"

    def test_get_config_returns_none_for_nonexistent_file(self):
        """Test get_config returns None when file doesn't exist."""
        mock_cred_path = Mock(spec=Path)
        mock_config_path = Mock(spec=Path)
        mock_config_path.exists.return_value = False

        reader = ProfileConfigReader(mock_cred_path, mock_config_path)
        result = reader.get_config("test-profile")

        assert result is None
