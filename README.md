# AWS Profile Containers

A Firefox extension that reads your AWS credentials file and opens AWS profiles in separate isolated containers.

## Features

- **Automatic Profile Detection**: Reads profiles directly from `~/.aws/credentials`
- **Container Isolation**: Each AWS profile opens in its own Firefox container
- **Credential Monitoring**: Shows credential expiration status
- **Smart Color Coding**: Automatically assigns colors based on environment
  - Production profiles → Red
  - Staging profiles → Yellow
  - Development profiles → Green
  - Test/QA profiles → Turquoise
  - Integration profiles → Blue
  - Janus profiles → Purple
- **Works with Your Existing Tools**: Integrates with your `sso-faws`, `lza_container` shell functions
- **Protocol Handler**: Supports `ext+container://` protocol for CLI integration

## Architecture

```
┌─────────────────────────┐
│  Firefox Extension      │
│  (Popup UI)            │
└───────────┬─────────────┘
            │ Native Messaging API
            ↓
┌─────────────────────────┐
│  Python Bridge Script   │
│  (Reads filesystem)     │
└───────────┬─────────────┘
            │
            ↓
┌─────────────────────────┐
│  ~/.aws/credentials     │
│  (Your AWS profiles)    │
└─────────────────────────┘
```

## Installation

### 1. Run the Installation Script

```bash
cd /home/user/granted-containers
./install.sh
```

This will:
- Install the Python bridge script to `~/.local/bin/`
- Configure Firefox native messaging
- Install dependencies
- Build the extension

### 2. Load the Extension in Firefox

1. Open Firefox and navigate to: `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Navigate to: `/home/user/granted-containers/dist/manifest.json`
4. Click "Open"

### 3. Test It Out

1. Click the extension icon in your Firefox toolbar
2. You should see a list of all your AWS profiles from `~/.aws/credentials`
3. Click on any profile to open it in a container

## Usage

### From the Extension Popup

1. Click the extension icon
2. View your AWS profiles with credential status
3. Click any profile to open AWS Console in a container
4. Switch between "AWS Profiles" and "Containers" tabs

### From Your Shell Functions (Existing Workflow)

Your existing shell functions continue to work unchanged:

```bash
# Your existing commands still work!
sso-faws production-account
lza_container fcc-prod
sso-janus customer-name
```

The extension now handles the `ext+container://` protocol that your `firefox-container.sh` script generates.

### From Command Line (Direct)

You can also open profiles directly:

```bash
firefox "ext+container:url=https://console.aws.amazon.com/&name=my-profile&color=red&icon=briefcase"
```

## AWS Credentials File Format

The extension reads standard AWS credentials files:

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

### Credentials Showing as Expired

**Problem**: Your credentials have expired

**Solutions**:
1. Use your existing refresh function:
   ```bash
   sso-faws account-name  # Refreshes and opens
   ```
2. Or refresh manually with `faws`:
   ```bash
   faws2025 -A account-name env -d 43200
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

## Security Notes

1. **No credentials stored in browser**: Extension only reads via native script
2. **Minimal permissions**: Only uses `nativeMessaging`, `contextualIdentities`, `tabs`, `storage`
3. **No network access**: Extension can't send data anywhere
4. **Container isolation**: Each profile is completely isolated
5. **Local only**: All communication stays on your machine

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

| Feature | Supported |
|---------|----------|
| Protocol | `ext+container` |
| Profile Source | `~/.aws/credentials` |
| Native Messaging | Yes |
| Credential Monitoring | Yes |
| Auto Color Coding | Yes |
| Expiration Tracking | Yes |
| Popup Profile List | Yes |

## Compatibility

- **Firefox**: 60+ (tested on latest)
- **Operating Systems**: macOS, Linux
- **AWS CLI**: Optional (for advanced URL generation)
- **Python**: 3.6+

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
