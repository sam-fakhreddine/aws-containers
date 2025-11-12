#!/usr/bin/env python3
"""
Debug Logger for AWS Profile Bridge

Provides detailed logging and timing information for debugging purposes.
SECURITY: Never logs credentials or sensitive data.
"""

import sys
import time
import os
import json
from functools import wraps
from contextlib import contextmanager
from typing import Any, Dict, Optional, Callable
from datetime import datetime


class DebugLogger:
    """
    Debug logger with timing support.

    Outputs to stderr to avoid interfering with native messaging protocol.
    Can be enabled via DEBUG environment variable or programmatically.
    """

    # Sensitive keys that should never be logged
    SENSITIVE_KEYS = {
        'aws_access_key_id',
        'aws_secret_access_key',
        'aws_session_token',
        'accessKeyId',
        'secretAccessKey',
        'sessionToken',
        'accessToken',
        'clientSecret',
        'clientId',
        'token',
        'password',
        'secret',
    }

    def __init__(self, enabled: bool = None):
        """
        Initialize debug logger.

        Args:
            enabled: If None, checks DEBUG environment variable
        """
        if enabled is None:
            enabled = os.environ.get('DEBUG', '').lower() in ('1', 'true', 'yes')

        self.enabled = enabled
        self.start_time = time.time()
        self._indent_level = 0

        if self.enabled:
            self._log_header()

    def _log_header(self):
        """Log session header."""
        self._write("=" * 80)
        self._write(f"AWS Profile Bridge - Debug Session Started")
        self._write(f"Time: {datetime.now().isoformat()}")
        self._write(f"PID: {os.getpid()}")
        self._write("=" * 80)

    def _get_elapsed_time(self) -> str:
        """Get elapsed time since logger start."""
        elapsed = time.time() - self.start_time
        return f"{elapsed:.3f}s"

    def _write(self, message: str):
        """Write message to stderr."""
        indent = "  " * self._indent_level
        timestamp = self._get_elapsed_time()
        sys.stderr.write(f"[{timestamp}] {indent}{message}\n")
        sys.stderr.flush()

    def log(self, message: str):
        """Log a message."""
        if self.enabled:
            self._write(message)

    def log_section(self, title: str):
        """Log a section header."""
        if self.enabled:
            self._write("")
            self._write(f"▸ {title}")

    def log_operation(self, operation: str, details: Optional[Dict] = None):
        """
        Log an operation with optional details.

        Args:
            operation: Operation name
            details: Optional dictionary of details (sensitive data filtered)
        """
        if not self.enabled:
            return

        self._write(f"→ {operation}")

        if details:
            safe_details = self._sanitize_data(details)
            self._indent_level += 1
            for key, value in safe_details.items():
                if isinstance(value, (dict, list)):
                    value_str = json.dumps(value, indent=2)
                else:
                    value_str = str(value)
                self._write(f"{key}: {value_str}")
            self._indent_level -= 1

    def log_result(self, message: str, success: bool = True):
        """Log operation result."""
        if self.enabled:
            symbol = "✓" if success else "✗"
            self._write(f"{symbol} {message}")

    def log_error(self, error: Exception, context: str = ""):
        """Log an error."""
        if self.enabled:
            self._write(f"✗ ERROR: {context}")
            self._indent_level += 1
            self._write(f"Type: {type(error).__name__}")
            self._write(f"Message: {str(error)}")
            self._indent_level -= 1

    def log_timing(self, operation: str, duration: float):
        """Log timing information."""
        if self.enabled:
            self._write(f"⏱ {operation}: {duration:.3f}s")

    def _sanitize_data(self, data: Any) -> Any:
        """
        Remove sensitive information from data.

        Recursively filters out credentials and tokens.
        """
        if isinstance(data, dict):
            sanitized = {}
            for key, value in data.items():
                # Check if key contains sensitive data
                if any(sensitive in key.lower() for sensitive in self.SENSITIVE_KEYS):
                    sanitized[key] = "***REDACTED***"
                else:
                    sanitized[key] = self._sanitize_data(value)
            return sanitized

        elif isinstance(data, (list, tuple)):
            return [self._sanitize_data(item) for item in data]

        else:
            return data

    @contextmanager
    def section(self, title: str):
        """Context manager for logging a section with timing."""
        if not self.enabled:
            yield
            return

        self.log_section(title)
        self._indent_level += 1
        start = time.time()

        try:
            yield
        finally:
            duration = time.time() - start
            self._indent_level -= 1
            self.log_timing(title, duration)

    def timer(self, operation_name: str = None) -> Callable:
        """
        Decorator to time function execution.

        Args:
            operation_name: Optional name for the operation (defaults to function name)
        """
        def decorator(func: Callable) -> Callable:
            @wraps(func)
            def wrapper(*args, **kwargs):
                if not self.enabled:
                    return func(*args, **kwargs)

                name = operation_name or func.__name__
                self.log_operation(f"Starting: {name}")
                self._indent_level += 1

                start = time.time()
                try:
                    result = func(*args, **kwargs)
                    duration = time.time() - start
                    self._indent_level -= 1
                    self.log_timing(name, duration)
                    return result
                except Exception as e:
                    duration = time.time() - start
                    self._indent_level -= 1
                    self.log_error(e, f"in {name}")
                    self.log_timing(f"{name} (failed)", duration)
                    raise

            return wrapper
        return decorator


# Global logger instance
_logger: Optional[DebugLogger] = None


def get_logger() -> DebugLogger:
    """Get or create global debug logger."""
    global _logger
    if _logger is None:
        _logger = DebugLogger()
    return _logger


def set_debug_enabled(enabled: bool):
    """Enable or disable debug logging."""
    global _logger
    if _logger is None:
        _logger = DebugLogger(enabled=enabled)
    else:
        _logger.enabled = enabled


# Convenience functions
def log(message: str):
    """Log a message."""
    get_logger().log(message)


def log_section(title: str):
    """Log a section header."""
    get_logger().log_section(title)


def log_operation(operation: str, details: Optional[Dict] = None):
    """Log an operation."""
    get_logger().log_operation(operation, details)


def log_result(message: str, success: bool = True):
    """Log operation result."""
    get_logger().log_result(message, success)


def log_error(error: Exception, context: str = ""):
    """Log an error."""
    get_logger().log_error(error, context)


def log_timing(operation: str, duration: float):
    """Log timing information."""
    get_logger().log_timing(operation, duration)


def section(title: str):
    """Context manager for logging a section with timing."""
    return get_logger().section(title)


def timer(operation_name: str = None):
    """Decorator to time function execution."""
    return get_logger().timer(operation_name)
