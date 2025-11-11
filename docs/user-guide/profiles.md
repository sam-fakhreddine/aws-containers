# Working with AWS Profiles

This guide covers everything about managing and using AWS profiles with the extension.

## Profile Types

### Credential-Based Profiles

Standard AWS profiles with access keys in `~/.aws/credentials`:

```ini
[profile-name]
aws_access_key_id = AKIA...
aws_secret_access_key = wJalr...
aws_session_token = IQoJb3...
# Expires 2024-11-10 15:30:00 UTC
```

**Components:**
- `aws_access_key_id` - Required
- `aws_secret_access_key` - Required
- `aws_session_token` - Optional (for temporary credentials)
- `# Expires ...` - Optional comment for expiration tracking

### SSO Profiles

AWS IAM Identity Center (SSO) profiles in `~/.aws/config`:

```ini
[profile sso-profile-name]
sso_start_url = https://my-sso-portal.awsapps.com/start
sso_region = us-east-1
sso_account_id = 123456789012
sso_role_name = DeveloperAccess
region = us-east-1
```

**SSO Setup:**
1. Configure profile in `~/.aws/config`
2. Run `aws sso login --profile sso-profile-name`
3. Extension uses cached SSO token from `~/.aws/sso/cache/`

## Profile Organization

### Naming Conventions

Use clear, descriptive names:

**Good examples:**
- `company-prod-admin`
- `company-dev-readonly`
- `company-staging-developer`
- `client-prod-support`

**Avoid:**
- `profile1`
- `test`
- `temp`

**Benefits:**
- Easy to search and filter
- Auto color-coding works better
- Reduces mistakes

### Environment Prefixes

Use consistent prefixes for automatic color coding:

- `*-prod-*` or `*-production-*` → Red containers
- `*-stag-*` or `*-staging-*` → Yellow containers
- `*-dev-*` or `*-development-*` → Green containers
- `*-test-*` or `*-qa-*` → Turquoise containers

## Adding Profiles

### Adding Credential-Based Profiles

1. Edit `~/.aws/credentials`:
   ```bash
   nano ~/.aws/credentials
   ```

2. Add new profile:
   ```ini
   [new-profile-name]
   aws_access_key_id = AKIA...
   aws_secret_access_key = ...
   ```

3. Save and close
4. Open extension - new profile appears automatically

### Adding SSO Profiles

1. Edit `~/.aws/config`:
   ```bash
   nano ~/.aws/config
   ```

2. Add SSO profile:
   ```ini
   [profile new-sso-profile]
   sso_start_url = https://portal.awsapps.com/start
   sso_region = us-east-1
   sso_account_id = 123456789012
   sso_role_name = RoleName
   region = us-east-1
   ```

3. Save and close
4. Login to SSO:
   ```bash
   aws sso login --profile new-sso-profile
   ```

5. Open extension - profile appears with "SSO" badge

## Updating Profiles

### Refreshing Credentials

**For credential-based profiles:**
1. Use your credential management tool to generate new credentials
2. Update `~/.aws/credentials` with new values
3. Extension automatically uses updated credentials on next use

**For SSO profiles:**
1. Run `aws sso login --profile <name>` to refresh token
2. Extension automatically uses new token

### Updating Expiration Comments

Add or update expiration comments for monitoring:

```ini
[my-profile]
aws_access_key_id = AKIA...
aws_secret_access_key = ...
aws_session_token = ...
# Expires 2024-12-25 14:30:00 UTC
```

**Format:** `# Expires YYYY-MM-DD HH:MM:SS UTC`

The extension parses this and shows time remaining.

## Removing Profiles

### Removing Credential-Based Profiles

1. Edit `~/.aws/credentials`:
   ```bash
   nano ~/.aws/credentials
   ```

2. Delete the entire profile section:
   ```ini
   # Remove this:
   [old-profile]
   aws_access_key_id = ...
   aws_secret_access_key = ...
   ```

3. Save and close
4. Profile disappears from extension on next refresh

### Removing SSO Profiles

1. Edit `~/.aws/config`:
   ```bash
   nano ~/.aws/config
   ```

2. Delete the profile section
3. Save and close

### Cleaning Up Containers

