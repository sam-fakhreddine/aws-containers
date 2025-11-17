<p align="center">
  <img src="docs/assets/aws-console-containers.png" alt="AWS Console Containers Logo" width="200"/>
</p>

# AWS Profile Containers

A Firefox extension that reads your AWS credentials file and opens AWS profiles in separate isolated containers with automatic AWS Console federation.

## Background

This project originated from a collection of custom CLI scripts and Firefox extensions for managing AWS profiles. After discovering [granted.dev](https://granted.dev), we found it didn't quite fit our workflow, so we forked it as a foundation and inspiration to unify our tooling into a cohesive browser extension. The result combines CLI efficiency with browser integration, all built on Firefox's native container technology.

**[Read the full origin story →](docs/development/background.md)**

## ⚠️ Security Notice

**This extension reads sensitive AWS credentials from your local filesystem.**

- ✅ **Read** `~/.aws/credentials` (local only)
- ✅ **Calls** AWS Federation API (official AWS service)
- ❌ **Never stores** credentials in browser storage
- ❌ **Never transmits** credentials to any server except AWS
- 📖 **[Read full security documentation](docs/security/security-root.md)** before installing

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
│ 2. Extension → API Server (HTTP)                        │
│    POST http://127.0.0.1:10999/profiles/{name}/console-url │
│    Sends: Profile name only                             │
└────────────────────┬─────────────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────────────┐
│ 3. API Server reads ~/.aws/credentials                  │
│    Extracts: access key, secret key, session token      │
└────────────────────┬─────────────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────────────┐
│ 4. API Server → AWS Federation API (HTTPS)              │
│    Endpoint: signin.aws.amazon.com/federation            │
│    Returns: Temporary signin token (12 hour expiry)     │
└────────────────────┬─────────────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────────────┐
│ 5. API Server → Extension (HTTP Response)               │
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
- API server binds to localhost (127.0.0.1) only
- Token-based authentication between extension and API server
- Extension uses native Firefox containers API (no custom protocols)
- No credentials stored in browser storage
- See [docs/security/security-root.md](docs/security/security-root.md) for full details

## Prerequisites

**For Users (Quick Start):**
- Firefox (latest version recommended)
- Python 3.12+ (for API server)
- No other dependencies required!

**For Developers (Building from Source):**
- **Node.js**: Version 22.14.0+ or 24.10.0+
  - Check your version: `node --version`
  - Install via [nvm](https://github.com/nvm-sh/nvm) or [nodejs.org](https://nodejs.org/)
- **Yarn**: Package manager
  - Install: `npm install -g yarn`
- **Python 3.8+** (only for development mode with `--dev` flag)

The version check runs automatically during installation and will provide clear instructions if your Node.js version needs updating.

## Installation

### Quick Start ⚡

The extension uses an **HTTP API server** that runs as a system service.

```bash
# Clone the repository
git clone https://github.com/sam-fakhreddine/aws-containers.git
cd aws-containers

# Install and start the API server
./scripts/install-api-service.sh

# Build the extension
yarn install
yarn build
```

### What Gets Installed

The installation script:

1. ✅ Checks for Python 3.12+
2. ✅ Installs Python dependencies (FastAPI, boto3, etc.)
3. ✅ Sets up systemd (Linux) or launchd (macOS) service
4. ✅ Starts API server on `http://127.0.0.1:10999`
5. ✅ Generates secure API token
6. ✅ Verifies server is running

**Platforms:** Linux, macOS (Intel & Apple Silicon)

**Note:** Windows is not currently supported.

### Configure Extension Token

After installation, configure the extension with the API token:

```bash
# Get your API token
cat ~/.aws/profile_bridge_config.json
```

Then in Firefox:
1. Click extension icon
2. Click settings icon (⚙️) in top right
3. Paste the `api_token` value
4. Click "Save Token"
5. Click "Test Connection"

**See [docs/TOKEN_AUTHENTICATION.md](docs/TOKEN_AUTHENTICATION.md) for details.**

### Managing the API Server

**Linux (systemd):**
```bash
# Check status
systemctl --user status aws-profile-bridge

# Start/Stop/Restart
systemctl --user start aws-profile-bridge
systemctl --user stop aws-profile-bridge
systemctl --user restart aws-profile-bridge

# View logs
journalctl --user -u aws-profile-bridge -f
```

**macOS (launchd):**
```bash
# Check status
launchctl list | grep aws-profile-bridge

# Start/Stop
launchctl load ~/Library/LaunchAgents/com.aws.profile-bridge.plist
launchctl unload ~/Library/LaunchAgents/com.aws.profile-bridge.plist

# View logs
tail -f ~/.aws/logs/aws_profile_bridge_api.log
```

**Manual (for development):**
```bash
# Start server manually
python -m aws_profile_bridge api

# Or with hot reload
ENV=development python -m aws_profile_bridge api
```

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

For comprehensive installation instructions, troubleshooting, and platform-specific notes, see **[docs/getting-started/install-root.md](docs/getting-started/install-root.md)**

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

### Disabling SSO Profile Enumeration

If you want to **temporarily disable SSO profile enumeration** (for example, to speed up loading or if you only use credential-based profiles), create an empty `.nosso` file in your `~/.aws/` directory:

```bash
# Create the .nosso file to disable SSO profiles
touch ~/.aws/.nosso
```

**When `.nosso` exists:**
- ❌ SSO profiles will not be loaded from `~/.aws/config`
- ✅ Credential-based profiles continue to work normally
- ⚡ Faster profile loading (no SSO token validation)

**To re-enable SSO profiles**, simply remove the file:

```bash
# Remove the .nosso file to re-enable SSO profiles
rm ~/.aws/.nosso
```

**⚠️ Important:** After creating or removing the `.nosso` file, you **must** click the **"Refresh Profiles"** button in the extension popup to reload profiles from disk. The extension caches profiles for performance, so simply closing and reopening the popup won't pick up the changes.

## Troubleshooting

### Extension Shows "API Server Not Running"

**Problem**: Cannot connect to API server

**Solutions**:

1. Check if API server is running:

   ```bash
   curl http://localhost:10999/health
   ```

2. Start the API server:

   ```bash
   # Linux
   systemctl --user start aws-profile-bridge

   # macOS
   launchctl load ~/Library/LaunchAgents/com.aws.profile-bridge.plist

   # Manual
   python -m aws_profile_bridge api
   ```

3. Check API server logs:

   ```bash
   tail -f ~/.aws/logs/aws_profile_bridge_api.log
   ```

4. Verify Python version (requires 3.12+):

   ```bash
   python3 --version
   ```

5. Check if port 10999 is available:

   ```bash
   lsof -i :10999
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

1. Refresh your credentials using your preferred AWS credential management tool
2. The extension will automatically detect updated credentials on next refresh

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

### API Server Won't Start

**Problem**: API server fails to start

**Solutions**:

1. Check Python version (must be 3.12+):

   ```bash
   python3 --version
   ```

2. Reinstall dependencies:

   ```bash
   cd api-server
   pip install -e .
   ```

3. Check for port conflicts:

   ```bash
   lsof -i :10999
   # Kill conflicting process if needed
   kill -9 <PID>
   ```

4. Run server manually to see errors:

   ```bash
   python -m aws_profile_bridge api
   ```

## File Locations

- **Extension**: `./dist/`
- **API Server**: Installed as Python package
- **API Logs**: `~/.aws/logs/aws_profile_bridge_api.log`
- **Service Config** (Linux): `~/.config/systemd/user/aws-profile-bridge.service`
- **Service Config** (macOS): `~/Library/LaunchAgents/com.aws.profile-bridge.plist`
- **AWS Credentials**: `~/.aws/credentials`
- **AWS Config**: `~/.aws/config`

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
    "<all_urls>"             // Access localhost API server
  ]
}
```

### Data Flow

All credential handling happens locally or with AWS:

1. Extension → API Server (HTTP): Profile name only
2. API Server → AWS API: Temporary credentials
3. AWS API → API Server: Signin token (12h expiry)
4. API Server → Extension (HTTP): Console URL with token
5. Extension → Firefox: Opens URL in container

**📖 For complete security documentation, see [docs/security/security-root.md](docs/security/security-root.md)**

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
aws-console-containers/
├── config/                      # Build & linting configuration
│   ├── webpack/                 # Webpack configs
│   ├── .eslintrc.js
│   ├── .prettierrc.js
│   └── babel.config.js
├── scripts/                     # Build & utility scripts
│   ├── build/                   # Build scripts
│   └── test/                    # Test scripts
├── src/                         # Extension source code
│   ├── popup/
│   │   ├── awsProfiles.tsx     # Main popup UI
│   │   └── index.tsx           # Entry point
│   ├── opener/
│   │   ├── parser.ts           # Protocol handler
│   │   └── containers.ts       # Container management
│   └── backgroundPage.ts       # Background script
├── api-server/                  # Python API server
│   ├── src/                    # Source code
│   ├── tests/                  # Unit tests
│   └── setup.py
├── docs/                        # Documentation
│   └── assets/                 # Images & assets
├── dist/                        # Built extension (generated)
└── install.sh                   # Installation script
```

For complete details on the repository structure, see [docs/development/REORGANIZATION.md](docs/development/REORGANIZATION.md).

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
pip3 install -r api-server/requirements.txt
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
2. Verify native messaging is properly installed
3. Check Firefox console for errors: `about:debugging` → "Inspect"
4. Open an issue on [GitHub](https://github.com/sam-fakhreddine/aws-console-containers/issues)
