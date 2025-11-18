# AWS Profile Bridge - CLI Reference

**Version**: 2.0.0
**Framework**: Click
**Command**: `aws-profile-bridge`

---

## Overview

Comprehensive command-line interface for managing the AWS Profile Bridge API server, tokens, profiles, and diagnostics.

```bash
aws-profile-bridge [COMMAND] [SUBCOMMAND] [OPTIONS]
```

---

## Installation

```bash
# Standard installation
pip install aws-profile-bridge

# With CLI extras (clipboard, QR codes)
pip install 'aws-profile-bridge[cli]'

# Development installation
pip install -e '.[dev]'
```

---

## Command Structure

| Command | Description | Priority |
|---------|-------------|----------|
| **`server`** | Server management (start/stop/status/logs) | 🔴 Essential |
| **`token`** | Token management (show/copy/rotate) | 🔴 Essential |
| **`profile`** | AWS profile operations (list/test/info) | 🟡 Common |
| **`diagnose`** | System diagnostics and health checks | 🟢 Helpful |
| **`cache`** | SSO/CLI cache management | 🟢 Helpful |
| **`config`** | Configuration management | 🔵 Advanced |

---

## Server Commands

Manage the API server lifecycle.

### `server start`

Start the API server.

```bash
# Start in foreground (default)
aws-profile-bridge server start

# Start in background (daemon mode)
aws-profile-bridge server start --daemon

# Start with auto-reload (development)
aws-profile-bridge server start --reload

# Custom host/port
aws-profile-bridge server start --host 0.0.0.0 --port 8080
```

**Options**:
- `--host`: Host to bind to (default: 127.0.0.1)
- `--port`: Port to run on (default: 10999)
- `--reload`: Enable auto-reload for development
- `--daemon`: Run in background as daemon

**Example**:
```bash
$ aws-profile-bridge server start
🚀 Starting AWS Profile Bridge API server...
   Host: 127.0.0.1
   Port: 10999
   Mode: Foreground (Ctrl+C to stop)

📝 Logs: /home/user/.aws/logs/aws_profile_bridge_api.log

INFO:     Started server process [12345]
INFO:     Uvicorn running on http://127.0.0.1:10999
```

---

### `server stop`

Stop the running API server.

```bash
# Graceful stop (SIGTERM)
aws-profile-bridge server stop

# Force stop (SIGKILL)
aws-profile-bridge server stop --force
```

**Example**:
```bash
$ aws-profile-bridge server stop
⏹️  Stopping server (PID: 12345)...
   Sent SIGTERM (graceful stop)
✅ Server stopped successfully
```

---

### `server restart`

Restart the API server (stop + start).

```bash
aws-profile-bridge server restart
```

**Example**:
```bash
$ aws-profile-bridge server restart
🔄 Restarting server...
   Stopping current server (PID: 12345)...
   Starting new server...

✅ Server restarted successfully (PID: 12367)
```

---

### `server status`

Check server status.

```bash
# Human-readable output
aws-profile-bridge server status

# JSON output
aws-profile-bridge server status --json
```

**Example**:
```bash
$ aws-profile-bridge server status
✅ Server Status: RUNNING
   PID: 12345
   Memory: 45.2 MB
   CPU: 0.5%
   Endpoint: http://127.0.0.1:10999
   Logs: /home/user/.aws/logs/aws_profile_bridge_api.log
```

---

### `server logs`

View server logs.

```bash
# Show last 50 lines (default)
aws-profile-bridge server logs

# Show last N lines
aws-profile-bridge server logs -n 100

# Follow logs (tail -f)
aws-profile-bridge server logs --follow

# Filter by level
aws-profile-bridge server logs --level ERROR
```

**Options**:
- `-f, --follow`: Follow log output (tail -f)
- `-n, --lines N`: Number of lines to show (default: 50)
- `--level LEVEL`: Filter by log level (INFO/WARNING/ERROR)

**Example**:
```bash
$ aws-profile-bridge server logs -f
📝 Following logs from /home/user/.aws/logs/aws_profile_bridge_api.log (Ctrl+C to stop)...

2025-11-18 10:15:23 | INFO     | aws_profile_bridge | Starting AWS Profile Bridge API v2.0.0
2025-11-18 10:15:23 | INFO     | aws_profile_bridge | Loaded API token from config
2025-11-18 10:15:24 | INFO     | uvicorn.error | Uvicorn running on http://127.0.0.1:10999
```

