# Usage Guide

Complete guide to using AWS Profile Containers for Firefox.

## Opening the Extension

Click the AWS Profile Containers icon in your Firefox toolbar to open the popup interface.

## Interface Overview

The extension has two main tabs accessible from the top of the popup:

### Profiles Tab (Default)

The main interface for working with AWS profiles:

```
┌─────────────────────────────────────┐
│  [Search box]                       │
│  [Region selector ▾]                │
├─────────────────────────────────────┤
│  ⭐ FAVORITES                       │
│     • prod-account          [⭐][>] │
│     • dev-main              [⭐][>] │
├─────────────────────────────────────┤
│  🕐 RECENT                          │
│     • staging-test          [☆][>] │
│     • qa-environment        [☆][>] │
├─────────────────────────────────────┤
│  ALL PROFILES                       │
│     • account-a             [☆][>] │
│     • account-b             [☆][>] │
└─────────────────────────────────────┘
```

**Components:**
- **Search box**: Type to filter profiles
- **Region selector**: Choose AWS region
- **Profile sections**: Organized by Favorites → Recent → All
- **Star icon (☆/⭐)**: Favorite/unfavorite toggle
- **Arrow (>)**: Opens profile in console

### Containers Tab

Manage Firefox containers created by the extension:

```
┌─────────────────────────────────────┐
│  AWS Profile Containers             │
│                                     │
│  Total: 5 containers                │
│                                     │
│  • prod-account (red)               │
│  • dev-main (green)                 │
│  • staging-test (yellow)            │
│                                     │
│  [Clear All Containers]             │
└─────────────────────────────────────┘
```

## Basic Operations

### Opening an AWS Profile

1. **Select region** from the dropdown (optional, defaults to us-east-1)
2. **Click the profile** in the list
3. **New tab opens** with AWS Console in an isolated container

The extension:
- Creates a container if it doesn't exist
- Generates a federated console URL
- Opens the URL in the container
- Adds profile to "Recent" list

### Searching for Profiles

1. **Click the search box** (auto-focuses when popup opens)
2. **Type any part** of the profile name
3. **Results filter instantly** as you type

Example:
- Type "prod" → Shows all production profiles
- Type "dev" → Shows all development profiles
- Type "my-company" → Shows profiles containing "my-company"

### Marking Favorites

To favorite a profile:
1. **Click the star icon (☆)** next to the profile
2. **Star becomes solid (⭐)**
3. **Profile moves** to the Favorites section

To unfavorite:
1. **Click the solid star (⭐)**
2. **Star becomes hollow (☆)**
3. **Profile returns** to All Profiles section

Favorites are saved in browser local storage and persist across restarts.

### Changing Regions

To open a profile in a different region:

1. **Select the region** from the dropdown
2. **Click the profile**
3. **Console opens** in the selected region

The region selection persists across sessions.

**Supported regions:**
- us-east-1 (N. Virginia) - Default
- us-east-2 (Ohio)
- us-west-1 (N. California)
- us-west-2 (Oregon)
- eu-west-1 (Ireland)
- eu-west-2 (London)
- eu-central-1 (Frankfurt)
- ap-southeast-1 (Singapore)
- ap-southeast-2 (Sydney)
- ap-northeast-1 (Tokyo)

### Managing Containers

To view and manage containers:

1. **Click the "Containers" tab**
2. **View all active containers** and their colors
3. **Click "Clear All Containers"** to remove all (optional)

**Warning:** Clearing containers will close any open AWS Console tabs using those containers.

## Working with Different Profile Types

### Credential-Based Profiles

Profiles with access keys in `~/.aws/credentials`:

```ini
[my-profile]
aws_access_key_id = AKIA...
aws_secret_access_key = ...
aws_session_token = ...
# Expires 2024-11-10 15:30:00 UTC
```

**Usage:**
1. Configure profile in `~/.aws/credentials`
2. Click profile in extension
3. Credentials are read and used to generate console URL
4. Console opens automatically

**Expiration:**
- Add comment `# Expires YYYY-MM-DD HH:MM:SS UTC` to see expiration
- Extension shows time remaining
- Warns when expiring soon
- Marks expired credentials

### SSO Profiles

Profiles configured for AWS IAM Identity Center:

```ini
[profile sso-dev]
sso_start_url = https://my-sso-portal.awsapps.com/start
sso_region = us-east-1
sso_account_id = 123456789012
sso_role_name = DeveloperAccess
region = us-east-1
```

**Initial setup:**
1. Configure SSO profile in `~/.aws/config`
2. Run `aws sso login --profile sso-dev` to authenticate
3. SSO token is cached in `~/.aws/sso/cache/`

**Daily usage:**
1. Click SSO profile in extension
2. Extension uses cached SSO token
3. Generates temporary credentials via AWS SSO API
4. Opens console with federated URL

**When token expires:**
1. Extension shows "Expired" status
2. Run `aws sso login --profile sso-dev` again
3. Continue using normally

**Visual indicators:**
- "SSO" badge on profile
- Token expiration countdown
- Warning when expiring soon

## Common Workflows

### Single Account Development

Working with one AWS account throughout the day:

1. Open extension
2. Find your profile (search or favorites)
3. Click to open console
4. Work in AWS Console
5. Close when done

Profile appears in "Recent" section for quick re-access.

### Multi-Account Development

Working with multiple accounts simultaneously:

1. Open extension
2. Click first profile (e.g., dev account)
3. Green container tab opens
4. Open extension again
5. Click second profile (e.g., staging account)
6. Yellow container tab opens
7. Switch between tabs as needed