After removing profiles, clean up their containers:

1. Open extension
2. Click "Containers" tab
3. Click "Clear All Containers"

Or remove individual containers via Firefox settings.

## Profile Features

### Favorites

Star frequently-used profiles:

1. Click the star icon (☆) next to profile
2. Profile moves to "Favorites" section
3. Always appears at top of list
4. Persists across browser restarts

**Use cases:**
- Daily-use accounts
- Critical production accounts
- Primary development environments

### Recent Profiles

Extension automatically tracks last 10 opened profiles:

- Appears in "Recent" section
- Most recent first
- Updates automatically
- Excludes favorites (no duplication)

**Use case:** Quickly re-access accounts you used earlier today.

### Search and Filter

Type to filter profiles in real-time:

- Case-insensitive
- Searches profile names
- Instant results
- Works across all sections

**Examples:**
- Type "prod" → See all production profiles
- Type "dev" → See all development profiles
- Type "client-" → See all client accounts

## Profile Status Indicators

### Valid Credentials (✓)
- Green checkmark
- Shows time remaining
- Ready to use

### Expiring Soon (⚠)
- Yellow warning
- Less than 1 hour remaining
- Should refresh soon

### Expired (✗)
- Red error
- "Expired" displayed
- Must refresh before use

### SSO Token Status
- Shows SSO token expiration
- Run `aws sso login` to refresh

## Best Practices

### Security

1. **Use temporary credentials** - Session tokens with expiration
2. **Regular rotation** - Refresh credentials frequently
3. **Avoid long-term IAM user keys** - Prefer SSO or assumed roles
4. **Monitor expiration** - Use expiration comments
5. **Clear old credentials** - Remove unused profiles

### Organization

1. **Consistent naming** - Use company/environment/purpose format
2. **Descriptive names** - Make purpose clear
3. **Use SSO** - Easier management for multiple accounts
4. **Group by environment** - Prefixes for easy filtering
5. **Document profiles** - Comments in config files

### Workflow

1. **Star important profiles** - Quick access
2. **Use search** - Faster than scrolling
3. **Clean up regularly** - Remove unused profiles
4. **Monitor expiration** - Proactive credential refresh
5. **Separate environments** - Different containers for prod/dev

## Advanced Configuration

### Custom AWS Config Location

If using non-standard AWS config location:

```bash
export AWS_CONFIG_FILE=~/.aws/custom-config
export AWS_SHARED_CREDENTIALS_FILE=~/.aws/custom-credentials
```

The extension reads from default locations only. Use symlinks if needed:

```bash
ln -s ~/.aws/custom-credentials ~/.aws/credentials
ln -s ~/.aws/custom-config ~/.aws/config
```

### Multiple AWS Accounts

Organize multiple AWS Organizations:

```ini
# Organization A
[orga-prod-admin]
...

[orga-dev-developer]
...

# Organization B
[orgb-prod-readonly]
...

[orgb-dev-admin]
...
```

Use search to filter by organization prefix.

### Profile Aliases

Use descriptive names as aliases:

```ini
# Instead of:
[123456789012_AdminRole]
...

# Use:
[company-prod-admin]
...
```

Clear names are easier to work with.

## Troubleshooting

### Profile Not Appearing

**Check:**
1. Profile exists in `~/.aws/credentials` or `~/.aws/config`
2. Profile has correct format with `[profile-name]` header
3. Refresh extension popup

### Can't Open Profile

**Check:**
1. Credentials are valid (not expired)
2. For SSO: Run `aws sso login`
3. Network connectivity
4. Check browser console for errors (F12)

### Wrong Credentials Used

**Check:**
1. Profile name spelling
2. Credentials file has correct format
3. No duplicate profile names
4. Clear containers and try again

### SSO Not Working

**Check:**
1. SSO profile in `~/.aws/config` (not credentials)
2. Ran `aws sso login --profile <name>`
3. SSO token not expired
4. `~/.aws/sso/cache/` directory exists

See [Troubleshooting Guide](troubleshooting.md) for more details.

## Next Steps

- [Learn about container management](containers.md)
- [Read the usage guide](usage.md)
- [Understand security](../security/overview.md)
