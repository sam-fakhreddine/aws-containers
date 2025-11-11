# AWS Profile Containers

A Firefox extension that reads your AWS credentials file and opens AWS profiles in separate isolated containers with automatic AWS Console federation.

## ⚠️ Security Notice

**This extension reads sensitive AWS credentials from your local filesystem.**

- ✅ **Read** `~/.aws/credentials` (local only)
- ✅ **Calls** AWS Federation API (official AWS service)
- ❌ **Never stores** credentials in browser storage
- ❌ **Never transmits** credentials to any server except AWS
- 📖 **[Read full security documentation](SECURITY.md)** before installing

## Features

### Core Functionality
- 🔐 **AWS Console Federation**: Automatically generates authenticated console URLs
- 🔒 **Container Isolation**: Each AWS profile opens in its own Firefox container
- 📁 **Automatic Profile Detection**: Reads profiles from `~/.aws/credentials` and `~/.aws/config`
- 🔑 **AWS IAM Identity Center (SSO)**: Full support for SSO profiles
- ⏰ **Credential Monitoring**: Shows credential expiration status for both credential-based and SSO profiles
- 🌍 **Region Selector**: Choose AWS region before opening console
- 🚀 **Automated Builds**: GitHub Actions workflow for building releases

### UX Enhancements
- 🔍 **Search/Filter**: Quick profile search as you type
- ⭐ **Favorites**: Star frequently-used profiles
- 🕐 **Recent Profiles**: Tracks your last 10 opened profiles
- 📊 **Smart Organization**: Profiles grouped by Favorites → Recent → All
- 🎨 **Smart Color Coding**: Automatically assigns colors based on environment
  - Production profiles → Red
  - Staging profiles → Yellow
  - Development profiles → Green
  - Test/QA profiles → Turquoise
  - Integration profiles → Blue
  - Janus profiles → Purple

## How It Works

```
┌──────────────────────────────────────────────────────────┐
│ 1. User clicks profile in Firefox extension popup       │
└────────────────────┬─────────────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────────────┐
│ 2. Extension → Python Bridge (Native Messaging)         │
│    Sends: Profile name only                             │
└────────────────────┬─────────────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────────────┐
│ 3. Python Bridge reads ~/.aws/credentials               │
│    Extracts: access key, secret key, session token      │
└────────────────────┬─────────────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────────────┐
│ 4. Python Bridge → AWS Federation API (HTTPS)           │
│    Endpoint: signin.aws.amazon.com/federation            │
│    Returns: Temporary signin token (12 hour expiry)     │
└────────────────────┬─────────────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────────────┐
│ 5. Python Bridge → Extension                            │
│    Sends: Federated console URL (no raw credentials)    │
└────────────────────┬─────────────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────────────┐
│ 6. Extension creates/finds Firefox container            │
│    Opens: Console URL in isolated container             │
│    Result: Authenticated AWS Console session            │
└──────────────────────────────────────────────────────────┘
```

**Key Security Points:**
- Credentials never leave your local machine except to AWS's official API
- Extension uses native Firefox containers API (no custom protocols)
- No credentials stored in browser storage
- See [SECURITY.md](SECURITY.md) for full details

## Installation

### Quick Start (No Python Required) ⚡

The extension comes with a **self-contained native messaging host** that includes Python and all dependencies. **No need to install Python!**

```bash
# Clone the repository
git clone https://github.com/sam-fakhreddine/aws-containers.git
cd aws-containers

# Install everything (uses pre-built executable if available)
./install.sh
```

### Alternative: Download Pre-Built Package