Each account is completely isolated in its own container.

### Production Support

Quickly accessing production accounts:

1. Star all production accounts
2. Production profiles always at top
3. Click when needed
4. Red container provides visual warning
5. Separate from other environments

### Region-Specific Work

Working with resources in multiple regions:

1. Open extension
2. Select us-east-1
3. Click profile → Opens in us-east-1
4. Open extension again
5. Select eu-west-1
6. Click same profile → Opens in eu-west-1
7. Both tabs in same container, different regions

### SSO Organization

Using AWS Organizations with SSO:

1. Configure all SSO profiles in `~/.aws/config`
2. Run `aws sso login` once (authenticates for all profiles with same start_url)
3. All profiles available in extension
4. Click profiles as needed throughout the day
5. Re-login when token expires

## Understanding Profile Status

Profiles display status indicators:

### Valid Credentials
- ✓ Green checkmark
- "Valid" or time remaining shown
- Ready to use

### Expiring Soon
- ⚠ Yellow warning
- Less than 1 hour remaining
- Should refresh credentials soon

### Expired
- ✗ Red error
- "Expired" shown
- Must refresh credentials before use

### SSO Token Status
- Shows SSO token expiration
- Independent of role credentials
- Refresh with `aws sso login`

## Tips and Tricks

### Quick Access

- **Star frequently-used profiles** - Always at top
- **Use search** - Faster than scrolling for large profile lists
- **Descriptive names** - Makes searching easier

### Organization

- **Naming convention** - Use prefixes like "prod-", "dev-", "staging-"
- **Color coding** - Extension auto-assigns colors by name
- **Comments** - Add expiration comments to credentials for monitoring

### Security

- **Close unused tabs** - Reduces attack surface
- **Clear containers** - Removes old containers periodically
- **Monitor expiration** - Replace credentials before expiry
- **Use SSO** - More secure than long-term credentials

### Performance

- **Search instead of scroll** - Faster for large lists
- **Favorites for common profiles** - One-click access
- **Recent section** - Quick re-access to previous profiles

### Multiple Regions

- **Bookmark strategy** - Open multiple regions, bookmark each
- **Container naming** - Same profile → same container → all regions in one place
- **Region in URL** - Easy to see which region you're in

## Keyboard Navigation

While extension popup is open:

- **Type** - Auto-focuses search box, start filtering
- **Tab** - Navigate between elements
- **Enter** - Activate focused element (open profile)
- **Escape** - Close popup

## Browser Container Features

Firefox containers created by the extension have these features:

### Visual Identification
- **Color-coded tabs** - Easy to distinguish accounts
- **Container name** - Shows in tab bar
- **Icon** - Container icon on tab

### Isolation
- **Separate cookies** - No cross-contamination
- **Separate local storage** - Profile-specific data
- **Separate cache** - Independent caching
- **Separate history** - Within-container browsing history

### Management
- **Long-lived** - Containers persist until cleared
- **Tab grouping** - Multiple tabs can share container
- **Independent** - Doesn't affect other Firefox containers

## Troubleshooting Common Issues

### Profile Not Opening

**Symptoms:** Click profile, nothing happens

**Solutions:**
1. Check browser console (F12) for errors
2. Verify credentials exist in `~/.aws/credentials`
3. Check network connectivity
4. Restart Firefox

See [Troubleshooting Guide](troubleshooting.md) for more details.

### Credentials Expired

**Symptoms:** "Expired" status shown

**Solutions:**
- **Credential-based**: Refresh credentials with your credential manager
- **SSO**: Run `aws sso login --profile <name>`

### Wrong Account Opens

**Symptoms:** Different account than expected

**Solutions:**
1. Check profile name in `~/.aws/credentials`
2. Verify correct profile was clicked
3. Clear containers and try again

### Container Not Isolated

**Symptoms:** Accounts seem to share sessions

**Solutions:**
1. Verify different profiles have different containers
2. Check container colors in tab bar
3. Clear all containers and recreate
4. Restart Firefox

## Advanced Usage

### Custom Color Configuration

To customize container colors, edit the native messaging bridge:

```python
# In ~/.local/bin/aws_profile_bridge.py or source file
def get_profile_color(self, profile_name):
    name_lower = profile_name.lower()

    # Add custom rules
    if 'mycompany-prod' in name_lower:
        return 'red'
    # ... etc
```

### Multiple Credential Sources

Use environment-specific credential files:

```bash
# Development credentials
cp ~/.aws/credentials-dev ~/.aws/credentials
# Use extension normally

# Production credentials
cp ~/.aws/credentials-prod ~/.aws/credentials
# Use extension normally
```

### Scripted Profile Management

Generate AWS credentials programmatically and use extension to open them:

```bash
# Script generates credentials
your-credential-script.sh > ~/.aws/credentials

# Open Firefox extension
# Profiles automatically detected
```

## Best Practices

1. **Use SSO when possible** - More secure than long-term credentials
2. **Star important profiles** - Quick access to critical accounts
3. **Descriptive naming** - "company-env-purpose" format
4. **Monitor expiration** - Refresh before expiry
5. **Clear old containers** - Periodic cleanup
6. **Close unused tabs** - Reduce memory usage
7. **Use search** - Faster than scrolling
8. **Review security docs** - Understand credential handling

## Next Steps

- [Learn about profiles](profiles.md)
- [Manage containers](containers.md)
- [Troubleshooting](troubleshooting.md)
- [Security overview](../security/overview.md)
