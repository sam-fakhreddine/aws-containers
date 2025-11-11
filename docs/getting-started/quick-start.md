# Quick Start Guide

Get AWS Profile Containers up and running in just a few minutes!

## Prerequisites

- Firefox browser (version 60 or later)
- AWS credentials configured in `~/.aws/credentials` or `~/.aws/config`
- Linux or macOS (Windows support coming soon)

## Installation

### Option 1: Quick Install (Recommended)

```bash
# Clone the repository
git clone https://github.com/sam-fakhreddine/aws-containers.git
cd aws-containers

# Run the installation script
./install.sh
```

The install script will automatically:
- Check for pre-built executables (no Python needed!)
- Fall back to Python script if needed
- Install the native messaging host
- Build the Firefox extension
- Configure everything for you

### Option 2: Download Pre-Built Release

1. Download the latest release from [GitHub Releases](https://github.com/sam-fakhreddine/aws-containers/releases)
2. Extract and run `./install.sh`

## Load the Extension in Firefox

1. Open Firefox and navigate to: `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Navigate to and select: `dist/manifest.json` in the project directory
4. The extension icon should appear in your toolbar

## First Use

1. **Click the extension icon** in your Firefox toolbar
2. **You should see your AWS profiles** - If you see "Setup Required", restart Firefox and try again
3. **Select a region** from the dropdown (default: us-east-1)
4. **Click a profile** to open AWS Console in an isolated container

That's it! You're now using AWS Profile Containers.

## What's Next?

- [Configure your profiles](../user-guide/profiles.md)
- [Learn about features](../user-guide/features.md)
- [Understand security](../security/overview.md)
- [Troubleshooting](../user-guide/troubleshooting.md) if something isn't working

## Need Help?

If you encounter issues:
1. Check the [Troubleshooting Guide](../user-guide/troubleshooting.md)
2. Restart Firefox
3. Check the [Installation Guide](installation.md) for detailed steps
4. [Open an issue](https://github.com/sam-fakhreddine/aws-containers/issues) on GitHub
