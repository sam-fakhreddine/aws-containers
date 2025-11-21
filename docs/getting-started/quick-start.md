# Quick Start Guide

Get AWS Profile Containers up and running in just a few minutes!

## Prerequisites

- Firefox browser (version 60 or later)
- AWS credentials configured in `~/.aws/credentials` or `~/.aws/config`
- Linux or macOS (Windows support coming soon)

## Installation

### Quick Install

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

The install script will automatically:
- Install uv (Python package manager) if needed
- Create Python 3.12 virtual environment
- Install API server dependencies
- Configure system service (systemd/launchd)
- Start and verify the API server

## Load the Extension in Firefox

1. Open Firefox and navigate to: `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Navigate to and select: `dist/manifest.json` in the project directory
4. The extension icon should appear in your toolbar

## First Use

1. **Click the extension icon** in your Firefox toolbar
2. **You should see your AWS profiles** - If not, check service status: `./scripts/manage.sh status`
3. **Select a region** from the dropdown (default: us-east-1)
4. **Click a profile** to open AWS Console in an isolated container

That's it! You're now using AWS Profile Containers.

## Managing the Service

```bash
# Check service status
./scripts/manage.sh status

# View live logs
./scripts/manage.sh logs

# Restart service
./scripts/manage.sh restart

# Interactive menu
./scripts/manage.sh
```

## What's Next?

- [Configure your profiles](../user-guide/profiles.md)
- [Learn about features](../user-guide/features.md)
- [Understand security](../security/overview.md)
- [Troubleshooting](../user-guide/troubleshooting.md) if something isn't working

## Need Help?

If you encounter issues:
1. Check service status: `./scripts/manage.sh status`
2. View logs: `./scripts/manage.sh logs`
3. Check the [Troubleshooting Guide](../user-guide/troubleshooting.md)
4. Restart service: `./scripts/manage.sh restart`
5. [Open an issue](https://github.com/sam-fakhreddine/aws-containers/issues) on GitHub
