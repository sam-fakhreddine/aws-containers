#!/usr/bin/env python3
"""
Debug script to test .nosso file behavior
"""

import sys
import json
from pathlib import Path

# Add the native-messaging src to path
sys.path.insert(0, str(Path(__file__).parent / "native-messaging" / "src"))

from aws_profile_bridge.credential_provider import ProfileAggregator
from aws_profile_bridge.file_parsers import (
    CredentialsFileParser,
    ConfigFileParser,
    ProfileConfigReader,
    FileCache
)
from aws_profile_bridge.sso_manager import SSOTokenCache, SSOProfileEnricher
from aws_profile_bridge.debug_logger import set_debug_enabled

# Enable debug logging
set_debug_enabled(True)

# Setup paths
aws_dir = Path.home() / ".aws"
credentials_file = aws_dir / "credentials"
config_file = aws_dir / "config"
sso_cache_dir = aws_dir / "sso" / "cache"
nosso_file = aws_dir / ".nosso"

# Initialize components
file_cache = FileCache()
credentials_parser = CredentialsFileParser(credentials_file, file_cache)
config_parser = ConfigFileParser(config_file, file_cache)
config_reader = ProfileConfigReader(credentials_file, config_file)
sso_token_cache = SSOTokenCache(sso_cache_dir)
sso_enricher = SSOProfileEnricher(sso_token_cache)

# Create aggregator
aggregator = ProfileAggregator(
    credentials_parser,
    config_parser,
    sso_enricher,
    config_reader,
    aws_dir
)

print("=" * 80)
print(f".nosso file exists: {nosso_file.exists()}")
print("=" * 80)
print()

# Get profiles
profiles = aggregator.get_all_profiles(skip_sso_enrichment=True)

# Analyze results
sso_profiles = [p for p in profiles if p.get('is_sso')]
cred_profiles = [p for p in profiles if not p.get('is_sso')]

print(f"\nRESULTS:")
print(f"  Total profiles: {len(profiles)}")
print(f"  SSO profiles: {len(sso_profiles)}")
print(f"  Credential profiles: {len(cred_profiles)}")
print()

if sso_profiles:
    print("SSO Profiles found:")
    for p in sso_profiles[:5]:
        print(f"  - {p['name']}")
    if len(sso_profiles) > 5:
        print(f"  ... and {len(sso_profiles) - 5} more")
else:
    print("No SSO profiles found (expected if .nosso file exists)")

print()
print("=" * 80)
print(f"Check log file: ~/.aws/logs/aws_profile_bridge.log")
print("=" * 80)
