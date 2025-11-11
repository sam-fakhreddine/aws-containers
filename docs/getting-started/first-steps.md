# First Steps

Congratulations on installing AWS Profile Containers! This guide will help you get started with using the extension.

## Verify Installation

1. **Check the extension icon** appears in your Firefox toolbar
2. **Click the icon** - you should see the extension popup
3. **Verify profiles are loaded** - your AWS profiles from `~/.aws/credentials` and `~/.aws/config` should appear

If you see "Setup Required", see the [Troubleshooting Guide](../user-guide/troubleshooting.md).

## Understanding the Interface

The extension popup has two main tabs:

### Profiles Tab

This is where you manage and open your AWS profiles.

**Components:**
- **Search box** - Filter profiles by name
- **Region selector** - Choose AWS region (default: us-east-1)
- **Profile list** - All your AWS profiles organized by:
  - Favorites (⭐)
  - Recent (🕐)
  - All Profiles (alphabetical)
- **Star icon** - Mark profiles as favorites
- **Expiration indicator** - Shows credential expiration status
- **SSO badge** - Indicates SSO profiles

### Containers Tab

Manage your Firefox containers created by the extension.

**Features:**
- View all AWS profile containers
- See container count
- Clear all containers at once

## Opening Your First Profile

1. **Select a region** from the dropdown (e.g., "us-east-1")
2. **Click any profile** in the list
3. **A new tab opens** in an isolated Firefox container
4. **AWS Console loads** with automatic authentication

The container is color-coded based on the profile name:
- Production → Red
- Staging → Yellow
- Development → Green
- Test/QA → Turquoise
- Other → Various colors

## Organizing Your Profiles

### Mark Favorites

For frequently-used profiles:
1. Click the **star icon (☆)** next to the profile name
2. The star turns solid (⭐)
3. Profile moves to the "Favorites" section at the top

To unfavorite:
1. Click the solid star (⭐) again
2. Profile returns to the "All Profiles" section

### Recent Profiles

The extension automatically tracks your last 10 opened profiles in the "Recent" section. No configuration needed!

### Search and Filter

Type in the search box to instantly filter profiles by name:
- Type "prod" to see all production profiles
- Type "dev" to see development profiles
- Type partial names to quickly find profiles

## Working with Different Profile Types

### Credential-Based Profiles

Profiles with AWS access keys in `~/.aws/credentials`:

```ini
[my-profile]
aws_access_key_id = AKIA...
aws_secret_access_key = ...
aws_session_token = ...
# Expires 2024-11-10 15:30:00 UTC
```

The extension:
- Reads credentials on-demand when you click the profile
- Shows expiration time if present in comments
- Never stores credentials

### SSO Profiles

Profiles configured for AWS IAM Identity Center (SSO):

```ini
[profile sso-dev]
sso_start_url = https://my-sso-portal.awsapps.com/start
sso_region = us-east-1
sso_account_id = 123456789012
sso_role_name = DeveloperAccess
region = us-east-1
```

**Before using SSO profiles:**
1. Log in via AWS CLI:
   ```bash
   aws sso login --profile sso-dev
   ```
2. The extension uses your cached SSO token
3. When expired, run `aws sso login` again

SSO profiles show an "SSO" badge and expiration status.

## Understanding Expiration Indicators

Profiles show their credential status:

- **Green checkmark (✓)** - Credentials are valid
- **Yellow warning (⚠)** - Expiring soon (< 1 hour)
- **Red error (✗)** - Expired
- **Clock (🕐)** - Time remaining displayed

For SSO profiles, this shows the SSO token expiration.

## Container Isolation

Each AWS profile opens in its own Firefox container, which:

- **Isolates cookies and sessions** - No cross-contamination
- **Prevents accidental actions** - Can't mix up accounts
- **Uses color coding** - Easy visual identification
- **Maintains separate histories** - Each profile's browsing is isolated

You can open multiple profiles simultaneously, each in its own container!

## Switching Between Regions

To open the same profile in a different region:

1. **Select the new region** from the dropdown
2. **Click the profile** again
3. **New tab opens** in the same container but different region

The region selector remembers your last selection.

## Managing Containers

To view and manage containers:

1. Click the **"Containers" tab**
2. See all active AWS profile containers
3. Click **"Clear Containers"** to remove all at once (optional)

**Note:** Clearing containers closes any open AWS Console tabs using those containers.

## Best Practices

### Security
- Use temporary credentials (session tokens) when possible
- Regularly rotate credentials
- Don't use long-term IAM user keys
- Enable MFA on your AWS accounts
- Review the [Security Guide](../security/overview.md)

### Organization
- Use descriptive profile names (e.g., "company-prod-admin", "company-dev-readonly")
- Star your most-used profiles
- Use the search feature to quickly find profiles
- Keep credentials file organized with comments

### SSO Usage
- Prefer SSO over long-term credentials
- Keep SSO tokens fresh with regular `aws sso login`
- Use role-based access through SSO
- Configure appropriate session durations in SSO settings

## Common Workflows

### Daily Development Work

1. Open extension
2. Search for your dev profile
3. Select preferred region
4. Click profile
5. Work in isolated container
6. Repeat for other profiles as needed

### Multi-Account Management

1. Star your primary accounts
2. Use search to filter by environment (prod, dev, staging)
3. Open multiple profiles in separate containers
4. Switch between tabs as needed
5. Each account stays isolated

### SSO Workflow

1. Morning: Run `aws sso login` to authenticate
2. Throughout the day: Use extension normally
3. When token expires: Run `aws sso login` again
4. Extension automatically uses fresh tokens

## Keyboard Shortcuts

While in the extension popup:
- **Type** to start searching (search box auto-focuses)
- **Tab** to navigate between elements
- **Enter** on a profile to open it
- **Escape** to close the popup

## Next Steps

Now that you're familiar with the basics:

- [Learn about all features](../user-guide/features.md)
- [Read the full usage guide](../user-guide/usage.md)
- [Understand the security model](../security/overview.md)
- [Troubleshoot issues](../user-guide/troubleshooting.md)

## Getting Help

If you need help:
- Check the [User Guide](../user-guide/usage.md)
- Read [Troubleshooting](../user-guide/troubleshooting.md)
- Review [FAQ](../user-guide/troubleshooting.md#common-questions)
- [Open an issue](https://github.com/sam-fakhreddine/aws-containers/issues) on GitHub

Enjoy using AWS Profile Containers! 🚀
