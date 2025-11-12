# Debug Logging for AWS Profile Bridge

## Overview

The AWS Profile Bridge includes a comprehensive debug logging system to help troubleshoot performance issues and understand the flow of operations. Debug logging is automatically enabled in `--dev` mode and can be manually enabled for production builds.

## Features

- **Timing Information**: Automatically tracks and reports execution time for all major operations
- **Operation Tracking**: Logs each step of profile loading, parsing, and credential retrieval
- **Safe Logging**: Automatically redacts sensitive data (credentials, tokens, secrets)
- **Dual Output**: Logs to both stderr (real-time) and files (persistent)
- **Automatic Rotation**: Log files automatically rotate at 10 MB with 5 backups (~50 MB total)
- **Secure Storage**: Log files have 0600 permissions (user-only access)
- **Non-intrusive**: stderr output doesn't interfere with native messaging protocol
- **Zero Overhead**: When disabled, has no performance impact

## Enabling Debug Logging

### Development Mode (Automatic)

Debug logging is automatically enabled when using `--dev` mode:

```bash
./install.sh --dev
```

### Production Mode (Manual)

To enable debug logging in production:

#### Option 1: Environment Variable

Set the `DEBUG` environment variable before running the extension:

```bash
export DEBUG=1
```

#### Option 2: Modify Wrapper Script

Edit `~/.local/bin/aws_profile_bridge` and add:

```bash
export DEBUG=1
```

## Viewing Debug Logs

Debug logs are sent to **both stderr and log files**:

### Real-Time Logs (stderr)

#### Firefox Browser Console

1. Open Firefox
2. Press `Ctrl+Shift+J` (Windows/Linux) or `Cmd+Shift+J` (macOS)
3. Click on the extension icon to trigger operations
4. Watch debug logs appear in real-time

#### Terminal (for manual testing)

```bash
echo '{"action":"getProfiles"}' | ~/.local/bin/aws_profile_bridge 2>&1
```

The `2>&1` redirects stderr to stdout so you can see the debug output.

### Persistent Logs (Files)

#### Log File Location

Default location: `~/.aws/logs/aws_profile_bridge.log`

#### Viewing Log Files

```bash
# View current log file
cat ~/.aws/logs/aws_profile_bridge.log

# Follow log file in real-time (like tail -f)
tail -f ~/.aws/logs/aws_profile_bridge.log

# View most recent entries
tail -n 100 ~/.aws/logs/aws_profile_bridge.log

# Search for errors
grep "✗" ~/.aws/logs/aws_profile_bridge.log

# View timing information
grep "⏱" ~/.aws/logs/aws_profile_bridge.log
```

#### Log Rotation

Logs automatically rotate when they reach **10 MB**:

- Current log: `aws_profile_bridge.log`
- Rotated logs: `aws_profile_bridge.log.1`, `aws_profile_bridge.log.2`, etc.
- Maximum backups: 5 files (~50 MB total)
- Oldest logs are automatically deleted

#### Cleaning Old Logs

Use the provided cleanup script:

```bash
# Remove rotated logs only (keep current)
./scripts/clean-logs.sh

# Remove all logs including current
./scripts/clean-logs.sh --all
```

Or manually:

```bash
# Remove all rotated logs (keep current)
rm ~/.aws/logs/aws_profile_bridge.log.*

# Remove all logs including current
rm ~/.aws/logs/aws_profile_bridge.log*

# View total log size
du -sh ~/.aws/logs/
```

#### Log File Format

File logs include additional information:

```
2025-01-12T10:30:45.123456 [PID:12345] [0.001s] ▸ Get Profiles (Fast Mode)
2025-01-12T10:30:45.124567 [PID:12345] [0.002s]   → Fetching all profiles
```

- **ISO Timestamp**: Exact time of log entry
- **PID**: Process ID for distinguishing concurrent sessions
- **Elapsed Time**: Time since session started
- **Message**: Log content with indentation

## Log Format

Debug logs follow this format:

```
[<elapsed_time>] <indent><message>
```

Example output:

