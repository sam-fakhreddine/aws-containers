#!/bin/bash
# Test script to verify .nosso file behavior

set -e

echo "=== Testing .nosso file behavior ==="
echo ""

# Test 1: Without .nosso file
echo "Test 1: Without .nosso file (SSO profiles should be included)"
rm -f ~/.aws/.nosso
echo '{"action":"getProfiles"}' | python3 -m aws_profile_bridge.aws_profile_bridge 2>&1 | jq '.profiles[] | select(.is_sso == true) | .name' | head -5
echo ""

# Test 2: With .nosso file
echo "Test 2: With .nosso file (SSO profiles should be EXCLUDED)"
touch ~/.aws/.nosso
echo '{"action":"getProfiles"}' | python3 -m aws_profile_bridge.aws_profile_bridge 2>&1 | jq '.profiles[] | select(.is_sso == true) | .name' | head -5
echo ""

# Show log file
echo "=== Log file contents (last 50 lines) ==="
tail -50 ~/.aws/logs/aws_profile_bridge.log

# Cleanup
rm -f ~/.aws/.nosso
echo ""
echo "Test complete. .nosso file removed."
