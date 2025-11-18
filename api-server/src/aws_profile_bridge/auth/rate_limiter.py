"""Rate limiting for authentication attempts."""

import time
import hashlib
import logging
from collections import defaultdict

logger = logging.getLogger(__name__)


class RateLimiter:
    """Rate limiter for failed authentication attempts."""

    def __init__(self, max_attempts: int, window_seconds: int):
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self._attempts: dict[str, list[float]] = defaultdict(list)

    def is_rate_limited(self, token: str | None) -> bool:
        """Check if token is rate limited."""
        token_id = self._hash_token(token)
        self._cleanup_old_attempts(token_id)
        return len(self._attempts[token_id]) >= self.max_attempts

    def record_failure(self, token: str | None) -> None:
        """Record a failed attempt."""
        token_id = self._hash_token(token)
        self._attempts[token_id].append(time.time())
        logger.warning(f"Failed attempt for token hash {token_id[:8]}")

    def _hash_token(self, token: str | None) -> str:
        """Hash token for rate limiting."""
        return hashlib.sha256((token or "").encode()).hexdigest()

    def _cleanup_old_attempts(self, token_id: str) -> None:
        """Remove attempts outside the time window."""
        cutoff = time.time() - self.window_seconds
        self._attempts[token_id] = [t for t in self._attempts[token_id] if t > cutoff]
