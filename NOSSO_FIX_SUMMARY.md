# .nosso File Issue - Root Cause & Fix

## Problems Identified

### 1. `.nosso` File Not Being Respected

**Root Cause:**
- The `_should_skip_sso_profiles()` check was happening INSIDE `_build_profile_info()` for each profile
- But `boto3.Session().available_profiles` returns ALL profiles from both `~/.aws/credentials` AND `~/.aws/config`
- So boto3 was enumerating SSO profiles, then we were filtering them out one-by-one
- This meant SSO profiles were still being processed, just rejected later

**The Fix:**
```python
def _get_profiles_with_boto3(self, skip_sso_enrichment: bool = True) -> List[Dict]:
    # Check if SSO profiles should be skipped BEFORE enumerating
    skip_sso = self._should_skip_sso_profiles()  # <-- Added this
    
    available_profiles = boto3.Session().available_profiles
    # ... rest of code
```

Now the check happens once at the start, and each profile build knows whether to skip SSO.

### 2. Logging Doesn't Work

**Root Cause:**
- Debug logger was disabled by default (required `DEBUG=1` environment variable)
- Native messaging makes it hard to set environment variables
- Logs were going to file, but you didn't know where to look

**The Fix:**
```python
def __init__(self, enabled: bool = None, log_file: Optional[Path] = None):
    if enabled is None:
        # Default to enabled for file logging (doesn't interfere with native messaging)
        enabled = os.environ.get("DEBUG", "1").lower() in ("1", "true", "yes")
        #                                 ^^^
        #                          Changed default from "" to "1"
```

Now logging is **enabled by default** and writes to:
```
~/.aws/logs/aws_profile_bridge.log
```

## How Logging Works Now

### File Logging (Safe for Native Messaging)
```python
# Logs go to ~/.aws/logs/aws_profile_bridge.log
# Does NOT write to stderr (which would break native messaging)
# Automatically rotates at 10MB (keeps 5 backups)
```

### Log Format
```
2024-01-15T10:30:45.123456 [PID:12345] [0.123s]   → Operation name
2024-01-15T10:30:45.234567 [PID:12345] [0.234s]     ✓ Success message
2024-01-15T10:30:45.345678 [PID:12345] [0.345s]     ✗ Error message
```

### What Gets Logged
- ✅ Profile enumeration (boto3 vs manual)
- ✅ .nosso file detection
- ✅ SSO vs credential classification
- ✅ Profile counts and names
- ✅ Timing information
- ❌ **NEVER logs credentials** (automatically redacted)

## Testing the Fix

### Option 1: Python Debug Script (Recommended)
```bash
# Without .nosso file (SSO profiles should appear)
rm -f ~/.aws/.nosso
python3 test_nosso_debug.py

# With .nosso file (SSO profiles should be filtered)
touch ~/.aws/.nosso
python3 test_nosso_debug.py

# Check the logs
tail -100 ~/.aws/logs/aws_profile_bridge.log
```

### Option 2: Direct Native Messaging Test
```bash
# Without .nosso file
rm -f ~/.aws/.nosso
echo '{"action":"getProfiles"}' | python3 -m aws_profile_bridge.aws_profile_bridge | jq '.profiles | length'

# With .nosso file
touch ~/.aws/.nosso
echo '{"action":"getProfiles"}' | python3 -m aws_profile_bridge.aws_profile_bridge | jq '.profiles | length'

# Check logs
tail -100 ~/.aws/logs/aws_profile_bridge.log
```

### Option 3: In Firefox Extension
1. Create/remove `~/.aws/.nosso` file
2. Click "Refresh Profiles" button in extension
3. Check logs: `tail -f ~/.aws/logs/aws_profile_bridge.log`

## Expected Behavior

