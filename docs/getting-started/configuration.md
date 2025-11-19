# Configuration Guide

This guide covers how to configure AWS Profile Containers including AWS credentials, SSO profiles, and extension token setup.

## AWS Credentials File Format

AWS Profile Containers reads profiles from your standard AWS configuration files.

### Credential-based Profiles

Standard AWS credentials are stored in `~/.aws/credentials`:

```ini
[production-account]
aws_access_key_id = AKIA...
aws_secret_access_key = ...
aws_session_token = ...
# Expires 2024-11-10 15:30:00 UTC

[staging-account]
aws_access_key_id = AKIA...
aws_secret_access_key = ...
```

**Key Points:**
- Profile names are defined in square brackets
- Session tokens are optional (required for temporary credentials)
- Expiration comments are automatically detected and displayed
- The extension will show expiration status for each profile

### SSO Profiles

AWS IAM Identity Center (SSO) profiles are configured in `~/.aws/config`:

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
region = us-west-2
```

**SSO Authentication:**

Before using SSO profiles, authenticate with AWS SSO:

```bash
# Authenticate for a specific profile
aws sso login --profile sso-dev

# Or authenticate for all profiles using the same SSO portal
aws sso login --sso-session my-session
```

**SSO Configuration:**
- Profile names must start with `profile` in the config file
- `sso_start_url`: Your organization's SSO portal URL
- `sso_region`: Region where your SSO directory is configured
- `sso_account_id`: Target AWS account ID
- `sso_role_name`: IAM role to assume in the target account
- `region`: Default AWS region for console access

## Extension Token Configuration

The extension uses token-based authentication to securely communicate with the API server.

### Getting Your API Token

The API token is automatically generated during installation and stored in `~/.aws/profile_bridge_config.json`:

```bash
# View your API token
cat ~/.aws/profile_bridge_config.json
```

The file will look like this:

```json
{
  "api_token": "your-random-token-here",
  "port": 10999
}
```

### Configuring the Extension

1. **Click the extension icon** in your Firefox toolbar
2. **Click the settings icon (⚙️)** in the popup
3. **Paste your API token** from the config file
4. **Click "Save Token"**
5. **Click "Test Connection"** to verify it works

### Token Security

- **Never share your API token** - it provides access to your AWS credentials
- The token is stored only in Firefox's secure extension storage
- The token is required for all communication between the extension and API server
- If compromised, regenerate it by reinstalling the API server

### Changing the API Port

If port 10999 is already in use, you can change it:

**Linux (systemd):**

1. Edit the service file:
   ```bash
   $EDITOR ~/.config/systemd/user/aws-profile-bridge.service
   ```

2. Change the port in the `ExecStart` line:
   ```ini
   ExecStart=/usr/local/bin/aws-profile-bridge api --port 11000
   ```

3. Reload and restart:
   ```bash
   systemctl --user daemon-reload
   systemctl --user restart aws-profile-bridge
   ```

**macOS (launchd):**

1. Edit the plist file:
   ```bash
   $EDITOR ~/Library/LaunchAgents/com.aws.profile-bridge.plist
   ```

2. Update the port in the arguments array

3. Reload:
   ```bash
   launchctl bootout gui/$(id -u)/com.aws.profile-bridge
   launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.aws.profile-bridge.plist
   ```

## Environment-Based Color Coding

The extension automatically assigns container colors based on profile names:

| Environment | Keywords | Color |
|------------|----------|-------|
| Production | `prod`, `production`, `prd` | Red |
| Staging | `staging`, `stage`, `stg` | Yellow |
| Development | `dev`, `development`, `test` | Green |
| Default | All others | Blue |

**Example:**
- `production-account` → Red container
- `staging-api` → Yellow container
- `dev-testing` → Green container
- `analytics-account` → Blue container

## Region Configuration

### Default Region

You can set a default region in the extension settings that will be pre-selected when opening profiles.

### Per-Profile Regions

SSO profiles can specify a default region in `~/.aws/config`:

```ini
[profile sso-dev]
# ... other settings ...
region = us-east-1  # This profile defaults to us-east-1
```

### Available Regions

The extension supports all AWS commercial regions:
- us-east-1, us-east-2, us-west-1, us-west-2
- eu-west-1, eu-west-2, eu-west-3, eu-central-1, eu-north-1
- ap-southeast-1, ap-southeast-2, ap-northeast-1, ap-northeast-2, ap-south-1
- ca-central-1, sa-east-1
- And more...

## Advanced Configuration

### Multiple Credential Files

If you maintain multiple credential files, you can use symbolic links:

```bash
# Link to your preferred credentials file
ln -sf ~/.aws/credentials.work ~/.aws/credentials
```

### Credential Rotation

When rotating credentials:

1. Update your credentials file
2. The extension will automatically detect changes on next profile load
3. No need to restart the API server or extension

### Debugging Configuration

Enable debug logging in the API server:

**Linux:**
```bash
# Edit service file
systemctl --user edit aws-profile-bridge

# Add environment variable
[Service]
Environment="LOG_LEVEL=DEBUG"

# Restart
systemctl --user restart aws-profile-bridge
```

**macOS:**
```bash
# Check logs
tail -f ~/.aws/logs/aws_profile_bridge_api.log
```

## Related Documentation

- [Installation Guide](install-root.md)
- [Requirements](requirements.md)
- [Troubleshooting](../user-guide/troubleshooting.md)
- [Security Best Practices](../security/best-practices.md)
- [Token Authentication Details](../TOKEN_AUTHENTICATION.md)
