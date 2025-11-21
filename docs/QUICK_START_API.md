# Quick Start Guide - API Mode

This guide will get you up and running with the AWS Profile Containers extension using the HTTP API server.

## Prerequisites

- **Firefox** (latest version)
- **Python 3.12+**
- **Node.js 22.14.0+** or **24.10.0+**
- **Yarn** package manager

## Installation Steps

### 1. Clone Repository

```bash
git clone https://github.com/sam-fakhreddine/aws-containers.git
cd aws-containers
```

### 2. Install API Server

```bash
./scripts/manage.sh install
```

This will:
- ✅ Check Python version (requires 3.12+)
- ✅ Install Python dependencies (FastAPI, boto3, uvicorn)
- ✅ Create system service (systemd/launchd)
- ✅ Start API server on `http://127.0.0.1:10999`
- ✅ Verify server is running

### 3. Build Extension

```bash
# Install Node dependencies
yarn install

# Build extension
yarn build
```

### 4. Load Extension in Firefox

1. Open Firefox
2. Navigate to: `about:debugging#/runtime/this-firefox`
3. Click **"Load Temporary Add-on"**
4. Navigate to project directory
5. Select: `dist/manifest.json`
6. Extension icon should appear in toolbar

### 5. Verify Installation

1. Click extension icon in Firefox toolbar
2. You should see your AWS profiles listed
3. If you see "API Server Not Running", check troubleshooting below

## Verify API Server

### Check Health

```bash
curl http://localhost:10999/health
```

Expected response:
```json
{
  "status": "healthy",
  "version": "2.0.0",
  "uptime_seconds": 123.45,
  "python_version": "3.12.3"
}
```

### Check Profiles

```bash
curl -X POST http://localhost:10999/profiles
```

Should return your AWS profiles.

## Managing the API Server

### Linux (systemd)

```bash
# Status
systemctl --user status aws-profile-bridge

# Start
systemctl --user start aws-profile-bridge

# Stop
systemctl --user stop aws-profile-bridge

# Restart
systemctl --user restart aws-profile-bridge

# Enable auto-start on login
systemctl --user enable aws-profile-bridge

# View logs
journalctl --user -u aws-profile-bridge -f
```

### macOS (launchd)

```bash
# Status
launchctl list | grep aws-profile-bridge

# Start
launchctl load ~/Library/LaunchAgents/com.aws.profile-bridge.plist

# Stop
launchctl unload ~/Library/LaunchAgents/com.aws.profile-bridge.plist

# View logs
tail -f ~/.aws/logs/aws_profile_bridge_api.log
```

### Manual (Development)

```bash
# Production mode
python -m aws_profile_bridge api

# Development mode (with hot reload)
ENV=development python -m aws_profile_bridge api
```

## Troubleshooting

### "API Server Not Running" in Extension

**Check if server is running:**
```bash
curl http://localhost:10999/health
```

**If not running, start it:**
```bash
# Linux
systemctl --user start aws-profile-bridge

# macOS
launchctl load ~/Library/LaunchAgents/com.aws.profile-bridge.plist

# Manual
python -m aws_profile_bridge api
```

### Python Version Too Old

**Check version:**
```bash
python3 --version
```

**Must be 3.12 or higher.** Install newer Python:

**macOS:**
```bash
brew install python@3.12
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install python3.12
```

### Port 10999 Already in Use

**Find process:**
```bash
lsof -i :10999
```

**Kill process:**
```bash
kill -9 <PID>
```

**Or change port:**
1. Edit `api-server/src/aws_profile_bridge/api_server.py`:
   ```python
   PORT: int = 11000  # Change this
   ```
2. Edit `src/services/apiClient.ts`:
   ```typescript
   const API_BASE_URL = "http://127.0.0.1:11000";
   ```
3. Rebuild: `yarn build`

### No AWS Profiles Found

**Check credentials file:**
```bash
cat ~/.aws/credentials
```

**Check config file:**
```bash
cat ~/.aws/config
```

**Ensure files exist and have correct format.**

### API Server Crashes

**View logs:**
```bash
# Linux
journalctl --user -u aws-profile-bridge -n 50

# macOS
tail -50 ~/.aws/logs/aws_profile_bridge_api.log
```

**Common issues:**
- Missing Python dependencies: `pip install -e api-server/`
- Permission issues: Check `~/.aws/` directory permissions
- Corrupted credentials file: Validate JSON/INI format

## Development Workflow

### 1. Make Changes to Extension

```bash
# Edit files in src/
vim src/popup/awsProfiles.tsx

# Rebuild
yarn build

# Reload extension in Firefox
# Go to about:debugging → Click "Reload"
```

### 2. Make Changes to API Server

```bash
# Edit files in api-server/src/
vim api-server/src/aws_profile_bridge/api_server.py

# Restart server
systemctl --user restart aws-profile-bridge  # Linux
# or
launchctl unload ~/Library/LaunchAgents/com.aws.profile-bridge.plist  # macOS
launchctl load ~/Library/LaunchAgents/com.aws.profile-bridge.plist
```

### 3. Run Tests

```bash
# Extension tests
yarn test

# API server tests
cd api-server
pytest -v
```

### 4. Development Mode (Hot Reload)

**Extension:**
```bash
yarn dev
# Opens Firefox with auto-reload on changes
```

**API Server:**
```bash
ENV=development python -m aws_profile_bridge api
# Auto-reloads on Python file changes
```

## File Locations

| Component | Location |
|-----------|----------|
| Extension source | `./src/` |
| Built extension | `./dist/` |
| API server source | `./api-server/src/` |
| API logs | `~/.aws/logs/aws_profile_bridge_api.log` |
| Service config (Linux) | `~/.config/systemd/user/aws-profile-bridge.service` |
| Service config (macOS) | `~/Library/LaunchAgents/com.aws.profile-bridge.plist` |
| AWS credentials | `~/.aws/credentials` |
| AWS config | `~/.aws/config` |

## API Endpoints Reference

| Endpoint | Method | Description | Speed |
|----------|--------|-------------|-------|
| `/health` | GET | Health check | < 1ms |
| `/version` | GET | Version info | < 1ms |
| `/profiles` | POST | Get profiles (fast) | ~100ms |
| `/profiles/enrich` | POST | Get profiles with SSO | 2-10s |
| `/profiles/{name}/console-url` | POST | Get console URL | 1-3s |

## Next Steps

- Read [API Migration Guide](./API_MIGRATION.md) for architecture details
- Read [API Server README](../api-server/API_SERVER_README.md) for server details
- Check [Security Documentation](./security/security-root.md) for security info
- See [Contributing Guide](./development/contributing.md) to contribute

## Getting Help

1. Check logs: `tail -f ~/.aws/logs/aws_profile_bridge_api.log`
2. Test API: `curl http://localhost:10999/health`
3. Check browser console: Firefox DevTools → Console
4. Open issue: [GitHub Issues](https://github.com/sam-fakhreddine/aws-containers/issues)
