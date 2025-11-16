#!/usr/bin/env python3
"""
Quick test script to verify .nosso file detection
"""
import sys
from pathlib import Path

# Add the native messaging source to path
sys.path.insert(0, str(Path(__file__).parent / 'native-messaging' / 'src'))

from aws_profile_bridge.file_parsers import FileCache, CredentialsFileParser, ConfigFileParser, ProfileConfigReader
from aws_profile_bridge.sso_manager import SSOTokenCache, SSOProfileEnricher
from aws_profile_bridge.credential_provider import ProfileAggregator

def test_nosso():
    aws_dir = Path.home() / '.aws'
    credentials_file = aws_dir / 'credentials'
    config_file = aws_dir / 'config'
    sso_cache_dir = aws_dir / 'sso' / 'cache'
    nosso_file = aws_dir / '.nosso'

    print(f"AWS Directory: {aws_dir}")
    print(f"AWS Directory exists: {aws_dir.exists()}")
    print(f".nosso file path: {nosso_file}")
    print(f".nosso file exists: {nosso_file.exists()}")
    print()

    if not aws_dir.exists():
        print("⚠️  ~/.aws directory doesn't exist - creating it for testing")
        aws_dir.mkdir(parents=True, exist_ok=True)

    # Initialize components
    file_cache = FileCache()
    credentials_parser = CredentialsFileParser(credentials_file, file_cache)
    config_parser = ConfigFileParser(config_file, file_cache)
    config_reader = ProfileConfigReader(credentials_file, config_file)
    sso_token_cache = SSOTokenCache(sso_cache_dir)
    sso_enricher = SSOProfileEnricher(sso_token_cache)

    # Create ProfileAggregator
    aggregator = ProfileAggregator(
        credentials_parser,
        config_parser,
        sso_enricher,
        config_reader,
        aws_dir
    )

    # Test 1: Without .nosso file
    print("=" * 60)
    print("TEST 1: Without .nosso file")
    print("=" * 60)
    result = aggregator._should_skip_sso_profiles()
    print(f"_should_skip_sso_profiles() returned: {result}")
    print(f"Expected: False")
    print(f"✓ PASS" if result == False else "✗ FAIL")
    print()

    # Test 2: Create .nosso file
    print("=" * 60)
    print("TEST 2: With .nosso file")
    print("=" * 60)
    print(f"Creating .nosso file at: {nosso_file}")
    nosso_file.touch()
    print(f".nosso file exists: {nosso_file.exists()}")
    result = aggregator._should_skip_sso_profiles()
    print(f"_should_skip_sso_profiles() returned: {result}")
    print(f"Expected: True")
    print(f"✓ PASS" if result == True else "✗ FAIL")
    print()

    # Cleanup
    if nosso_file.exists():
        print(f"Cleaning up: removing {nosso_file}")
        nosso_file.unlink()

if __name__ == '__main__':
    test_nosso()
