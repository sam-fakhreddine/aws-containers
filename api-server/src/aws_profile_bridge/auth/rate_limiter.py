"""Rate limiting for authentication attempts."""

import time
import logging
from collections import defaultdict

logger = logging.getLogger(__name__)


class RateLimiter:
    """Rate limiter for failed authentication attempts."""

    def __init__(self, max_attempts: int, window_seconds: int):
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self._attempts: dict[str, list[float]] = defaultdict(list)

    def is_rate_limited(self, client_id: str) -> bool:
        """Check if client is rate limited."""
        self._cleanup_old_attempts(client_id)
        return len(self._attempts[client_id]) >= self.max_attempts

    def record_failure(self, client_id: str) -> None:
        """Record a failed attempt."""
        self._attempts[client_id].append(time.time())
        logger.warning(f"Failed attempt from {client_id}")

    def _cleanup_old_attempts(self, client_id: str) -> None:
        """Remove attempts outside the time window."""
        cutoff = time.time() - self.window_seconds
        self._attempts[client_id] = [t for t in self._attempts[client_id] if t > cutoff]
