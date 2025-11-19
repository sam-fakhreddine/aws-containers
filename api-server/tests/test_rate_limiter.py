"""Tests for RateLimiter."""

import time

import pytest

from aws_profile_bridge.auth.rate_limiter import RateLimiter


class TestRateLimiterInit:
    """Test RateLimiter initialization."""

    def test_init_with_parameters(self):
        """Test initialization with max attempts and window."""
        limiter = RateLimiter(max_attempts=5, window_seconds=60)
        assert limiter.max_attempts == 5
        assert limiter.window_seconds == 60

    def test_init_creates_empty_attempts_dict(self):
        """Test that initialization creates empty attempts dict."""
        limiter = RateLimiter(max_attempts=3, window_seconds=60)
        assert limiter._attempts == {}


class TestRateLimiterTokenHashing:
    """Test token hashing."""

    def test_hash_token_returns_consistent_hash(self):
        """Test that same token returns same hash."""
        limiter = RateLimiter(max_attempts=3, window_seconds=60)

        hash1 = limiter._hash_token("test-token")
        hash2 = limiter._hash_token("test-token")

        assert hash1 == hash2

    def test_hash_token_different_tokens_different_hashes(self):
        """Test that different tokens return different hashes."""
        limiter = RateLimiter(max_attempts=3, window_seconds=60)

        hash1 = limiter._hash_token("token1")
        hash2 = limiter._hash_token("token2")

        assert hash1 != hash2

    def test_hash_token_handles_none(self):
        """Test that None token is handled correctly."""
        limiter = RateLimiter(max_attempts=3, window_seconds=60)

        hash_none = limiter._hash_token(None)
        assert isinstance(hash_none, str)
        assert len(hash_none) == 64  # SHA256 hex digest length


class TestRateLimiterFailureRecording:
    """Test failure recording."""

    def test_record_failure_adds_timestamp(self):
        """Test that recording failure adds a timestamp."""
        limiter = RateLimiter(max_attempts=3, window_seconds=60)
        token = "test-token"

        limiter.record_failure(token)

        token_id = limiter._hash_token(token)
        assert len(limiter._attempts[token_id]) == 1

    def test_record_failure_multiple_times(self):
        """Test that recording multiple failures works."""
        limiter = RateLimiter(max_attempts=3, window_seconds=60)
        token = "test-token"

        limiter.record_failure(token)
        limiter.record_failure(token)
        limiter.record_failure(token)

        token_id = limiter._hash_token(token)
        assert len(limiter._attempts[token_id]) == 3

    def test_record_failure_different_tokens(self):
        """Test that different tokens are tracked separately."""
        limiter = RateLimiter(max_attempts=3, window_seconds=60)

        limiter.record_failure("token1")
        limiter.record_failure("token2")

        token1_id = limiter._hash_token("token1")
        token2_id = limiter._hash_token("token2")

        assert len(limiter._attempts[token1_id]) == 1
        assert len(limiter._attempts[token2_id]) == 1


class TestRateLimiterRateLimiting:
    """Test rate limiting logic."""

    def test_is_rate_limited_below_threshold(self):
        """Test that below max attempts is not rate limited."""
        limiter = RateLimiter(max_attempts=3, window_seconds=60)
        token = "test-token"

        limiter.record_failure(token)
        limiter.record_failure(token)

        assert limiter.is_rate_limited(token) is False

    def test_is_rate_limited_at_threshold(self):
        """Test that at max attempts is rate limited."""
        limiter = RateLimiter(max_attempts=3, window_seconds=60)
        token = "test-token"

        limiter.record_failure(token)
        limiter.record_failure(token)
        limiter.record_failure(token)

        assert limiter.is_rate_limited(token) is True

    def test_is_rate_limited_above_threshold(self):
        """Test that above max attempts is rate limited."""
        limiter = RateLimiter(max_attempts=3, window_seconds=60)
        token = "test-token"

        for _ in range(5):
            limiter.record_failure(token)

        assert limiter.is_rate_limited(token) is True

    def test_is_rate_limited_new_token_not_limited(self):
        """Test that new token is not rate limited."""
        limiter = RateLimiter(max_attempts=3, window_seconds=60)

        assert limiter.is_rate_limited("new-token") is False


class TestRateLimiterCleanup:
    """Test cleanup of old attempts."""

    def test_cleanup_removes_old_attempts(self):
        """Test that old attempts outside window are removed."""
        limiter = RateLimiter(max_attempts=3, window_seconds=1)
        token = "test-token"

        limiter.record_failure(token)
        time.sleep(1.1)  # Wait for window to expire

        # Check if rate limited - this triggers cleanup
        assert limiter.is_rate_limited(token) is False

        # Verify old attempts were cleaned up
        token_id = limiter._hash_token(token)
        assert len(limiter._attempts[token_id]) == 0

    def test_cleanup_keeps_recent_attempts(self):
        """Test that recent attempts within window are kept."""
        limiter = RateLimiter(max_attempts=3, window_seconds=10)
        token = "test-token"

        limiter.record_failure(token)
        limiter.record_failure(token)

        # Check immediately - should keep both attempts
        assert limiter.is_rate_limited(token) is False

        token_id = limiter._hash_token(token)
        assert len(limiter._attempts[token_id]) == 2

    def test_cleanup_mixed_old_and_new(self):
        """Test cleanup with mix of old and new attempts."""
        limiter = RateLimiter(max_attempts=3, window_seconds=1)
        token = "test-token"

        # Add old attempt
        limiter.record_failure(token)
        time.sleep(1.1)

        # Add new attempt
        limiter.record_failure(token)

        # Should not be rate limited (only 1 recent attempt)
        assert limiter.is_rate_limited(token) is False

        token_id = limiter._hash_token(token)
        assert len(limiter._attempts[token_id]) == 1

    def test_rate_limit_resets_after_window(self):
        """Test that rate limit resets after window expires."""
        limiter = RateLimiter(max_attempts=2, window_seconds=1)
        token = "test-token"

        # Hit rate limit
        limiter.record_failure(token)
        limiter.record_failure(token)
        assert limiter.is_rate_limited(token) is True

        # Wait for window to expire
        time.sleep(1.1)

        # Should not be rate limited anymore
        assert limiter.is_rate_limited(token) is False
