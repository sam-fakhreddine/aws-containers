# Quick Start Guide

## Installation (3 Steps)

### 1. Install the Extension

```bash
cd /home/user/aws-console-containers
./install.sh
```

### 2. Load in Firefox

1. Open Firefox
2. Go to: `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Select: `/home/user/aws-console-containers/dist/manifest.json`

### 3. Test It

Click the extension icon → You should see your AWS profiles!

## What You Get

### Extension Popup
- **AWS Profiles Tab**: Click any profile to open AWS Console in a container
- **Containers Tab**: View and manage active containers
- **Auto-refresh**: Profiles update automatically
- **Expiration warnings**: See when credentials expire

### Color Coding (Automatic)
- 🔴 Red = Production
- 🟡 Yellow = Staging
- 🟢 Green = Development
- 🔵 Blue = Integration
- 🟣 Purple = Janus

### Your Shell Functions Still Work!

```bash
# All your existing commands work unchanged
sso-faws account-name
lza_container profile-name
sso-janus customer-name
```

## Troubleshooting

### "Setup Required" Error

```bash
# 1. Verify installation
ls -la ~/.local/bin/aws_profile_bridge.py

# 2. Test the bridge
./test-api-server.sh

# 3. Restart Firefox completely
```

### No Profiles Showing

```bash
# Check your credentials file
cat ~/.aws/credentials | grep '^\['
```

## Daily Usage

### Option 1: From Extension
1. Click extension icon
2. Click profile name
3. AWS Console opens in isolated container

### Option 2: From Terminal (Your Current Way)
```bash
sso-faws my-aws-profile
```

Both methods create isolated containers!

## Updating Credentials

Your existing workflow continues to work:

```bash
# Refresh credentials with your existing tools
sso-faws account-name     # Auto-refreshes if expired
faws2025 -A account-name env -d 43200
```

The extension will show updated expiration times on next refresh.

## Where Everything Lives

- Extension: `/home/user/aws-console-containers/dist/`
- Python Bridge: `~/.local/bin/aws_profile_bridge.py`
- AWS Creds: `~/.aws/credentials` (unchanged)

## Making Changes

If you modify the extension:

```bash
# Rebuild
yarn build

# In Firefox: about:debugging → Click "Reload" next to your extension
```

## Need Help?

1. Check [README-AWS-PROFILES.md](./README-AWS-PROFILES.md) for detailed docs
2. Run `./test-api-server.sh` to diagnose issues
3. Check Firefox console: `about:debugging` → "Inspect"

## Tips

- **Right-click** extension icon → Pin to toolbar for easy access
- **Ctrl+click** profile to open in new window
- Extension remembers your containers between sessions
- Use "Clear Containers" to reset everything

That's it! Happy containerizing! 🎉
