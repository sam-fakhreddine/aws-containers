"""Tests for Authenticator."""

import tempfile
from pathlib import Path
from unittest.mock import MagicMock, Mock

import pytest
from fastapi import HTTPException, status

from aws_profile_bridge.auth.authenticator import Authenticator
from aws_profile_bridge.auth.token_manager import TokenManager
from aws_profile_bridge.auth.rate_limiter import RateLimiter


class TestAuthenticatorInit:
    """Test Authenticator initialization."""

    def test_init_with_dependencies(self):
        """Test initialization with token manager and rate limiter."""
        token_manager = Mock()
        rate_limiter = Mock()

        authenticator = Authenticator(token_manager, rate_limiter)

        assert authenticator.token_manager is token_manager
        assert authenticator.rate_limiter is rate_limiter


class TestAuthenticatorAuthenticate:
    """Test authentication logic."""

    def test_authenticate_with_valid_token(self):
        """Test that valid token passes authentication."""
        token_manager = Mock()
        token_manager.validate.return_value = True

        rate_limiter = Mock()
        rate_limiter.is_rate_limited.return_value = False

        authenticator = Authenticator(token_manager, rate_limiter)

        # Should not raise exception
        authenticator.authenticate("valid-token")

        token_manager.validate.assert_called_once_with("valid-token")
        rate_limiter.is_rate_limited.assert_called_once_with("valid-token")

    def test_authenticate_with_invalid_token_raises_401(self):
        """Test that invalid token raises 401."""
        token_manager = Mock()
        token_manager.validate.return_value = False

        rate_limiter = Mock()
        rate_limiter.is_rate_limited.return_value = False

        authenticator = Authenticator(token_manager, rate_limiter)

        with pytest.raises(HTTPException) as exc_info:
            authenticator.authenticate("invalid-token")

        assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
        assert "Invalid or missing API token" in exc_info.value.detail

    def test_authenticate_invalid_token_records_failure(self):
        """Test that invalid token records failure in rate limiter."""
        token_manager = Mock()
        token_manager.validate.return_value = False

        rate_limiter = Mock()
        rate_limiter.is_rate_limited.return_value = False

        authenticator = Authenticator(token_manager, rate_limiter)

        with pytest.raises(HTTPException):
            authenticator.authenticate("invalid-token")

        rate_limiter.record_failure.assert_called_once_with("invalid-token")

    def test_authenticate_rate_limited_raises_429(self):
        """Test that rate limited request raises 429."""
        token_manager = Mock()
        rate_limiter = Mock()
        rate_limiter.is_rate_limited.return_value = True

        authenticator = Authenticator(token_manager, rate_limiter)

        with pytest.raises(HTTPException) as exc_info:
            authenticator.authenticate("any-token")

        assert exc_info.value.status_code == status.HTTP_429_TOO_MANY_REQUESTS
        assert "Too many failed attempts" in exc_info.value.detail

    def test_authenticate_rate_limited_before_token_check(self):
        """Test that rate limit is checked before token validation."""
        token_manager = Mock()
        rate_limiter = Mock()
        rate_limiter.is_rate_limited.return_value = True

        authenticator = Authenticator(token_manager, rate_limiter)

        with pytest.raises(HTTPException) as exc_info:
            authenticator.authenticate("any-token")

        # Rate limiter should be checked
        rate_limiter.is_rate_limited.assert_called_once_with("any-token")

        # Token validation should NOT be called (rate limited first)
        token_manager.validate.assert_not_called()

    def test_authenticate_with_none_token(self):
        """Test authentication with None token."""
        token_manager = Mock()
        token_manager.validate.return_value = False

        rate_limiter = Mock()
        rate_limiter.is_rate_limited.return_value = False

        authenticator = Authenticator(token_manager, rate_limiter)

        with pytest.raises(HTTPException) as exc_info:
            authenticator.authenticate(None)

        assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
        token_manager.validate.assert_called_once_with(None)


class TestAuthenticatorIntegration:
    """Integration tests with real components."""

    def test_integration_with_real_components(self):
        """Test authenticator with real TokenManager and RateLimiter."""
        with tempfile.TemporaryDirectory() as tmpdir:
            config_file = Path(tmpdir) / "config.json"
            token_manager = TokenManager(config_file)
            rate_limiter = RateLimiter(max_attempts=3, window_seconds=60)

            authenticator = Authenticator(token_manager, rate_limiter)

            # Generate valid token
            valid_token = token_manager.load_or_create()

            # Should authenticate successfully
            authenticator.authenticate(valid_token)

    def test_integration_invalid_token_hits_rate_limit(self):
        """Test that multiple invalid attempts hit rate limit."""
        with tempfile.TemporaryDirectory() as tmpdir:
            config_file = Path(tmpdir) / "config.json"
            token_manager = TokenManager(config_file)
            rate_limiter = RateLimiter(max_attempts=3, window_seconds=60)

            authenticator = Authenticator(token_manager, rate_limiter)

            invalid_token = "invalid-token-12345"

            # First 3 attempts should fail with 401
            for _ in range(3):
                with pytest.raises(HTTPException) as exc_info:
                    authenticator.authenticate(invalid_token)
                assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED

            # 4th attempt should fail with 429 (rate limited)
            with pytest.raises(HTTPException) as exc_info:
                authenticator.authenticate(invalid_token)
            assert exc_info.value.status_code == status.HTTP_429_TOO_MANY_REQUESTS