---

## Token Commands

Manage API tokens.

### `token show`

Display the current API token.

```bash
aws-profile-bridge token show
```

**Example**:
```bash
$ aws-profile-bridge token show
✅ Current API Token:

awspc_K8mN2pQ5rT9vX3zA7bC4dE6fG1hJ8kL0mN2pQ5rT_3hYh9E

✓ Format: New (awspc_...)
✓ Checksum: Valid

Stored in: /home/user/.aws/profile_bridge_config.json

Next steps:
1. Copy the token above
2. Open your browser extension settings
3. Paste the token and click 'Save'
```

---

### `token copy`

Copy token to clipboard (requires `pyperclip`).

```bash
aws-profile-bridge token copy
```

**Example**:
```bash
$ aws-profile-bridge token copy
✅ Token copied to clipboard!

Next steps:
1. Open your browser extension settings
2. Paste (Ctrl+V / Cmd+V) the token
3. Click 'Save'
```

---

### `token rotate`

Generate a new token (invalidates old one).

```bash
aws-profile-bridge token rotate
```

**Example**:
```bash
$ aws-profile-bridge token rotate
Current token: awspc_K8mN...3hYh9E

✅ New token generated!

awspc_MHBPq24pOLOHZVmHhOnA2ZSVgWDvpKtFazm0Bnd556A_2xZa3F

✅ Token copied to clipboard!

⚠️  IMPORTANT: Update your browser extension with the new token!

Steps:
1. Open browser extension settings
2. Paste the new token
3. Click 'Save'

⚠️  The old token is now invalid.
```

---

### `token qr`

Display token as QR code (requires `qrcode`).

```bash
aws-profile-bridge token qr
```

**Example**:
```bash
$ aws-profile-bridge token qr

✅ Scan this QR code with your mobile device:

█████████████████████████████████
███ ▄▄▄▄▄ █▀█ █▄▄▀▄█ ▄▄▄▄▄ ███
███ █   █ █▀▀▀█ ▀█▄█ █   █ ███
███ █▄▄▄█ █▀ █▀▀ ▄ █ █▄▄▄█ ███
█████████████████████████████████

Token: awspc_K8mN...3hYh9E
```

---

### `token setup`

Interactive setup wizard.

```bash
aws-profile-bridge token setup
```

**Example**:
```bash
$ aws-profile-bridge token setup
============================================================
AWS Profile Bridge - Setup Wizard
============================================================

📝 Generating API token...

✅ Token generated successfully!

awspc_K8mN2pQ5rT9vX3zA7bC4dE6fG1hJ8kL0mN2pQ5rT_3hYh9E

✅ Token copied to clipboard!

============================================================
Next Steps:
============================================================

1. Start the API server:
   $ aws-profile-bridge server start

2. Configure the browser extension:
   • Open extension settings
   • Paste the token above
   • Click 'Save'

3. You're ready to go! 🚀
============================================================
```

---

## Profile Commands

Manage AWS profiles.

### `profile list`

List all AWS profiles.

```bash
# Human-readable list
aws-profile-bridge profile list

# JSON output
aws-profile-bridge profile list --json

# Show count only
aws-profile-bridge profile list --count

# Include SSO profiles
aws-profile-bridge profile list --sso
```

**Example**:
```bash
$ aws-profile-bridge profile list
📋 Found 5 AWS profile(s):

   🔐 prod-sso                     (SSO)
   🔑 dev                          (Static)
   🔐 staging-sso                  (SSO)
   🔑 test                         (Static)
   🔑 default                      (Static)

💡 Tip: Use 'aws-profile-bridge profile info <name>' for details
```

---

### `profile info`

Show detailed profile information.

```bash
aws-profile-bridge profile info <profile-name>

# JSON output
aws-profile-bridge profile info <profile-name> --json
```

**Example**:
```bash
$ aws-profile-bridge profile info prod-sso

📋 Profile: prod-sso
============================================================

   Type: 🔐 SSO

   Configuration:
      sso_start_url        = https://mycompany.awsapps.com/start
      sso_region           = us-east-1
      sso_account_id       = 123456789012
      sso_role_name        = PowerUserAccess
      region               = us-east-1

   Has Credentials: ✅ Yes

   💡 SSO Profile - Login with: aws sso login --profile prod-sso
```

---

### `profile test`

Test if a profile can generate console URLs.

