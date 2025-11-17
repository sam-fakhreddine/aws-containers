# Features

AWS Profile Containers provides a comprehensive set of features to make managing multiple AWS accounts easier and more secure.

## Core Features

### AWS Console Federation

Automatically generates authenticated AWS Console URLs using the official AWS Federation API.

**How it works:**
1. You click a profile
2. Extension sends profile name to native messaging host
3. Native host reads credentials from `~/.aws/credentials`
4. Native host calls AWS Federation API
5. AWS returns a temporary signin token (12-hour expiry)
6. Extension opens the federated console URL in a container

**Benefits:**
- No manual login required
- Temporary signin tokens (not your raw credentials)
- Official AWS API (secure and supported)
- Works with both IAM users and assumed roles

### Container Isolation

Each AWS profile opens in its own Firefox container for complete isolation.

**What's isolated:**
- Cookies and sessions
- Local storage
- Cache
- Browsing history (within container)

**Benefits:**
- No cross-account contamination
- Can't accidentally perform actions in wrong account
- Multiple profiles open simultaneously
- Visual distinction with color coding

**Example use case:**
- Open production account (red container)
- Open development account (green container)
- Open staging account (yellow container)
- All at the same time, all isolated

### Automatic Profile Detection

Automatically discovers AWS profiles from standard AWS configuration files.

**Sources:**
- `~/.aws/credentials` - Credential-based profiles
- `~/.aws/config` - SSO profiles and configuration

**Detection features:**
- Instant profile enumeration
- Credential type detection (static, temporary, SSO)
- Expiration parsing from comments
- SSO token cache integration

### AWS IAM Identity Center (SSO) Support

Full support for AWS IAM Identity Center (formerly AWS SSO) profiles.

**Supported features:**
- SSO profile detection from `~/.aws/config`
- Cached SSO token usage from `~/.aws/sso/cache/`
- Temporary credential generation via AWS SSO API
- Token expiration monitoring

**Workflow:**
1. Configure SSO profile in `~/.aws/config`
2. Run `aws sso login --profile <name>`
3. Extension automatically uses cached token
4. When expired, login again

**Visual indicators:**
- "SSO" badge on SSO profiles
- Token expiration countdown
- Expired status warnings

### Credential Monitoring

Real-time credential expiration tracking for all profile types.

**For credential-based profiles:**
- Parses expiration from comments: `# Expires 2024-11-10 15:30:00 UTC`
- Shows time remaining
- Warns when expiring soon (< 1 hour)
- Marks expired credentials

**For SSO profiles:**
- Monitors SSO token expiration
- Shows token time remaining
- Indicates when re-authentication needed

**Visual indicators:**
- ✓ Green checkmark - Valid
- ⚠ Yellow warning - Expiring soon
- ✗ Red error - Expired
- Clock icon - Time remaining

### Region Selector

Choose your AWS region before opening the console.

**Features:**
- 10 major AWS regions supported:
  - us-east-1 (N. Virginia)
  - us-east-2 (Ohio)
  - us-west-1 (N. California)
  - us-west-2 (Oregon)
  - eu-west-1 (Ireland)
  - eu-west-2 (London)
  - eu-central-1 (Frankfurt)
  - ap-southeast-1 (Singapore)
  - ap-southeast-2 (Sydney)
  - ap-northeast-1 (Tokyo)
- Default: us-east-1
- Selection persists across sessions
- Opens console directly in selected region

**Use case:**
Working with resources in multiple regions? Just change the region selector and click the profile again.

### Smart Color Coding

Automatically assigns colors to containers based on profile name.

**Color mappings:**
- Production profiles → Red
- Staging profiles → Yellow
- Development profiles → Green
- Test/QA profiles → Turquoise
- Integration profiles → Blue
- Janus profiles → Purple
- Other profiles → Various colors

**Detection logic:**
Profile name is checked for keywords:
- "prod", "production" → Red
- "stag", "staging" → Yellow
- "dev", "development" → Green
- "test", "qa" → Turquoise
- "int", "integration" → Blue
- "janus" → Purple

**Customization:**
Advanced users can modify color logic in the native messaging bridge.

## UX Enhancements

### Search and Filter

Real-time profile filtering as you type.

**Features:**
- Case-insensitive search
- Instant results
- Searches profile names only
- Auto-focuses on popup open

**Use case:**
Have 50 profiles? Type "prod" to instantly see only production profiles.

### Favorites System

Star your frequently-used profiles for quick access.

**Features:**
- Click star icon to favorite/unfavorite
- Favorites appear at top of list
- Alphabetically sorted within favorites
- Persists across browser restarts
- Stored in browser local storage (profile names only, no credentials)

**Use case:**
Star your 5 most-used accounts, they'll always be at the top.

### Recent Profiles

Automatic tracking of recently opened profiles.

**Features:**
- Tracks last 10 opened profiles
- Chronological order (most recent first)
- Automatically updated on each profile open
- Persists across sessions
- No configuration needed

