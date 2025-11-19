# Installation Guide

AWS Profile Containers for Firefox - Comprehensive Installation Instructions

## Table of Contents

- [Quick Install (Recommended)](#quick-install-recommended)
- [Self-Contained Installation (No Python Required)](#self-contained-installation-no-python-required)
- [Development Installation](#development-installation)
- [Troubleshooting](#troubleshooting)

---

## Quick Install (Recommended)

For most users, this is the easiest installation method:

### Prerequisites

- Firefox browser
- Node.js (v22.14.0+ or v24.10.0+)
- npm

### Steps

```bash
# Clone the repository
git clone https://github.com/sam-fakhreddine/aws-containers.git
cd aws-containers

# Run the installation script
./install.sh
```

The install script will:
1. ✓ Check for pre-built executables (no Python needed)
2. ✓ Fall back to Python script if needed
3. ✓ Install native messaging host
4. ✓ Build the Firefox extension
5. ✓ Configure everything for you

**Note:** If you don't have Python installed and want a self-contained installation, see the next section.

---

## Self-Contained Installation (No Python Required)

This method creates a standalone executable that includes Python and all dependencies. **Perfect for distribution to end users who don't have Python installed.**

### For End Users (Download from Releases)

1. Download the pre-built package for your platform from [GitHub Releases](https://github.com/sam-fakhreddine/aws-containers/releases):
   - ✅ `aws_profile_bridge-linux` for Linux
   - ✅ `aws_profile_bridge-macos-intel` for macOS Intel (x86_64) - *Unsigned*
   - ✅ `aws_profile_bridge-macos-arm64` for macOS Apple Silicon (M1/M2/M3) - *Unsigned*

2. Make the downloaded file executable and place it in the `bin/` directory:
   ```bash
   # For Linux
   mkdir -p bin/linux
   mv ~/Downloads/aws_profile_bridge-linux bin/linux/aws_profile_bridge
   chmod +x bin/linux/aws_profile_bridge

   # For macOS Intel (x86_64)
   mkdir -p bin/darwin-x86_64
   mv ~/Downloads/aws_profile_bridge-macos-intel bin/darwin-x86_64/aws_profile_bridge
   chmod +x bin/darwin-x86_64/aws_profile_bridge
   # Remove quarantine flag (macOS only)
   xattr -d com.apple.quarantine bin/darwin-x86_64/aws_profile_bridge 2>/dev/null || true

   # For macOS Apple Silicon (ARM64)
   mkdir -p bin/darwin-arm64
   mv ~/Downloads/aws_profile_bridge-macos-arm64 bin/darwin-arm64/aws_profile_bridge
   chmod +x bin/darwin-arm64/aws_profile_bridge
   # Remove quarantine flag (macOS only)
   xattr -d com.apple.quarantine bin/darwin-arm64/aws_profile_bridge 2>/dev/null || true
   ```

   **Note for macOS users:** Binaries are currently **unsigned**. You'll need to bypass Gatekeeper (see Platform-Specific Notes below). Code signing coming soon!

3. Run the installation script:
   ```bash
   ./install.sh
   ```

### For Developers (Build from Source)

If you want to build the standalone executable yourself (works on Linux and macOS):

#### Prerequisites

- Python 3.8+ (only needed to build the executable, not to run it)
- pip

#### Steps

```bash
# Build the standalone executable
./build-native-host.sh
```

This will:
- Create a virtual environment
- Install PyInstaller and dependencies
- Build a standalone executable in `bin/<platform>/`
  - Linux: `bin/linux/aws_profile_bridge`
  - macOS Intel: `bin/darwin-x86_64/aws_profile_bridge`
  - macOS ARM64: `bin/darwin-arm64/aws_profile_bridge`
- The executable is ~15-20MB and includes:
  - ✓ Python runtime
  - ✓ boto3 library
  - ✓ botocore library
  - ✓ All required dependencies

**macOS Note:** Building from source works! Pre-built binaries are available in releases (unsigned - code signing optional for now).

```bash
# Install everything (uses the newly built executable)
./install.sh
```

**Benefits:**
- ✅ No Python required on end-user systems
- ✅ No dependency issues
- ✅ Single binary to distribute
- ✅ Works offline (all dependencies bundled)
- ✅ Consistent behavior across systems

---

## Development Installation

For developers who want to modify the code:

### Prerequisites

- Firefox browser
- Node.js (v22.14.0+ or v24.10.0+)
- npm
- Python 3.8+ (for native messaging host)
- pip (Python package manager)

### Steps

```bash
# Clone the repository
git clone https://github.com/sam-fakhreddine/aws-containers.git
cd aws-containers

# Install Python dependencies (optional, for better SSO support)
pip install -r api-server/requirements.txt

# Install Node dependencies
npm install

# Build the extension
npm run build

# Install native messaging host
./install.sh
```

### Development Workflow

1. Make changes to the code
2. Rebuild:
   ```bash
   npm run build
   ```
3. Reload extension in Firefox (about:debugging)

### Building Standalone Executable for Testing

```bash
./build-native-host.sh
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

If you see "Setup Required":
- Check that native messaging host is installed:
  ```bash
  ls -la ~/.local/bin/aws_profile_bridge*
  ```
- Check the manifest:
  ```bash
  cat ~/.mozilla/api-server-hosts/aws_profile_bridge.json
  ```
- Restart Firefox
- Check the browser console for errors (F12)

---

## Platform-Specific Notes

### Linux

- Native messaging host directory: `~/.mozilla/api-server-hosts/`
- Executable location: `~/.local/bin/`

### macOS

- Native messaging host directory: `~/Library/Application Support/Mozilla/NativeMessagingHosts/`
- Executable location: `~/.local/bin/`
- **Architectures:**
  - Intel Macs (x86_64): Use `aws_profile_bridge-macos-intel`
  - Apple Silicon (M1/M2/M3): Use `aws_profile_bridge-macos-arm64`
  - The install script automatically detects your architecture

**Bypassing Gatekeeper for Unsigned Binaries:**

Since the macOS binaries are currently unsigned, you'll need to bypass Gatekeeper:

1. **Remove quarantine flag:**
   ```bash
   xattr -d com.apple.quarantine ~/.local/bin/aws_profile_bridge
   ```

2. **If you still get "unidentified developer" warnings:**
   - Right-click the executable in Finder
   - Select "Open"
   - Click "Open" in the security dialog

3. **Alternative: Allow in System Settings:**
   - System Settings → Privacy & Security
   - Scroll to "Security" section
   - Click "Allow Anyway" next to the blocked executable

**Note:** Code signing will be added in a future release to eliminate these steps.

### Windows

Windows support is planned for future releases.

---

## Troubleshooting

### "Setup Required" Error

**Problem:** Extension shows "Setup Required" message

**Solutions:**
1. Restart Firefox
2. Check native messaging host is installed:
   ```bash
   ls -la ~/.local/bin/aws_profile_bridge*
   ```
3. Check manifest exists and has correct path:
   ```bash
   cat ~/.mozilla/api-server-hosts/aws_profile_bridge.json
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

### Python Not Found (when using Python script)

**Problem:** Install script says Python not found

**Solutions:**
1. **Recommended:** Use standalone executable:
   ```bash
   ./build-native-host.sh
   ./install.sh
   ```
2. **Or** install Python 3.8+

### boto3 Import Error

**Problem:** Native messaging host can't import boto3

**Solution:** Install Python dependencies:
```bash
pip install -r api-server/requirements.txt
```

**Or** use standalone executable (recommended):
```bash
./build-native-host.sh
./install.sh
```

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

1. Remove from Firefox (about:addons)
2. Remove native messaging host:
   ```bash
   rm ~/.local/bin/aws_profile_bridge*
   rm ~/.mozilla/api-server-hosts/aws_profile_bridge.json
   # Or for macOS:
   # rm ~/Library/Application\ Support/Mozilla/NativeMessagingHosts/aws_profile_bridge.json
   ```
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
