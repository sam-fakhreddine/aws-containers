"""
AWS Profile Bridge - Native Messaging Host for Firefox Extension

A refactored implementation following SOLID, DRY, and KISS principles.
"""

__version__ = '2.0.0'

from .aws_profile_bridge import AWSProfileBridge, main

__all__ = ['AWSProfileBridge', 'main']