```bash
aws-profile-bridge profile test <profile-name>
```

**Example**:
```bash
$ aws-profile-bridge profile test dev
🧪 Testing profile: dev...
   1. Loading credentials...
   ✅ Credentials loaded
   2. Validating credential format...
   ✅ Credential format valid

✅ Profile 'dev' is ready to use!

💡 Test in extension: Open popup and search for 'dev'
```

---

### `profile validate`

Validate all profiles for common issues.

```bash
aws-profile-bridge profile validate
```

**Example**:
```bash
$ aws-profile-bridge profile validate
🔍 Validating AWS profiles...

   Found 5 profile(s)

⚠️  Warnings:
   • Profile 'prod-sso': Missing AccessKeyId (might need SSO login)

💡 Troubleshooting:
   • Verify AWS CLI installation: aws --version
   • Check file permissions: ls -la ~/.aws/
   • For SSO profiles: aws sso login --profile <name>
```

---

## Diagnose Commands

System diagnostics and troubleshooting.

### `diagnose health`

Check overall system health.

```bash
# Human-readable output
aws-profile-bridge diagnose health

# JSON output
aws-profile-bridge diagnose health --json
```

**Example**:
```bash
$ aws-profile-bridge diagnose health

🔍 AWS Profile Bridge - Health Check
============================================================

✅ Server: Server is running
✅ Config: Token configured
✅ Profiles: 5 profile(s) found
✅ Extension: Extension can connect

============================================================
✅ All systems operational!
```

---

### `diagnose verify`

Interactive setup verification.

```bash
aws-profile-bridge diagnose verify
```

**Example**:
```bash
$ aws-profile-bridge diagnose verify

🔍 AWS Profile Bridge - Setup Verification
============================================================

1️⃣  Checking AWS CLI...
   ✅ AWS CLI installed: aws-cli/2.15.0

2️⃣  Checking AWS profiles...
   ✅ Found 5 profile(s): dev, staging, prod

3️⃣  Checking API token...
   ✅ Token configured: awspc_K8mN...3hYh9E
      Format: New (awspc_..._...) ✓

4️⃣  Checking API server...
   ✅ Server running: ok

5️⃣  Checking browser extension...
   ℹ️  Manual check required:
      1. Open browser extension
      2. Verify profiles appear
      3. Test opening a profile

============================================================
✅ Setup verification complete - all systems ready!
```

---

### `diagnose env`

Show environment information.

```bash
aws-profile-bridge diagnose env
```

**Example**:
```bash
$ aws-profile-bridge diagnose env

🔍 Environment Information
============================================================

System:
   OS: Linux 5.15.0
   Python: 3.12.1
   Platform: Linux-5.15.0-x86_64

Paths:
   Config: /home/user/.aws/profile_bridge_config.json
   Logs: /home/user/.aws/logs/aws_profile_bridge_api.log
   AWS Config: ~/.aws/config
   AWS Credentials: ~/.aws/credentials

Settings:
   Host: 127.0.0.1
   Port: 10999
   Max Attempts: 10
   Window: 60s

File Status:
   Config file: ✅ (2.3 KB)
   Log file: ✅ (125.4 KB)
   AWS config: ✅ (1.8 KB)
   AWS credentials: ✅ (512 bytes)
```

---

## Cache Commands

Manage SSO and CLI caches.

### `cache show`

Show cache information.

```bash
# Human-readable output
aws-profile-bridge cache show

# JSON output
aws-profile-bridge cache show --json
```

**Example**:
```bash
$ aws-profile-bridge cache show

📦 Cache Information
============================================================

SSO Cache:
   Files: 3
   Location: /home/user/.aws/sso/cache
      • abc123def456.json              ✅ Active
      • xyz789ghi012.json              ❌ Expired
      • jkl345mno678.json              ✅ Active

CLI Cache:
   Files: 15
   Location: /home/user/.aws/cli/cache

💡 Clear cache: aws-profile-bridge cache clear --sso
```

---

### `cache clear`

Clear cached data.

```bash
# Clear SSO cache only
aws-profile-bridge cache clear --sso

# Clear all caches
aws-profile-bridge cache clear --all

# Skip confirmation
aws-profile-bridge cache clear --sso --force
```

**Example**:
```bash
$ aws-profile-bridge cache clear --sso
⚠️  Clear SSO cache? [y/N]: y
✅ Cleared: SSO cache (3 file(s))

💡 SSO profiles will need to re-login: aws sso login --profile <name>
```

