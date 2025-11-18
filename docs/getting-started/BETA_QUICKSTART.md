# AWS Profile Containers - Beta Testing Quick Start

**Version:** 0.1.0 (Beta)  
**Last Updated:** 2024

## What Is This?

A Firefox extension that reads your AWS credentials and opens each profile in an isolated container with automatic AWS Console federation. No more manual copy-paste of credentials or switching between accounts.

## Prerequisites

- **Firefox** (latest version)
- **Python 3.12+**
- **macOS or Linux** (Windows not supported yet)
- **AWS credentials** in `~/.aws/credentials` or `~/.aws/config`

## Installation (5 Minutes)

### Step 1: Clone the Repository

```bash
git clone https://github.com/sam-fakhreddine/aws-containers.git
cd aws-containers
```

### Step 2: Install API Server

```bash
./scripts/install-api-service.sh
```

This installs:
- Python dependencies via `uv`
- FastAPI server on `http://localhost:10999`
- System service (auto-starts on boot)
- API token in `~/.aws/profile_bridge_config.json`

### Step 3: Build Extension

```bash
yarn install
yarn build
```

### Step 4: Load Extension in Firefox

1. Open Firefox → `about:debugging#/runtime/this-firefox`
2. Click **"Load Temporary Add-on"**
3. Select: `dist/manifest.json`
4. Extension icon appears in toolbar

### Step 5: Configure API Token

```bash
# Get your API token
cat ~/.aws/profile_bridge_config.json
```

In Firefox:
1. Click extension icon
2. Click ⚙️ (settings) in top right
3. Paste the `api_token` value
4. Click **"Save Token"**
5. Click **"Test Connection"** (should show ✅)

## First Use

1. **Click extension icon** in toolbar
2. **See your profiles** listed automatically
3. **Select region** (default: us-east-1)
4. **Click any profile** → AWS Console opens in isolated container

## Features to Test

### ✅ Core Functionality
- [ ] Profiles load from `~/.aws/credentials`
- [ ] SSO profiles load from `~/.aws/config`
- [ ] Click profile → Console opens in container
- [ ] Each profile gets unique container color
- [ ] Credential expiration shows correctly

### ✅ Search & Organization
- [ ] Search box filters profiles
- [ ] Star profiles → appear in Favorites section
- [ ] Recent profiles tracked (last 10)
- [ ] Profiles sorted alphabetically

### ✅ Region Selection
- [ ] Region dropdown works
- [ ] Selected region persists
- [ ] Console opens in correct region

### ✅ Container Management
- [ ] Switch to "Containers" tab
- [ ] See active containers
- [ ] "Clear All Containers" works

### ✅ SSO Support
- [ ] SSO profiles show "SSO" badge
- [ ] SSO token expiration tracked
- [ ] `aws sso login` refreshes tokens
- [ ] Create `~/.aws/.nosso` to disable SSO

## Known Issues

### API Server Not Running

**Symptom:** Extension shows "API Server Not Running"

**Fix:**
```bash
# Check status
systemctl --user status aws-profile-bridge  # Linux
launchctl list | grep aws-profile-bridge     # macOS

# Restart
systemctl --user restart aws-profile-bridge  # Linux
launchctl bootout gui/$(id -u)/com.aws.profile-bridge && \
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.aws.profile-bridge.plist  # macOS
```

### No Profiles Showing

**Fix:**
```bash
# Verify credentials file
cat ~/.aws/credentials | grep '^\['

# Check API logs
tail -f ~/.aws/logs/aws_profile_bridge_api.log
```

### SSO Profile Expired

**Fix:**
```bash
aws sso login --profile <profile-name>
```

## Testing Checklist

### Basic Flow
- [ ] Install completes without errors
- [ ] Extension loads in Firefox
- [ ] API token configuration works
- [ ] Profiles appear in popup
- [ ] Click profile → Console opens
- [ ] Container isolation works (check Firefox containers)

### Credential Types
- [ ] Static credentials (access key + secret)
- [ ] Temporary credentials (with session token)
- [ ] SSO profiles (after `aws sso login`)
- [ ] Expired credentials show warning

### Edge Cases
- [ ] Empty credentials file
- [ ] Malformed credentials
- [ ] Network disconnected
- [ ] API server stopped
- [ ] Invalid API token

### Performance
- [ ] Popup opens quickly (<500ms)
- [ ] Profile list loads fast (<1s)
- [ ] Search is responsive
- [ ] Console opens within 2-3 seconds

## Reporting Issues

When reporting bugs, include:

1. **What you did** (steps to reproduce)
2. **What happened** (actual behavior)
3. **What you expected** (expected behavior)
4. **Logs:**
   ```bash
   # API server logs
   tail -n 50 ~/.aws/logs/aws_profile_bridge_api.log
   
   # Firefox console
   # about:debugging → Inspect → Console tab
   ```
5. **Environment:**
   - OS: macOS/Linux version
   - Firefox version
   - Python version: `python3 --version`

## Useful Commands

```bash
# Check API server health
curl http://localhost:10999/health

# View API logs
tail -f ~/.aws/logs/aws_profile_bridge_api.log

# Rebuild extension after changes
yarn build
# Then reload in about:debugging

# Restart API server
systemctl --user restart aws-profile-bridge  # Linux
launchctl bootout gui/$(id -u)/com.aws.profile-bridge && \
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.aws.profile-bridge.plist  # macOS

# Manual API server (for debugging)
cd api-server
uv run python -m aws_profile_bridge api
```

## File Locations

| Item | Location |
|------|----------|
| Extension | `./dist/` |
| API Server | `~/.local/share/aws-profile-bridge/venv` |
| API Logs | `~/.aws/logs/aws_profile_bridge_api.log` |
| API Token | `~/.aws/profile_bridge_config.json` |
| Service (Linux) | `~/.config/systemd/user/aws-profile-bridge.service` |
| Service (macOS) | `~/Library/LaunchAgents/com.aws.profile-bridge.plist` |
| AWS Credentials | `~/.aws/credentials` |
| AWS Config | `~/.aws/config` |
| SSO Cache | `~/.aws/sso/cache/` |

## Security Notes

- ✅ Credentials read from local filesystem only
- ✅ API server binds to localhost (127.0.0.1) only
- ✅ Token-based authentication required
- ✅ Credentials sent only to AWS Federation API (HTTPS)
- ❌ No credentials stored in browser
- ❌ No telemetry or tracking

## Getting Help

1. Check [README.md](../README.md) for detailed docs
2. Check [Troubleshooting](user-guide/troubleshooting.md)
3. Check API logs: `tail -f ~/.aws/logs/aws_profile_bridge_api.log`
4. Check Firefox console: `about:debugging` → Inspect
5. Open GitHub issue with logs

## What to Focus On

As a beta tester, please focus on:

1. **Installation experience** - Was it smooth? Any errors?
2. **Daily workflow** - Does it fit your AWS workflow?
3. **Performance** - Is it fast enough?
4. **Reliability** - Any crashes or hangs?
5. **UX/UI** - Is it intuitive? Any confusion?
6. **Edge cases** - Unusual credential setups, network issues, etc.

## Thank You!

Your feedback helps make this tool better for everyone. Please be thorough and honest in your testing.

**Happy testing! 🚀**
