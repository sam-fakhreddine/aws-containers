# Container Management

Guide to managing Firefox containers created by AWS Profile Containers extension.

## What are Containers?

Firefox containers isolate browsing data between tabs:

- **Separate cookies** - No session sharing
- **Separate local storage** - Independent data
- **Separate cache** - No cache contamination
- **Visual identification** - Color-coded tabs

## How Containers Work with AWS Profiles

### Automatic Container Creation

When you click an AWS profile:

1. Extension checks if container exists for this profile
2. If not, creates a new container with:
   - Name: Profile name
   - Color: Auto-assigned based on profile name
   - Icon: Default AWS icon
3. Opens AWS Console URL in the container

### Container Naming

Containers are named after their AWS profile:

- Profile: `company-prod-admin`
- Container: `company-prod-admin`

This makes them easy to identify in tabs and settings.

### Container Colors

Automatically assigned based on profile name:

| Profile Name Contains | Color | Use Case |
|-----------------------|-------|----------|
| prod, production | Red | Production accounts |
| stag, staging | Yellow | Staging environments |
| dev, development | Green | Development accounts |
| test, qa | Turquoise | Testing environments |
| int, integration | Blue | Integration environments |
| janus | Purple | Janus accounts |

Custom colors can be configured by modifying the native messaging bridge.

## Managing Containers

### Viewing Containers

Via extension:
1. Click extension icon
2. Click "Containers" tab
3. See all AWS profile containers and their colors

Via Firefox:
1. Open Firefox settings
2. Navigate to Privacy & Security
3. Scroll to "Cookies and Site Data"
4. Click "Manage Permissions"
5. See all containers

### Clearing Containers

**Clear all via extension:**
1. Click extension icon
2. Click "Containers" tab
3. Click "Clear All Containers"
4. Confirm action

**Warning:** This closes all tabs using those containers.

**Clear individual containers:**
1. Firefox settings → Containers
2. Find the container
3. Click "Remove"

### Container Persistence

Containers persist across Firefox restarts:
- Data remains until container is cleared
- Can accumulate over time
- Periodic cleanup recommended

## Container Features

### Isolation Benefits

Each container provides:

- **Session isolation** - Can't accidentally mix accounts
- **Cookie separation** - No cross-contamination
- **Security** - Limits scope of XSS/CSRF attacks
- **Organization** - Visual distinction between accounts

### Multiple Tabs Per Container

One container can have multiple tabs:

1. Open profile → Tab opens in container
2. Open extension, select different region
3. Click same profile → New tab in same container
4. Both tabs share the container (same account, different regions)

### Visual Identification

Tabs show container information:

- **Color bar** - Top of tab colored by container
- **Container name** - Visible in tab management
- **Consistent across tabs** - All tabs in container have same color

## Advanced Container Management

### Customizing Container Colors

Edit the native messaging bridge to customize colors:

Location: `~/.local/bin/aws_profile_bridge.py` or source file

```python
def get_profile_color(self, profile_name):
    name_lower = profile_name.lower()

    # Add custom rules
    if 'mycompany' in name_lower:
        return 'blue'
    if 'client-prod' in name_lower:
        return 'red'
    # ... existing rules
```

Available colors:
- `red`, `yellow`, `green`, `blue`, `pink`, `purple`, `turquoise`, `orange`

### Container Icons

Default icon is `fingerprint`. Available icons:

- `fingerprint`, `briefcase`, `dollar`, `cart`, `circle`, `gift`
- `vacation`, `food`, `fruit`, `pet`, `tree`, `chill`

Customize in native messaging bridge:

```python
def get_profile_icon(self, profile_name):
    if 'prod' in profile_name.lower():
        return 'briefcase'
    return 'fingerprint'
```

### Firefox Container Manager

Use Firefox's built-in container manager:

1. Install "Multi-Account Containers" extension (optional, for advanced features)
2. Manage containers visually
3. Set container-specific settings

## Best Practices

### Regular Cleanup

Periodically clear unused containers:

1. Review active containers
2. Identify unused ones (old projects, removed profiles)
3. Clear via extension or Firefox settings

### Naming Strategy

Use clear profile names for better container identification:

- Good: `company-prod-admin` → Container easily identified
- Bad: `profile1` → Container name not descriptive

### Container Reuse

Same profile → same container across sessions:

- Consistent experience
- Bookmarks work across restarts
- History maintained per container

### Security Considerations

Containers provide isolation but:

- **Not encryption** - Data still accessible on disk
- **Not sandboxing** - Same Firefox process
- **Browser-level isolation only** - Not OS-level

Don't rely on containers for cryptographic security.

## Troubleshooting

### Container Not Created

**Symptoms:** Profile opens but no container isolation

**Solutions:**
1. Check Firefox supports containers (version 60+)
2. Restart Firefox
3. Check browser console for errors (F12)
4. Reinstall extension

### Wrong Container Used

**Symptoms:** Profile opens in unexpected container

**Solutions:**
1. Clear all containers
2. Restart Firefox
3. Try opening profile again

### Can't Clear Container

**Symptoms:** Clear Containers button doesn't work

**Solutions:**
1. Close all tabs using those containers
2. Try again
3. Use Firefox settings to remove containers manually

### Container Colors Wrong

**Symptoms:** Unexpected colors assigned

**Solutions:**
1. Check profile naming matches color rules
2. Review native messaging bridge color logic
3. Customize color rules if needed

## Container Limitations

### Firefox-Specific

Containers are a Firefox feature:
- Not available in Chrome/Edge
- Extension requires Firefox 60+

### Per-Profile Limitation

One container per AWS profile:
- Can't have multiple containers for same profile
- All regions for a profile share one container

### Persistence

Containers persist indefinitely:
- Can accumulate over time
- Manual cleanup required
- No automatic expiration

## FAQs

### Q: Can I use containers for non-AWS sites?

**A:** Yes, but this extension only creates containers for AWS profiles. For general container usage, use Firefox's Multi-Account Containers extension.

### Q: Do containers slow down Firefox?

**A:** No significant performance impact. Each container has minimal overhead.

### Q: Can I customize container settings?

**A:** Yes, via Firefox settings or Multi-Account Containers extension.

### Q: What happens if I clear a container while tabs are open?

**A:** Those tabs will close or reload, losing their session.

### Q: Can I export/import containers?

**A:** Not directly. Container settings are stored in Firefox profile. Use Firefox Sync or profile backup for migration.

## Next Steps

- [Learn about profile management](profiles.md)
- [Read the usage guide](usage.md)
- [Understand security](../security/overview.md)
- [Troubleshooting guide](troubleshooting.md)