```
================================================================================
AWS Profile Bridge - Debug Session Started
Time: 2025-01-12T10:30:45.123456
PID: 12345
================================================================================

▸ Get Profiles (Fast Mode)
  → Fetching all profiles (skip SSO enrichment)
    → Using boto3 for profile enumeration
      → Parsing credentials
        ✓ Using cached data for credentials (5 profiles)
      ⏱ parse: 0.001s
      → Parsing config
        ✓ Parsed 3 profiles from config
      ⏱ parse: 0.003s
    ✓ Retrieved 8 profiles
  ⏱ get_all_profiles: 0.005s
  → Adding metadata to profiles
  ✓ Processed profiles: 5 credential-based, 3 SSO
⏱ Get Profiles (Fast Mode): 0.008s
```

## Log Symbols

- `▸` - Section header
- `→` - Operation start
- `✓` - Success
- `✗` - Error
- `⏱` - Timing information

## What Gets Logged

### File Operations
- File parsing (credentials, config)
- Cache hits/misses
- File read timing

### Profile Operations
- Profile aggregation
- SSO profile enrichment
- Metadata assignment
- Organization grouping

### SSO Operations
- Token lookup (memory vs file cache)
- Token validation
- Credentials retrieval
- API calls to AWS SSO

### Message Handling
- Incoming message actions
- Response generation
- Error conditions

## Security: What Gets Redacted

The logger automatically redacts sensitive information:

### Always Redacted
- `aws_access_key_id`
- `aws_secret_access_key`
- `aws_session_token`
- `accessToken`
- `secretAccessKey`
- `sessionToken`
- `clientSecret`
- `password`
- `secret`
- `token`

### Example

```python
profile = {
    "name": "my-profile",
    "aws_access_key_id": "AKIAIOSFODNN7EXAMPLE",
    "aws_secret_access_key": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
}
```

Logged as:

```
name: my-profile
aws_access_key_id: ***REDACTED***
aws_secret_access_key: ***REDACTED***
```

## Performance Impact

### When Enabled
- Minimal overhead (~1-2ms per operation)
- Logs go to stderr (non-blocking)
- No file I/O for logging

### When Disabled
- **Zero overhead** - all logging code is bypassed
- No string formatting
- No function calls

## Troubleshooting Common Issues

### Slow Profile Loading

Check the timing for these operations:

```
⏱ parse: X.XXXs              # File parsing
⏱ get_all_profiles: X.XXXs   # Profile aggregation
⏱ SSO token lookup: X.XXXs   # Token cache lookup
```

- **parse > 0.1s**: Large credentials file, consider cleanup
- **SSO token lookup > 0.5s**: File cache search is slow
- **get_all_profiles > 1.0s**: Too many SSO profiles being enriched

### SSO Token Issues

Look for these messages:

```
✗ No valid SSO token found
✓ Found token in memory cache
✓ Found token in file cache
```

### Profile Not Found

Check these logs:

```
✓ Parsed X profiles from credentials
✓ Parsed Y profiles from config
✗ No credentials found for profile: example
✗ No config found for profile: example
```

## Programmatic Usage

### In Python Code

```python
from aws_profile_bridge.debug_logger import get_logger, section, timer

# Get logger instance
logger = get_logger()

# Log a message
logger.log("Processing profile")

# Log with section timing
with section("Profile Processing"):
    # Your code here
    pass

# Decorator for timing
@timer("operation_name")
def my_function():
    pass
```

### Enable/Disable Programmatically

```python
from aws_profile_bridge.debug_logger import set_debug_enabled

# Enable
set_debug_enabled(True)

# Disable
set_debug_enabled(False)
```

## Best Practices

1. **Always enable in development**: Use `--dev` mode for active development
2. **Check logs first**: Before reporting issues, collect debug logs
3. **Look for timing**: Identify slow operations from timing data
4. **Check for errors**: Look for `✗` symbols indicating failures
5. **Disable in production**: For optimal performance, disable debug logging

## Support

If you encounter issues:

1. Enable debug logging
2. Reproduce the issue
3. Copy the debug log output
4. Create an issue at: https://github.com/sam-fakhreddine/aws-containers/issues
5. Include the debug logs (ensure no credentials are visible)
