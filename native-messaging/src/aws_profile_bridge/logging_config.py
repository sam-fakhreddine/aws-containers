#!/usr/bin/env python3
"""
Logging Configuration - MUST BE IMPORTED FIRST

This module MUST be imported before any other modules (especially boto3)
to prevent stderr output that would break native messaging protocol.
"""

import logging
import sys
from pathlib import Path

# Create log directory
log_dir = Path.home() / ".aws" / "logs"
log_dir.mkdir(parents=True, exist_ok=True)
log_file = log_dir / "aws_profile_bridge_errors.log"

# CRITICAL: Clear ALL existing handlers and disable propagation
# This prevents boto3 from writing to stderr when it's imported
root_logger = logging.getLogger()
root_logger.handlers.clear()
root_logger.setLevel(logging.CRITICAL)

# Disable all logging output by default (file logging only for errors)
logging.basicConfig(
    level=logging.CRITICAL,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.FileHandler(str(log_file))],
    force=True,  # Override any existing configuration
)

# CRITICAL: Silence boto3/botocore/urllib3 BEFORE they are imported
# These libraries log to stderr by default, which breaks native messaging
for logger_name in [
    "boto3",
    "botocore",
    "urllib3",
    "urllib3.connectionpool",
    "s3transfer",
]:
    logger = logging.getLogger(logger_name)
    logger.setLevel(logging.CRITICAL)
    logger.propagate = False
    # Remove any handlers these loggers might have
    logger.handlers = []

# Ensure root logger has no stream handler pointing to stderr
for handler in root_logger.handlers[:]:
    if isinstance(handler, logging.StreamHandler) and handler.stream in (
        sys.stderr,
        sys.stdout,
    ):
        root_logger.removeHandler(handler)