### Without .nosso file
```
[0.001s] → Initializing AWS Profile Bridge
[0.002s]   ✓ SSO profiles enabled (no .nosso file found)
[0.050s] → Getting all profiles (skip_sso_enrichment=True)
[0.051s] → Using boto3 for profile enumeration
[0.052s] → Boto3 found 15 profiles: dev, staging, prod, sso-dev, sso-prod, ...
[0.100s]   ✓ Profile classification summary:
[0.101s]   → • SSO profiles (5): sso-dev, sso-prod, ...
[0.102s]   → • Credential profiles (10): dev, staging, prod, ...
```

### With .nosso file
```
[0.001s] → Initializing AWS Profile Bridge
[0.002s]   ⚠️  NOSSO MODE: ~/.aws/.nosso file detected - SSO profiles DISABLED
[0.050s] → Getting all profiles (skip_sso_enrichment=True)
[0.051s]   ⚠️  ~/.aws/.nosso file detected - SSO profiles will be DISABLED
[0.052s] → Using boto3 for profile enumeration
[0.053s] → Boto3 found 15 profiles: dev, staging, prod, sso-dev, sso-prod, ...
[0.060s] → Building profile info for: sso-dev
[0.061s]   ⊗ SKIPPING SSO profile sso-dev due to .nosso file
[0.062s] → Building profile info for: dev
[0.063s]   ✓ CLASSIFIED AS CREDENTIALS - Found in credentials file
[0.100s]   ✓ Profile classification summary:
[0.101s]   → • SSO profiles (0): none
[0.102s]   → • Credential profiles (10): dev, staging, prod, ...
```

## Log File Location

```bash
# View logs in real-time
tail -f ~/.aws/logs/aws_profile_bridge.log

# View last 100 lines
tail -100 ~/.aws/logs/aws_profile_bridge.log

# Search for specific profile
grep "sso-dev" ~/.aws/logs/aws_profile_bridge.log

# Search for .nosso mentions
grep "nosso" ~/.aws/logs/aws_profile_bridge.log
```

## Troubleshooting

### Logs are empty or not being created
```bash
# Check if log directory exists
ls -la ~/.aws/logs/

# Check permissions
ls -la ~/.aws/logs/aws_profile_bridge.log

# Manually create directory
mkdir -p ~/.aws/logs
chmod 700 ~/.aws/logs
```

### .nosso file not being respected
```bash
# Verify file exists
ls -la ~/.aws/.nosso

# Check logs for .nosso detection
grep -i "nosso" ~/.aws/logs/aws_profile_bridge.log

# Run debug script
python3 test_nosso_debug.py
```

### SSO profiles still appearing with .nosso file
```bash
# Clear any caches
rm -rf ~/.aws/sso/cache/*

# Restart Firefox completely
# Click "Refresh Profiles" in extension

# Check logs
tail -100 ~/.aws/logs/aws_profile_bridge.log | grep -i "sso\|nosso"
```

## Summary of Changes

### Files Modified

1. **credential_provider.py**
   - Added early `.nosso` check in `_get_profiles_with_boto3()`
   - Improved log messages with symbols (⊗ for skipped SSO profiles)

2. **debug_logger.py**
   - Changed default from disabled to enabled
   - Logs to `~/.aws/logs/aws_profile_bridge.log` by default
   - Does NOT write to stderr (safe for native messaging)

3. **aws_profile_bridge.py**
   - Added startup log message showing .nosso status
   - Logs at initialization time

### Files Created

1. **test_nosso_debug.py** - Python test script with detailed logging
2. **test_nosso.sh** - Bash test script (requires jq)
3. **NOSSO_FIX_SUMMARY.md** - This document

## Next Steps

1. **Test the fix:**
   ```bash
   python3 test_nosso_debug.py
   ```

2. **Check logs:**
   ```bash
   tail -100 ~/.aws/logs/aws_profile_bridge.log
   ```

3. **Test in Firefox:**
   - Create `.nosso` file: `touch ~/.aws/.nosso`
   - Click "Refresh Profiles" in extension
   - Verify SSO profiles are gone

4. **Remove .nosso to re-enable SSO:**
   ```bash
   rm ~/.aws/.nosso
   ```
   - Click "Refresh Profiles" in extension
   - Verify SSO profiles are back