**Use case:**
Quickly re-open accounts you used earlier today without searching.

### Smart Profile Organization

Profiles automatically organized into three sections:

**1. Favorites (⭐)**
- Your starred profiles
- Alphabetically sorted
- Always at the top

**2. Recent (🕐)**
- Last 10 opened profiles
- Most recent first
- Excludes favorites (to avoid duplication)

**3. All Profiles**
- All other profiles
- Alphabetically sorted
- Complete list

**Visual layout:**
```
┌─────────────────────┐
│ ⭐ FAVORITES        │
│  - prod-admin       │
│  - dev-main         │
├─────────────────────┤
│ 🕐 RECENT           │
│  - staging-test     │
│  - qa-validation    │
├─────────────────────┤
│ ALL PROFILES        │
│  - account-a        │
│  - account-b        │
│  ...                │
└─────────────────────┘
```

### Container Management Tab

Dedicated tab for managing Firefox containers.

**Features:**
- View all AWS profile containers
- See total container count
- Clear all containers at once
- Safely removes only AWS profile containers

**Use case:**
Spring cleaning? Clear out old containers you're no longer using.

## Advanced Features

### Native Messaging Bridge

Secure communication between extension and local filesystem.

**What it does:**
- Reads AWS credentials securely
- Calls AWS Federation API
- Returns federated console URLs
- Never stores credentials

**Implementation:**
- Standalone executable (no Python needed on user systems)
- Local-only operation
- Communicates only with this extension
- See [Native Messaging API](../api/api-server.md) for details

### Automated Builds

GitHub Actions workflow for building releases.

**Features:**
- Builds standalone executables for all platforms
- Runs tests automatically
- Creates release packages
- Semantic versioning
- Automated changelog generation

**Platforms:**
- Linux (x86_64)
- macOS Intel (x86_64)
- macOS Apple Silicon (ARM64)

## Security Features

### Minimal Permissions

Extension requests only necessary permissions:

```json
{
  "permissions": [
    "contextualIdentities",  // Create/manage containers
    "cookies",               // Container isolation
    "tabs",                  // Open tabs in containers
    "storage",               // Store favorites/recent
    "nativeMessaging"        // Read credentials
  ]
}
```

No broad permissions like `<all_urls>` or unnecessary access.

### No Credential Storage

**What's NOT stored:**
- AWS Access Keys
- AWS Secret Keys
- Session Tokens
- Console URLs (contain temporary tokens)
- Any sensitive credential data

**What IS stored:**
- Profile names (for favorites/recent)
- Region selection
- Container IDs (for cleanup)

All stored data is non-sensitive metadata only.

### Local-Only Credential Access

Credentials never leave your machine except to AWS:

1. Extension → Native host: Profile name only
2. Native host → AWS API: Credentials (HTTPS to AWS only)
3. AWS API → Native host: Temporary signin token
4. Native host → Extension: Console URL with token
5. Extension → Browser: Opens URL

**No third-party servers contacted.**

### Audit Trail

Open source code allows full auditing:
- All credential handling visible in source
- Native messaging bridge is readable Python
- Extension code is TypeScript (compiles to readable JavaScript)
- No obfuscation
- No telemetry

See [Security Overview](../security/overview.md) for complete details.

## Compatibility

### Browsers
- Firefox 60+ (tested on latest versions)
- Chrome/Edge: Not supported (different extension APIs)

### Operating Systems
- Linux: Fully supported
- macOS Intel: Fully supported
- macOS Apple Silicon (M1/M2/M3): Fully supported
- Windows: Planned for future release

### AWS Services
- AWS IAM: Fully supported
- AWS IAM Identity Center (SSO): Fully supported
- AWS Federation API: Official AWS service
- AWS SSO API: Official AWS service

### Python (Optional)
- Not required if using standalone executable
- Python 3.8+ if building from source
- boto3/botocore: Bundled in executable, or install separately

## Performance

- **Profile loading**: Instant (reads files once on popup open)
- **Search/filter**: Real-time (no lag)
- **Profile opening**: 1-2 seconds (depends on AWS API response)
- **Container creation**: Instant (native Firefox API)
- **Memory usage**: Minimal (~10-20MB for native host executable)

## Limitations

Current limitations:

1. **Firefox only** - Uses Firefox-specific container APIs
2. **macOS binaries unsigned** - Requires Gatekeeper bypass (code signing planned)
3. **No Windows support** - Planned for future release
4. **10 regions** - Covers major regions, more can be added
5. **Manual SSO login** - Must run `aws sso login` separately (cannot automate browser SSO flow)

## Roadmap

Planned features:

- Windows support
- Code signing for macOS binaries
- More AWS regions
- Custom region input
- Profile groups/categories
- Export/import favorites
- Keyboard shortcuts
- Dark mode
- Profile notes/descriptions

See [GitHub Issues](https://github.com/sam-fakhreddine/aws-containers/issues) for feature requests and development progress.
