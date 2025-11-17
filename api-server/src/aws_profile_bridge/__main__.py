#!/usr/bin/env python3
"""
Main entry point for aws_profile_bridge package - Python 3.12+
"""

import sys

# CRITICAL: Import logging configuration FIRST, before any other modules
# This prevents boto3 and other libraries from writing to stderr
from .config import logging  # noqa: F401


def main() -> int:
    """Main entry point with subcommand support."""
    
    # Python 3.12 match statement for clean command routing
    match sys.argv[1:]:
        case ["api"] | ["server"] | ["api-server"]:
            from .app import main as app_main
            app_main()
            return 0
            
        case ["--version"] | ["-v"]:
            print("AWS Profile Bridge v2.0.0 (Python 3.12+)")
            return 0
            
        case ["--help"] | ["-h"] | []:
            print_help()
            return 0
            
        case _:
            # Original native messaging functionality
            from .core.bridge import main as bridge_main
            bridge_main()
            return 0


def print_help() -> None:
    """Print help message."""
    help_text = """
AWS Profile Bridge v2.0.0 (Python 3.12+)

Usage:
    python -m aws_profile_bridge [command]

Commands:
    api, server       Start HTTP API server
    --version, -v     Show version
    --help, -h        Show this help

Native Messaging Mode (default):
    When run without arguments, operates as Firefox native messaging host
    
Examples:
    python -m aws_profile_bridge api
    python -m aws_profile_bridge --version
    """
    print(help_text)


if __name__ == "__main__":
    sys.exit(main())
