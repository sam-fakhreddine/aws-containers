"""Tests for ConsoleURLCache."""

import time
from datetime import datetime, timedelta

import pytest

from aws_profile_bridge.core.url_cache import ConsoleURLCache


class TestConsoleURLCacheInit:
    """Test ConsoleURLCache initialization."""

    def test_init_default_ttl(self):
        """Test initialization with default TTL."""
        cache = ConsoleURLCache()
        assert cache.default_ttl == 43200  # 12 hours

    def test_init_custom_ttl(self):
        """Test initialization with custom TTL."""
        cache = ConsoleURLCache(default_ttl=3600)
        assert cache.default_ttl == 3600


class TestConsoleURLCacheSetGet:
    """Test caching and retrieval."""

    def test_set_and_get_url(self):
        """Test setting and getting a cached URL."""
        cache = ConsoleURLCache()
        profile_name = "test-profile"
        url = "https://console.aws.amazon.com/test"

        cache.set(profile_name, url)
        result = cache.get(profile_name)

        assert result == url

    def test_get_nonexistent_profile(self):
        """Test getting URL for profile that doesn't exist."""
        cache = ConsoleURLCache()
        result = cache.get("nonexistent-profile")
        assert result is None

    def test_set_with_credential_expiry(self):
        """Test caching URL with credential expiry."""
        cache = ConsoleURLCache()
        profile_name = "test-profile"
        url = "https://console.aws.amazon.com/test"
        expiry = datetime.now() + timedelta(hours=1)

        cache.set(profile_name, url, credential_expiry=expiry)
        result = cache.get(profile_name, current_expiry=expiry)

        assert result == url

    def test_set_without_credential_expiry_uses_default_ttl(self):
        """Test that setting without credential expiry uses default TTL."""
        cache = ConsoleURLCache(default_ttl=100)
        profile_name = "test-profile"
        url = "https://console.aws.amazon.com/test"

        cache.set(profile_name, url)

        # Should be cached
        assert cache.get(profile_name) == url

    def test_upsert_replaces_existing_entry(self):
        """Test that setting a URL twice upserts (replaces) the entry."""
        cache = ConsoleURLCache()
        profile_name = "test-profile"
        url1 = "https://console.aws.amazon.com/test1"
        url2 = "https://console.aws.amazon.com/test2"

        cache.set(profile_name, url1)
        cache.set(profile_name, url2)

        result = cache.get(profile_name)
        assert result == url2

        # Verify only one entry exists
        stats = cache.get_stats()
        assert stats["total"] == 1


class TestConsoleURLCacheExpiration:
    """Test URL expiration logic."""

    def test_get_expired_url_returns_none(self):
        """Test that expired URLs return None and are removed."""
        cache = ConsoleURLCache(default_ttl=0)  # Expire immediately
        profile_name = "test-profile"
        url = "https://console.aws.amazon.com/test"

        cache.set(profile_name, url)
        time.sleep(0.1)  # Wait for expiration

        result = cache.get(profile_name)
        assert result is None

        # Verify it was removed
        stats = cache.get_stats()
        assert stats["total"] == 0

    def test_get_with_changed_credentials_returns_none(self):
        """Test that URL is invalidated when credentials change."""
        cache = ConsoleURLCache()
        profile_name = "test-profile"
        url = "https://console.aws.amazon.com/test"
        expiry1 = datetime.now() + timedelta(hours=1)
        expiry2 = datetime.now() + timedelta(hours=2)

        # Cache with first expiry
        cache.set(profile_name, url, credential_expiry=expiry1)

        # Get with different expiry - should invalidate
        result = cache.get(profile_name, current_expiry=expiry2)
        assert result is None

        # Verify it was removed
        stats = cache.get_stats()
        assert stats["total"] == 0

    def test_get_with_same_credentials_returns_url(self):
        """Test that URL is returned when credentials haven't changed."""
        cache = ConsoleURLCache()
        profile_name = "test-profile"
        url = "https://console.aws.amazon.com/test"
        expiry = datetime.now() + timedelta(hours=1)

        cache.set(profile_name, url, credential_expiry=expiry)
        result = cache.get(profile_name, current_expiry=expiry)

        assert result == url

    def test_get_without_current_expiry_skips_credential_check(self):
        """Test that not providing current_expiry skips credential change detection."""
        cache = ConsoleURLCache()
        profile_name = "test-profile"
        url = "https://console.aws.amazon.com/test"
        expiry = datetime.now() + timedelta(hours=1)

        cache.set(profile_name, url, credential_expiry=expiry)

        # Get without providing current_expiry - should still return URL
        result = cache.get(profile_name)
        assert result == url


class TestConsoleURLCacheInvalidation:
    """Test cache invalidation."""

    def test_invalidate_removes_entry(self):
        """Test that invalidate removes the cached entry."""
        cache = ConsoleURLCache()
        profile_name = "test-profile"
        url = "https://console.aws.amazon.com/test"

        cache.set(profile_name, url)
        cache.invalidate(profile_name)

        result = cache.get(profile_name)
        assert result is None

    def test_invalidate_nonexistent_profile(self):
        """Test that invalidating nonexistent profile doesn't error."""
        cache = ConsoleURLCache()
        cache.invalidate("nonexistent-profile")  # Should not raise

    def test_clear_removes_all_entries(self):
        """Test that clear removes all cached entries."""
        cache = ConsoleURLCache()

        cache.set("profile1", "https://console.aws.amazon.com/test1")
        cache.set("profile2", "https://console.aws.amazon.com/test2")
        cache.set("profile3", "https://console.aws.amazon.com/test3")

        stats = cache.get_stats()
        assert stats["total"] == 3

        cache.clear()

        stats = cache.get_stats()
        assert stats["total"] == 0
        assert cache.get("profile1") is None
        assert cache.get("profile2") is None
        assert cache.get("profile3") is None


class TestConsoleURLCacheStats:
    """Test cache statistics."""

    def test_get_stats_empty_cache(self):
        """Test stats for empty cache."""
        cache = ConsoleURLCache()
        stats = cache.get_stats()

        assert stats["total"] == 0
        assert stats["valid"] == 0
        assert stats["expired"] == 0

    def test_get_stats_with_valid_entries(self):
        """Test stats with valid entries."""
        cache = ConsoleURLCache(default_ttl=3600)

        cache.set("profile1", "https://console.aws.amazon.com/test1")
        cache.set("profile2", "https://console.aws.amazon.com/test2")

        stats = cache.get_stats()
        assert stats["total"] == 2
        assert stats["valid"] == 2
        assert stats["expired"] == 0

    def test_get_stats_with_expired_entries(self):
        """Test stats with expired entries."""
        cache = ConsoleURLCache(default_ttl=0)

        cache.set("profile1", "https://console.aws.amazon.com/test1")
        cache.set("profile2", "https://console.aws.amazon.com/test2")

        time.sleep(0.1)  # Wait for expiration

        stats = cache.get_stats()
        assert stats["total"] == 2
        assert stats["valid"] == 0
        assert stats["expired"] == 2

    def test_get_stats_with_mixed_entries(self):
        """Test stats with mix of valid and expired entries."""
        cache = ConsoleURLCache()

        # Add valid entry (12 hours from now)
        cache.set("profile1", "https://console.aws.amazon.com/test1")

        # Add expired entry (in the past)
        past_expiry = datetime.now() - timedelta(hours=1)
        cache.set("profile2", "https://console.aws.amazon.com/test2", credential_expiry=past_expiry)

        stats = cache.get_stats()
        assert stats["total"] == 2
        assert stats["valid"] == 1
        assert stats["expired"] == 1
