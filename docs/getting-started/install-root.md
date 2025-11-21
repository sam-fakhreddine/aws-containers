# Installation Guide

AWS Profile Containers for Firefox - Comprehensive Installation Instructions

## Table of Contents

- [Quick Install (Recommended)](#quick-install-recommended)
- [Service Management](#service-management)
- [Development Installation](#development-installation)
- [Troubleshooting](#troubleshooting)

---

## Quick Install (Recommended)

For most users, this is the easiest installation method:

### Prerequisites

- Firefox browser
- Python 3.12+
- Node.js (v22.14.0+ or v24.10.0+)
- Yarn

### Steps

```bash
# Clone the repository
git clone https://github.com/sam-fakhreddine/aws-containers.git
cd aws-containers

# Install and start the API server
./scripts/manage.sh install

# Build the extension
yarn install
yarn build
```

The installation will:
1. ✓ Install uv (Python package manager) if needed
2. ✓ Create Python 3.12 virtual environment
3. ✓ Install API server dependencies
4. ✓ Configure system service (systemd/launchd)
5. ✓ Start the API server
6. ✓ Verify API is online

---

## Service Management

The `manage.sh` script provides complete service management:

### Interactive Menu (Default)

```bash
./scripts/manage.sh
```

Provides an interactive menu with options:
1. Install / Update
2. Uninstall
3. Status Check
4. Live Logs
5. Restart Service
6. Stop Service

### Command Line Usage

```bash
# Install or update the service
./scripts/manage.sh install

# Check service status
./scripts/manage.sh status

# View live logs
./scripts/manage.sh logs

# Restart the service
./scripts/manage.sh restart

# Stop the service
./scripts/manage.sh stop

# Start the service
./scripts/manage.sh start

# Uninstall completely
./scripts/manage.sh uninstall

# Show help
./scripts/manage.sh help
```

### Service Details

- **Service Name**: `aws-profile-bridge`
- **API Endpoint**: `http://localhost:10999`
- **Log File**: `~/.aws/logs/aws_profile_bridge_api.log`
- **Install Directory**: `~/.local/share/aws-profile-bridge`
- **Linux**: systemd user service
- **macOS**: launchd user agent

---

## Development Installation

For developers who want to modify the code:

### Prerequisites

- Firefox browser
- Python 3.12+
- Node.js (v22.14.0+ or v24.10.0+)
- Yarn

### Steps

```bash
# Clone the repository
git clone https://github.com/sam-fakhreddine/aws-containers.git
cd aws-containers

# Install and start API server
./scripts/manage.sh install

# Install Node dependencies
yarn install

# Build the extension
yarn build
```

### Development Workflow

1. Make changes to the code
2. Rebuild extension:
   ```bash
   yarn build
   ```
3. Restart API server if needed:
   ```bash
   ./scripts/manage.sh restart
   ```
4. Reload extension in Firefox (about:debugging)

### Viewing Logs During Development

```bash
# Live log tail
./scripts/manage.sh logs

# Or directly
tail -f ~/.aws/logs/aws_profile_bridge_api.log
```

---

## Loading the Extension in Firefox

After installation, you need to load the extension:

### Temporary Installation (for development/testing)

1. Open Firefox
2. Navigate to: `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Navigate to and select: `dist/manifest.json` in the project directory
5. The extension icon should appear in your toolbar

**Note:** Temporary extensions are removed when Firefox restarts.

### Permanent Installation

For permanent installation, you need to sign the extension:

1. Create an account on [addons.mozilla.org](https://addons.mozilla.org)
2. Submit the extension for signing
3. Install the signed `.xpi` file

---

## Verification

To verify the installation works:

1. Click the extension icon in Firefox toolbar
2. You should see a list of your AWS profiles from `~/.aws/credentials` and `~/.aws/config`
3. Click on a profile to open it in a container

If you see errors:
- Check service status:
  ```bash
  ./scripts/manage.sh status
  ```
- View logs:
  ```bash
  ./scripts/manage.sh logs
  ```
- Restart the service:
  ```bash
  ./scripts/manage.sh restart
  ```
- Check the browser console for errors (F12)

---

## Platform-Specific Notes

### Linux

- Service: systemd user service
- Service file: `~/.config/systemd/user/aws-profile-bridge.service`
- Install directory: `~/.local/share/aws-profile-bridge`
- Logs: `~/.aws/logs/aws_profile_bridge_api.log`

### macOS

- Service: launchd user agent
- Plist file: `~/Library/LaunchAgents/com.aws.profile-bridge.plist`
- Install directory: `~/.local/share/aws-profile-bridge`
- Logs: `~/.aws/logs/aws_profile_bridge_api.log`

### Windows

Windows support via WSL2 is planned for future releases.

---

## Troubleshooting

### API Not Responding

**Problem:** Extension can't connect to API server

**Solutions:**
1. Check service status:
   ```bash
   ./scripts/manage.sh status
   ```
2. View logs for errors:
   ```bash
   ./scripts/manage.sh logs
   ```
3. Restart the service:
   ```bash
   ./scripts/manage.sh restart
   ```
4. Verify API health:
   ```bash
   curl http://localhost:10999/health
   ```

### Service Won't Start

**Problem:** Service fails to start

**Solutions:**
1. Check if port 10999 is already in use:
   ```bash
   lsof -i :10999
   ```
2. View detailed logs:
   ```bash
   ./scripts/manage.sh logs
   ```
3. Reinstall the service:
   ```bash
   ./scripts/manage.sh uninstall
   ./scripts/manage.sh install
   ```

### Python Version Issues

**Problem:** Wrong Python version

**Solution:** The installer requires Python 3.12+. Install via:
- macOS: `brew install python@3.12`
- Linux: Use your package manager or pyenv

### No Profiles Shown

**Problem:** Extension loads but shows no profiles

**Possible causes:**
1. No AWS credentials configured
2. Credentials file in wrong location

**Solution:**
```bash
# Check if credentials file exists
ls -la ~/.aws/credentials

# Check if config file exists (for SSO profiles)
ls -la ~/.aws/config
```

If files don't exist, configure AWS CLI:
```bash
aws configure
```

### SSO Profiles Not Working

**Problem:** SSO profiles show as expired

**Solution:** Log in to SSO:
```bash
aws sso login --profile <profile-name>
```

---

## Uninstallation

To remove the extension:

1. Uninstall the API service:
   ```bash
   ./scripts/manage.sh uninstall
   ```
2. Remove from Firefox (about:addons)
3. Remove containers (optional):
   - Click "Clear Containers" in the extension

---

## Support

For issues, feature requests, or questions:
- GitHub Issues: https://github.com/sam-fakhreddine/aws-containers/issues
- Documentation: See README.md
- Security: See SECURITY.md

---

## Next Steps

After installation:
1. Read the [Quick Start Guide](QUICKSTART.md)
2. Review [Security Documentation](SECURITY.md)
3. Check out the [README](README.md) for features and usage