---

### `cache refresh`

Refresh SSO session for a profile.

```bash
aws-profile-bridge cache refresh <profile-name>
```

**Example**:
```bash
$ aws-profile-bridge cache refresh prod-sso
🔄 Refreshing SSO session for profile: prod-sso
[Opens browser for SSO login...]

✅ SSO session refreshed successfully!
💡 Profile 'prod-sso' is now ready to use
```

---

## Config Commands

Manage configuration.

### `config show`

Show current configuration.

```bash
# Human-readable output
aws-profile-bridge config show

# JSON output
aws-profile-bridge config show --json

# Show full token (security risk!)
aws-profile-bridge config show --show-token
```

**Example**:
```bash
$ aws-profile-bridge config show

⚙️  Configuration
============================================================

File: /home/user/.aws/profile_bridge_config.json

API Token:
   awspc_K8mN...3hYh9E
   (Use --show-token to reveal full token)
   Format: ✅ New (awspc_...)

💡 Manage token: aws-profile-bridge token <command>
```

---

### `config get`

Get a configuration value.

```bash
aws-profile-bridge config get <key>
```

**Example**:
```bash
$ aws-profile-bridge config get api_token
awspc_K8mN...3hYh9E
(Use 'aws-profile-bridge token show' for full value)
```

---

### `config set`

Set a configuration value.

```bash
aws-profile-bridge config set <key> <value>
```

**Example**:
```bash
$ aws-profile-bridge config set custom_setting my_value
✅ Set custom_setting = my_value
```

**Note**: Cannot set `api_token` directly - use `token` commands instead.

---

### `config reset`

Reset configuration (deletes config file).

```bash
aws-profile-bridge config reset

# Skip confirmation
aws-profile-bridge config reset --force
```

**Example**:
```bash
$ aws-profile-bridge config reset
⚠️  This will delete your current configuration:
   File: /home/user/.aws/profile_bridge_config.json

⚠️  Your API token will be lost!
   The browser extension will need a new token.

Are you sure you want to reset? [y/N]: y
✅ Configuration reset successfully

📝 Next steps:
   1. Restart API server to generate new token
   2. Run: aws-profile-bridge token copy
   3. Update browser extension with new token
```

---

## Common Workflows

### First-Time Setup

```bash
# 1. Setup token
aws-profile-bridge token setup

# 2. Start server
aws-profile-bridge server start --daemon

# 3. Verify everything works
aws-profile-bridge diagnose verify

# 4. Copy token to extension
aws-profile-bridge token copy
```

---

### Daily Usage

```bash
# Start server
aws-profile-bridge server start --daemon

# Check status
aws-profile-bridge server status

# View logs if needed
aws-profile-bridge server logs -f
```

---

### Troubleshooting

```bash
# Health check
aws-profile-bridge diagnose health

# Verify setup
aws-profile-bridge diagnose verify

# Check environment
aws-profile-bridge diagnose env

# Validate profiles
aws-profile-bridge profile validate

# View logs
aws-profile-bridge server logs --level ERROR
```

---

### SSO Profile Management

```bash
# List profiles
aws-profile-bridge profile list --sso

# Check profile info
aws-profile-bridge profile info prod-sso

# Refresh SSO session
aws-profile-bridge cache refresh prod-sso

# Test profile
aws-profile-bridge profile test prod-sso
```

---

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | General error |

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `HOST` | `127.0.0.1` | Server bind host |
| `PORT` | `10999` | Server port |
| `ENV` | `production` | Environment (development/production) |

---

## Files

| File | Purpose |
|------|---------|
| `~/.aws/profile_bridge_config.json` | API token storage |
| `~/.aws/logs/aws_profile_bridge_api.log` | Server logs |
| `~/.aws/config` | AWS profiles configuration |
| `~/.aws/credentials` | AWS credentials |
| `~/.aws/sso/cache/*.json` | SSO session tokens |

---

## See Also

- [Token Format Proposal](./security/TOKEN_FORMAT_PROPOSAL.md)
- [Token Management Architecture](./architecture/TOKEN_MANAGEMENT_ARCHITECTURE.md)
- [Security Assessment](./security/SECURITY_ASSESSMENT.md)
- [Migration Guide](./security/TOKEN_MIGRATION_GUIDE.md)

---

**Version**: 2.0.0
**Last Updated**: 2025-11-18
