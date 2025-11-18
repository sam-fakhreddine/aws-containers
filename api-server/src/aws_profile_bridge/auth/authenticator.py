"""Authentication service combining token validation and rate limiting."""

import logging
from fastapi import HTTPException, status

from .token_manager import TokenManager
from .rate_limiter import RateLimiter

logger = logging.getLogger(__name__)


class Authenticator:
    """Handles authentication with token validation and rate limiting."""

    def __init__(self, token_manager: TokenManager, rate_limiter: RateLimiter):
        self.token_manager = token_manager
        self.rate_limiter = rate_limiter

    def authenticate(self, token: str | None) -> None:
        """Authenticate request with token and rate limiting."""
        if self.rate_limiter.is_rate_limited(token):
            logger.warning("Rate limit exceeded")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many failed attempts",
            )

        if not self.token_manager.validate(token):
            self.rate_limiter.record_failure(token)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or missing API token",
            )
