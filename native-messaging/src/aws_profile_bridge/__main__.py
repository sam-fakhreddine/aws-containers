#!/usr/bin/env python3
"""
Main entry point for aws_profile_bridge package
"""

# CRITICAL: Import logging configuration FIRST, before any other modules
# This prevents boto3 and other libraries from writing to stderr
from . import logging_config  # noqa: F401

from .aws_profile_bridge import main

if __name__ == "__main__":
    main()