For releases, pre-built executables are available:
1. Download from [Releases](https://github.com/sam-fakhreddine/aws-containers/releases)
2. Extract and run `./install.sh`

**Platforms:** Linux, macOS Intel, macOS Apple Silicon

**Note:** macOS binaries are unsigned (code signing optional for now). See [INSTALL.md](INSTALL.md) for Gatekeeper bypass instructions.

No Python, no dependencies, just works! ✨

### For Developers: Build from Source

If you want to build the standalone executable yourself:

```bash
# Build the self-contained native messaging host
./build-native-host.sh

# Install everything
./install.sh
```

This creates a ~15-20MB standalone binary that includes:
- ✓ Python runtime
- ✓ boto3 & botocore
- ✓ All dependencies

### Load the Extension in Firefox

1. Open Firefox and navigate to: `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Navigate to and select: `dist/manifest.json` in the project directory
4. The extension icon should appear in your toolbar

### Test It Out

1. Click the extension icon in your Firefox toolbar
2. You should see a list of all your AWS profiles from `~/.aws/credentials`
3. Click on any profile to open it in a container

### Detailed Installation Guide

For comprehensive installation instructions, troubleshooting, and platform-specific notes, see **[INSTALL.md](INSTALL.md)**

## Usage

### Basic Usage

1. **Click the extension icon** in your Firefox toolbar
2. **Search or browse** your AWS profiles
3. **Select a region** from the dropdown (default: us-east-1)
4. **Click a profile** to open AWS Console in an isolated container

### Features

#### Search & Filter
Type in the search box to instantly filter profiles by name.

#### Favorites (⭐)
- Click the star icon next to any profile to mark it as a favorite
- Favorites appear at the top of the list
- Favorites persist across browser restarts

#### Recent Profiles
- Last 10 opened profiles appear in the "Recent" section
- Helps quickly access frequently-used accounts

#### Region Selection
- Choose your preferred AWS region before opening
- Region is appended to the console URL automatically
- Selection persists across sessions

### Profile Organization

Profiles are automatically organized into sections:

```
┌─────────────────────┐
│ FAVORITES   ★       │  ← Your starred profiles (alphabetical)
├─────────────────────┤
│ RECENT      🕐      │  ← Last 10 used (chronological)
├─────────────────────┤
│ ALL PROFILES        │  ← Everything else (alphabetical)
└─────────────────────┘
```

### Managing Containers

Switch to the "Containers" tab to:
- View all active AWS profile containers
- See container count
- Clear all containers at once

## AWS Credentials File Format

### Credential-Based Profiles

The extension reads standard AWS credentials files from `~/.aws/credentials`:

```ini
[production-account]
aws_access_key_id = AKIA...
aws_secret_access_key = ...
aws_session_token = ...
# Expires 2024-11-10 15:30:00 UTC

[dev-account]
aws_access_key_id = AKIA...
aws_secret_access_key = ...
```

**Features:**
- Detects all `[profile-name]` sections
- Reads expiration from comments (`# Expires YYYY-MM-DD HH:MM:SS UTC`)
- Shows time remaining or expired status
- Works with both static and temporary credentials

### AWS IAM Identity Center (SSO) Profiles

The extension also reads SSO profiles from `~/.aws/config`:

```ini
[profile sso-dev]
sso_start_url = https://my-sso-portal.awsapps.com/start
sso_region = us-east-1
sso_account_id = 123456789012
sso_role_name = DeveloperAccess
region = us-east-1

[profile sso-prod]
sso_start_url = https://my-sso-portal.awsapps.com/start
sso_region = us-east-1
sso_account_id = 987654321098
sso_role_name = ReadOnlyAccess
region = us-east-1
```

**SSO Setup:**
1. Configure your SSO profiles in `~/.aws/config`
2. Run `aws sso login --profile <profile-name>` to authenticate
3. The extension will automatically use cached SSO tokens from `~/.aws/sso/cache/`
4. When the token expires, simply run `aws sso login` again

**SSO Features:**
- Automatically detects SSO profiles from config
- Shows "SSO" badge in the UI for SSO profiles
- Monitors SSO token expiration
- Works seamlessly alongside credential-based profiles

## Integration with Your Existing Scripts

### Your `firefox-container.sh` Script

Already compatible! Uses the same `ext+container://` protocol.

### Your Shell Functions

All your AWS shell functions work unchanged:

```bash
# sso-faws function
sso-faws account-name
  ↓
Loads credentials from ~/.aws/credentials
  ↓
Calls aws_console.py to generate federation URL
  ↓
Calls firefox-container.sh
  ↓
Opens in container via ext+container:// protocol
```

### Your Python Scripts

- `aws_console.py`: Used by the bridge script to generate console URLs
- `lza-container.py`: Works with the extension
- All existing credential management is preserved

## Troubleshooting

### Extension Shows "Setup Required"

**Problem**: Native messaging host not connecting

**Solutions**:
1. Restart Firefox completely
2. Check the Python script is installed:
   ```bash
   ls -la ~/.local/bin/aws_profile_bridge.py
   ```
3. Check the script is executable:
   ```bash
   chmod +x ~/.local/bin/aws_profile_bridge.py
   ```
4. Verify native messaging manifest:
   ```bash
   # macOS
   cat ~/Library/Application\ Support/Mozilla/NativeMessagingHosts/aws_profile_bridge.json

   # Linux
   cat ~/.mozilla/native-messaging-hosts/aws_profile_bridge.json
   ```
5. Test the Python script manually:
   ```bash
   echo '{"action":"getProfiles"}' | python3 ~/.local/bin/aws_profile_bridge.py
   ```

### No Profiles Showing

**Problem**: Extension can't find AWS profiles

**Solutions**:
1. Check your credentials file exists:
   ```bash
   cat ~/.aws/credentials
   ```
2. Ensure profiles are in standard format with `[profile-name]` headers
3. Check file permissions:
   ```bash
   ls -la ~/.aws/credentials
   ```
4. For better SSO profile detection, install boto3:
   ```bash
   pip3 install boto3 botocore
   ```
   (The extension works without it, but boto3 provides better profile enumeration)

### Credentials Showing as Expired

**Problem**: Your credentials have expired

**Solutions for credential-based profiles**:
1. Use your existing refresh function:
   ```bash
   sso-faws account-name  # Refreshes and opens
   ```
2. Or refresh manually with `faws`:
   ```bash
   faws2025 -A account-name env -d 43200
   ```

**Solutions for SSO profiles**:
1. Re-authenticate with AWS SSO:
   ```bash
   aws sso login --profile <profile-name>
   ```
2. Or login to all profiles under the same SSO start URL:
   ```bash
   aws sso login
   ```

### SSO Profile Not Working

**Problem**: SSO profile shows as expired or can't open console

**Solutions**:
1. Ensure you've logged in with AWS CLI:
   ```bash
   aws sso login --profile <profile-name>
   ```
2. Check your SSO configuration in `~/.aws/config`:
   ```bash
   cat ~/.aws/config
   ```
3. Verify your SSO cache:
   ```bash
   ls -la ~/.aws/sso/cache/
   ```
4. Check if AWS CLI is installed:
   ```bash
   aws --version
   ```

### Console URL Generation Fails

**Problem**: Can't generate AWS console federation URL

**Solutions**:
1. Check `aws_console.py` is installed:
   ```bash
   ls -la ~/.local/bin/aws_console.py
   ```
2. Test it manually:
   ```bash
   export AWS_ACCESS_KEY_ID="..."
   export AWS_SECRET_ACCESS_KEY="..."
   python3 ~/.local/bin/aws_console.py -u
   ```
3. Fallback: Extension will use basic console URL

## File Locations

- **Extension**: `/home/user/granted-containers/dist/`
- **Python Bridge**: `~/.local/bin/aws_profile_bridge.py`
- **Native Messaging Manifest** (macOS): `~/Library/Application Support/Mozilla/NativeMessagingHosts/aws_profile_bridge.json`
- **Native Messaging Manifest** (Linux): `~/.mozilla/native-messaging-hosts/aws_profile_bridge.json`
- **AWS Credentials**: `~/.aws/credentials`

## Advanced Configuration

### Customize Colors

Edit the Python bridge script to change color mappings:

```python
# In ~/.local/bin/aws_profile_bridge.py
def get_profile_color(self, profile_name):
    name_lower = profile_name.lower()

    if 'prod' in name_lower:
        return 'red'  # Change this!
    # ... etc
```

### Customize Icons

Available icons: `fingerprint`, `briefcase`, `dollar`, `cart`, `circle`, `gift`, `vacation`, `food`, `fruit`, `pet`, `tree`, `chill`

```python
def get_profile_icon(self, profile_name):
    # Customize icon logic
```

### Add Custom Console URL Generation

Modify the `generate_console_url` method to integrate with other tools:

```python
def generate_console_url(self, profile_name):
    # Call your custom script
    result = subprocess.run(['your-custom-script', profile_name], ...)
```

## Security & Privacy

### What We Do
- ✅ Read `~/.aws/credentials` (local filesystem only)
- ✅ Send credentials to AWS Federation API (HTTPS, official AWS service)
- ✅ Store profile names, favorites, recent list in browser local storage
- ✅ Use native Firefox containers for isolation

### What We Don't Do
- ❌ Store credentials in browser storage
- ❌ Send credentials to any server except AWS
- ❌ Collect analytics or telemetry
- ❌ Phone home or track usage
- ❌ Share data with third parties

### Minimal Permissions
```json
{
  "permissions": [
    "contextualIdentities",  // Create/manage Firefox containers
    "cookies",               // Required for container isolation
    "tabs",                  // Open tabs in containers
    "storage",               // Store favorites/recent profiles
    "nativeMessaging"        // Read credentials via Python bridge
  ]
}
```

### Data Flow
All credential handling happens locally or with AWS:
1. Extension → Python bridge: Profile name only
2. Python bridge → AWS API: Temporary credentials
3. AWS API → Python bridge: Signin token (12h expiry)
4. Python bridge → Extension: Console URL with token
5. Extension → Firefox: Opens URL in container

**📖 For complete security documentation, see [SECURITY.md](SECURITY.md)**

## Development

### Building from Source

```bash
# Install dependencies
yarn install --frozen-lockfile

# Development build (watch mode)
yarn dev

# Production build
yarn build

# Run tests
yarn test
```

### Modifying the Extension

1. Edit source files in `src/`
2. Run `yarn build` to rebuild
3. Click "Reload" in `about:debugging` to test changes

### Project Structure

```
granted-containers/
├── src/
│   ├── popup/
│   │   ├── awsProfiles.tsx    # Main popup UI
│   │   └── index.tsx           # Entry point
│   ├── opener/
│   │   ├── parser.ts           # Protocol handler
│   │   └── containers.ts       # Container management
│   └── backgroundPage.ts       # Background script
├── native-messaging/
│   ├── aws_profile_bridge.py   # Native bridge script
│   └── aws_profile_bridge.json # Manifest template
├── dist/                        # Built extension
└── install.sh                   # Installation script
```

## Features Overview

| Feature | Status | Description |
|---------|--------|-------------|
| AWS Console Federation | ✅ | Automatic console URL generation |
| Profile Detection | ✅ | Reads `~/.aws/credentials` and `~/.aws/config` |
| AWS IAM Identity Center | ✅ | Full SSO profile support |
| Container Isolation | ✅ | Native Firefox containers |
| Credential Monitoring | ✅ | Shows expiration status for both credential and SSO profiles |
| Auto Color Coding | ✅ | Environment-based colors |
| Search/Filter | ✅ | Real-time profile filtering |
| Favorites | ✅ | Star profiles for quick access |
| Recent Profiles | ✅ | Tracks last 10 opened |
| Region Selection | ✅ | 10 major AWS regions |
| Native Messaging | ✅ | Python bridge for filesystem access |

## Compatibility

- **Firefox**: 60+ (tested on latest)
- **Operating Systems**:
  - ✅ **macOS** - Fully supported
  - ✅ **Linux** - Fully supported
  - ⚠️ **Windows** - Not currently supported (requires PowerShell installer and BAT wrapper)
- **AWS CLI**: Optional (for advanced URL generation)
- **Python**: 3.6+
- **Python Dependencies**:
  - boto3 (optional, recommended for enhanced SSO profile enumeration)
  - botocore (optional, recommended for enhanced SSO profile enumeration)

### Optional boto3 Installation

For better SSO profile detection and enumeration, install boto3:

```bash
pip3 install -r native-messaging/requirements.txt
```

**Note**: The extension works without boto3 by falling back to manual AWS config parsing, but boto3 provides more reliable profile enumeration.

### Windows Support

Windows support is **not currently implemented** but is technically feasible. Required changes:
- PowerShell installation script (`install.ps1`)
- Python wrapper batch file (`aws_profile_bridge.bat`)
- Different manifest paths (`%APPDATA%\Mozilla\NativeMessagingHosts\`)

If you need Windows support, please open an issue or contribute a PR.

## Contributing

Contributions welcome. Open an issue or submit a pull request.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

For issues:
1. Check the Troubleshooting section above
2. Test your shell functions still work
3. Verify native messaging is properly installed
4. Check Firefox console for errors: `about:debugging` → "Inspect"
