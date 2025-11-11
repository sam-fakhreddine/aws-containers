# Installation Guide

Comprehensive installation instructions for AWS Profile Containers.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Install](#quick-install-recommended)
- [Self-Contained Installation (No Python)](#self-contained-installation-no-python-required)
- [Development Installation](#development-installation)
- [Loading the Extension](#loading-the-extension-in-firefox)
- [Platform-Specific Notes](#platform-specific-notes)
- [Troubleshooting](#troubleshooting)
- [Uninstallation](#uninstallation)

## Prerequisites

### Required
- Firefox browser (version 60+)
- Linux or macOS operating system
- AWS credentials configured (`~/.aws/credentials` or `~/.aws/config`)

### Optional
- Node.js (v16 or later) - for building from source
- Python 3.8+ - only if not using pre-built executables
- AWS CLI - for SSO profile management

## Quick Install (Recommended)

This is the easiest installation method for most users:

```bash
# Clone the repository
git clone https://github.com/sam-fakhreddine/aws-containers.git
cd aws-containers

# Run the installation script
./install.sh
```

The install script will automatically:
1. Check for pre-built executables in `bin/` directory
2. Fall back to Python script if no executable found
3. Install native messaging host to `~/.local/bin/`
4. Configure native messaging manifest
5. Build the Firefox extension to `dist/`

## Self-Contained Installation (No Python Required)

Perfect for end users who don't have Python installed.

### Download Pre-Built Binary

Download the appropriate pre-built executable for your platform from [GitHub Releases](https://github.com/sam-fakhreddine/aws-containers/releases):

- `aws_profile_bridge-linux` for Linux
- `aws_profile_bridge-macos-intel` for macOS Intel (x86_64)
- `aws_profile_bridge-macos-arm64` for macOS Apple Silicon (M1/M2/M3)

#### For Linux:

```bash
mkdir -p bin/linux
mv ~/Downloads/aws_profile_bridge-linux bin/linux/aws_profile_bridge
chmod +x bin/linux/aws_profile_bridge
./install.sh
```

#### For macOS Intel:

```bash
mkdir -p bin/darwin-x86_64
mv ~/Downloads/aws_profile_bridge-macos-intel bin/darwin-x86_64/aws_profile_bridge
chmod +x bin/darwin-x86_64/aws_profile_bridge
# Remove quarantine flag (macOS only)
xattr -d com.apple.quarantine bin/darwin-x86_64/aws_profile_bridge 2>/dev/null || true
./install.sh
```

#### For macOS Apple Silicon:

```bash
mkdir -p bin/darwin-arm64
mv ~/Downloads/aws_profile_bridge-macos-arm64 bin/darwin-arm64/aws_profile_bridge
chmod +x bin/darwin-arm64/aws_profile_bridge
# Remove quarantine flag (macOS only)
xattr -d com.apple.quarantine bin/darwin-arm64/aws_profile_bridge 2>/dev/null || true
./install.sh
```

**Note for macOS users:** Binaries are currently unsigned. See [macOS-specific notes](#macos) for Gatekeeper bypass instructions.

### Build Your Own Executable

If you prefer to build the standalone executable yourself:

```bash
# Build the standalone executable
./build-native-host.sh

# Install everything
./install.sh
```

This creates a ~15-20MB standalone binary that includes:
- Python runtime
- boto3 & botocore libraries
- All required dependencies

**Benefits:**
- No Python required on end-user systems
- No dependency management issues
- Single binary to distribute
- Works offline
- Consistent behavior across systems

## Development Installation

For developers who want to modify the code:

```bash
# Clone the repository
git clone https://github.com/sam-fakhreddine/aws-containers.git
cd aws-containers

# Install Python dependencies (optional, for better SSO support)
pip install -r native-messaging/requirements.txt

# Install Node dependencies
npm install

# Build the extension
npm run build

# Install native messaging host
./install.sh
```

### Development Workflow

1. Make changes to source code
2. Rebuild:
   ```bash
   npm run build
   ```
3. Reload extension in Firefox (about:debugging → Reload)

For watch mode during development:
```bash
npm run dev
```

## Loading the Extension in Firefox

### Temporary Installation (Development/Testing)

1. Open Firefox
2. Navigate to: `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Select: `dist/manifest.json` in the project directory
5. The extension icon appears in your toolbar

**Note:** Temporary extensions are removed when Firefox restarts.

### Permanent Installation

For permanent installation, the extension must be signed:

1. Create account on [addons.mozilla.org](https://addons.mozilla.org)
2. Submit extension for signing
3. Install the signed `.xpi` file

## Verification

Verify the installation is working:

1. Click the extension icon in Firefox toolbar
2. You should see your AWS profiles from `~/.aws/credentials` and `~/.aws/config`
3. Click a profile to open it in a container

If you see "Setup Required":
```bash
# Check native messaging host is installed
ls -la ~/.local/bin/aws_profile_bridge*

# Check the manifest
cat ~/.mozilla/native-messaging-hosts/aws_profile_bridge.json
# Or on macOS:
cat ~/Library/Application\ Support/Mozilla/NativeMessagingHosts/aws_profile_bridge.json

# Restart Firefox
# Check browser console for errors (F12)
```

## Platform-Specific Notes

### Linux

- Native messaging host directory: `~/.mozilla/native-messaging-hosts/`
- Executable location: `~/.local/bin/`
- Binary: `bin/linux/aws_profile_bridge`

### macOS

- Native messaging host directory: `~/Library/Application Support/Mozilla/NativeMessagingHosts/`
- Executable location: `~/.local/bin/`
- Architectures:
  - Intel Macs (x86_64): `bin/darwin-x86_64/aws_profile_bridge`
  - Apple Silicon (M1/M2/M3): `bin/darwin-arm64/aws_profile_bridge`

#### Bypassing Gatekeeper for Unsigned Binaries

Since macOS binaries are currently unsigned, you need to bypass Gatekeeper:

**Option 1: Remove quarantine flag**
```bash
xattr -d com.apple.quarantine ~/.local/bin/aws_profile_bridge
```

**Option 2: System Settings**
1. System Settings → Privacy & Security
2. Scroll to "Security" section
3. Click "Allow Anyway" next to the blocked executable

**Option 3: Right-click method**
1. Right-click the executable in Finder
2. Select "Open"
3. Click "Open" in the security dialog

### Windows

Windows support is planned but not currently implemented. Required changes:
- PowerShell installation script (`install.ps1`)
- Python wrapper batch file (`aws_profile_bridge.bat`)
- Different manifest paths (`%APPDATA%\Mozilla\NativeMessagingHosts\`)

## Troubleshooting

### "Setup Required" Error

**Problem:** Extension shows "Setup Required" message

**Solutions:**
1. Restart Firefox
2. Check native messaging host is installed:
   ```bash
   ls -la ~/.local/bin/aws_profile_bridge*
   ```
3. Check manifest has correct path:
   ```bash
   cat ~/.mozilla/native-messaging-hosts/aws_profile_bridge.json
   ```
4. Rebuild and reinstall:
   ```bash
   ./build-native-host.sh
   ./install.sh
   ```

### Permission Denied

**Problem:** Native messaging host can't execute

**Solution:**
```bash
chmod +x ~/.local/bin/aws_profile_bridge
```

### Python Not Found

**Problem:** Install script says Python not found

**Solutions:**
1. Use standalone executable (recommended):
   ```bash
   ./build-native-host.sh
   ./install.sh
   ```
2. Or install Python 3.8+

### boto3 Import Error

**Problem:** Native messaging host can't import boto3

**Solutions:**
1. Install Python dependencies:
   ```bash
   pip install -r native-messaging/requirements.txt
   ```
2. Or use standalone executable (recommended):
   ```bash
   ./build-native-host.sh
   ./install.sh
   ```

### No Profiles Shown

**Problem:** Extension loads but shows no profiles

**Solutions:**
1. Check if credentials file exists:
   ```bash
   ls -la ~/.aws/credentials
   ls -la ~/.aws/config
   ```
2. If files don't exist, configure AWS CLI:
   ```bash
   aws configure
   ```

### SSO Profiles Not Working

**Problem:** SSO profiles show as expired

**Solution:** Log in to SSO:
```bash
aws sso login --profile <profile-name>
```

## Uninstallation

To completely remove the extension:

1. Remove from Firefox (about:addons)
2. Remove native messaging host:
   ```bash
   rm ~/.local/bin/aws_profile_bridge*
   rm ~/.mozilla/native-messaging-hosts/aws_profile_bridge.json
   # Or for macOS:
   # rm ~/Library/Application\ Support/Mozilla/NativeMessagingHosts/aws_profile_bridge.json
   ```
3. Optional: Clear containers using the extension before removing

## Next Steps

After successful installation:
- [First Steps Guide](first-steps.md)
- [User Guide](../user-guide/usage.md)
- [Security Documentation](../security/overview.md)
