# AWS Profile Containers - Architecture Documentation

## Overview

AWS Profile Containers is a Firefox browser extension that enables users to manage multiple AWS profiles with container isolation. The extension integrates with AWS credentials and SSO, automatically creating Firefox containers for each profile to maintain session separation.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Firefox Browser                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Extension (TypeScript/React)               │ │
│  │  ┌──────────────┐  ┌───────────────┐  ┌─────────────┐ │ │
│  │  │   Popup UI   │  │  Background   │  │   Opener    │ │ │
│  │  │  (React)     │  │    Page       │  │   Script    │ │ │
│  │  └──────┬───────┘  └───────┬───────┘  └──────┬──────┘ │ │
│  │         │                  │                  │        │ │
│  └─────────┼──────────────────┼──────────────────┼────────┘ │
│            │                  │                  │          │
│            └──────────────┬───┴──────────────────┘          │
│                           │ Native Messaging API            │
└───────────────────────────┼─────────────────────────────────┘
                            │
                            ▼
            ┌───────────────────────────────┐
            │   Native Messaging Host       │
            │       (Python)                │
            │  ┌─────────────────────────┐  │
            │  │  Profile Reader         │  │
            │  │  SSO Token Manager      │  │
            │  │  Credentials Provider   │  │
            │  └─────────────────────────┘  │
            └───────────────┬───────────────┘
                            │
                            ▼
            ┌───────────────────────────────┐
            │     Filesystem                 │
            │  ~/.aws/credentials            │
            │  ~/.aws/config                 │
            │  ~/.aws/sso/cache/             │
            └────────────────────────────────┘
```

## Component Architecture

### Frontend (TypeScript/React)

#### 1. Popup UI (`src/popup/`)

**Main Component**: `awsProfiles.tsx`
- Orchestrates all hooks and UI components
- Manages state flow between hooks
- Handles profile selection and container creation

**Custom Hooks** (`src/popup/hooks/`):
```typescript
useProfiles()     // Profile loading, caching, native messaging
useFavorites()    // Favorite profile management
useContainers()   // Firefox container CRUD operations
useRecentProfiles() // Recent profile tracking (LRU)
useRegion()       // AWS region selection
```

**UI Components** (`src/popup/components/`):
```typescript
ProfileList       // Renders profile table
ProfileItem       // Individual profile row
ProfileSearch     // Search and region selector
OrganizationTabs  // Tab navigation for SSO orgs
LoadingState      // Loading spinner
ErrorState        // Error display with retry
```

**Architecture Pattern**: Custom Hooks + Presentational Components
- **Hooks** contain all business logic and state management
- **Components** are purely presentational
- **Benefits**: Testable, reusable, maintainable

#### 2. Background Page (`src/backgroundPage.ts`)

- Minimal background script (non-persistent)
- Handles popup mount notifications
- Could be extended for background sync in future

#### 3. Opener Script (`src/opener/`)

**Purpose**: Creates containers and opens AWS Console

**Key Files**:
- `index.ts` - Main opener logic, handles URL opening
- `containers.ts` - Container creation wrapper
- `validator.ts` - URL validation and sanitization
- `tabs.ts` - Tab management utilities
- `parser.ts` - URL parsing utilities

**Container Creation Flow**:
```
1. User clicks profile
2. Opener receives profile metadata (name, color, icon)
3. containerManager.prepareContainer() called
4. Check if container exists
5. Create/update container with specified color & icon
6. Save container ID to managed list
7. Open AWS Console in container tab
```

### Backend (Python)

#### Native Messaging Host (`api-server/src/aws_profile_bridge/`)

**Purpose**: Bridge between extension and AWS credentials

**Key Modules**:

1. **`aws_profile_bridge.py`** - Main entry point
   - Handles native messaging protocol
   - Coordinates profile retrieval
   - Merges credential and SSO profiles

2. **`file_parsers.py`** - AWS file parsing
   - `FileCache` - mtime-based cache invalidation
   - `INIFileParser` - Base parser (DRY principle)
   - `CredentialsFileParser` - Parses `~/.aws/credentials`
   - `ConfigFileParser` - Parses `~/.aws/config`
   - `ProfileConfigReader` - Reads individual profile config

3. **`sso_manager.py`** - SSO token management
   - `SSOTokenCache` - Two-tier cache (memory + file)
   - `SSOCredentialsProvider` - Fetches temporary credentials
   - `SSOProfileEnricher` - Adds expiration metadata

4. **`credential_provider.py`** - Credentials retrieval
   - Fetches credentials from both static and SSO profiles
   - Handles expiration checking

5. **`console_url_generator.py`** - URL generation
   - Generates AWS Console sign-in URLs
   - Handles federation tokens

6. **`profile_metadata.py`** - Container metadata
   - Generates colors from profile names
   - Assigns icons for visual identification

7. **`native_messaging.py`** - Protocol implementation
   - JSON message encoding/decoding
   - stdin/stdout communication
   - Error handling

## Data Flow

### Profile Loading Flow

```
┌─────────────┐
│   User      │
│ opens popup │
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│  useProfiles()   │
│  hook executes   │
└──────┬───────────┘
       │
       ├─── Check cache (browser.storage.local)
       │    └─── If valid (< 5min old) ────► Return cached profiles
       │
       ├─── Cache miss/expired
       │
       ▼
┌──────────────────────────────┐
│  Connect to native host      │
│  browser.runtime            │
│   .connectNative()           │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│  Native messaging host       │
│  (Python)                    │
│                              │
│  1. Read ~/.aws/credentials  │
│  2. Read ~/.aws/config       │
│  3. Check SSO cache         │
│  4. Enrich with metadata    │
│  5. Return profile list     │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│  useProfiles() receives data │
│  1. Sort alphabetically      │
│  2. Save to cache            │
│  3. Update state             │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│  UI renders ProfileList      │
│  with AWSProfile[]           │
└──────────────────────────────┘
```

### Profile Selection Flow

```
┌─────────────┐
│   User      │
│ clicks      │
│  profile    │
└──────┬──────┘
       │
       ▼
┌──────────────────────────────┐
│  handleOpenProfile()         │
│  1. Add to recent profiles   │
│  2. Connect to native host   │
│  3. Request console URL      │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│  Native host generates URL   │
│  1. Get credentials          │
│  2. Get federation token     │
│  3. Build sign-in URL        │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│  Extension receives URL      │
│  + metadata (color, icon)    │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│  prepareContainer()          │
│  1. Lookup existing          │
│  2. Create if missing        │
│  3. Save container ID        │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│  browser.tabs.create()       │
│  Opens AWS Console in        │
│  dedicated container         │
└──────────────────────────────┘
```

## Storage Architecture

### Browser Storage (extension)

**Used for**: Client-side caching and preferences

```typescript
{
  favorites: string[],              // ["profile1", "profile2"]
  recentProfiles: string[],         // ["profile3", "profile1"] (LRU)
  selectedRegion: string,           // "us-east-1"
  cachedProfiles: AWSProfile[],     // Full profile list
  profilesCacheTime: number,        // Timestamp
  containers: string[]              // Managed container IDs
}
```

**Cache Strategy**:
- TTL: 5 minutes
- Invalidation: Manual refresh or TTL expiry
- Benefits: Fast popup load, offline profile viewing

### File System (Python host)

**AWS Credentials**: `~/.aws/credentials`
```ini
[profile-name]
aws_access_key_id = AKIA...
aws_secret_access_key = ...
aws_session_token = ...  # Optional
# Expires 2025-11-11 15:30:00 UTC  # Optional comment
```

**AWS Config**: `~/.aws/config`
```ini
[profile profile-name]
sso_start_url = https://example.awsapps.com/start
sso_region = us-east-1
sso_account_id = 123456789012
sso_role_name = ReadOnlyRole
region = us-east-1
```

**SSO Cache**: `~/.aws/sso/cache/*.json`
```json
{
  "startUrl": "https://example.awsapps.com/start",
  "region": "us-east-1",
  "accessToken": "...",
  "expiresAt": "2025-11-11T23:59:59Z"
}
```

## Caching Strategy

### Multi-Level Cache Architecture

```
┌─────────────────────────────────────────────────────┐
│                Request for Profile Data              │
└──────────────────┬──────────────────────────────────┘
                   │
     ┌─────────────┴─────────────┐
     │  Level 1: Browser Storage │
     │  TTL: 5 minutes           │
     │  Hit Rate: ~80%           │
     └─────────────┬─────────────┘
                   │ Cache Miss
                   ▼
     ┌─────────────────────────────┐
     │  Level 2: Python Memory      │
     │  TTL: 30 seconds (SSO)       │
     │  Hit Rate: ~60%              │
     └─────────────┬───────────────┘
                   │ Cache Miss
                   ▼
     ┌─────────────────────────────┐
     │  Level 3: File mtime Cache   │
     │  Invalidation: mtime change  │
     │  Hit Rate: ~90%              │
     └─────────────┬───────────────┘
                   │ Cache Miss
                   ▼
     ┌─────────────────────────────┐
     │  Level 4: Filesystem Read    │
     │  Parse credentials/config    │
     └─────────────────────────────┘
```

**Benefits**:
- Fast response times (< 50ms typical)
- Minimal file I/O operations
- Automatic invalidation on file changes
- Reduced network calls to AWS SSO

## Extension Manifest Permissions

### Required Permissions

1. **contextualIdentities**
   - Purpose: Create and manage Firefox containers
   - Used in: `src/utils/containerManager.ts`
   - Security: Required for core functionality

2. **cookies**
   - Purpose: Container cookie isolation
   - Used in: Automatic by container API
   - Security: Each container has isolated cookies

3. **tabs**
   - Purpose: Open AWS Console in specific container
   - Used in: `src/opener/tabs.ts`
   - Security: Only creates tabs, doesn't inspect content

4. **storage**
   - Purpose: Cache profiles and user preferences
   - Used in: All hooks (`useFavorites`, `useProfiles`, etc.)
   - Security: Local storage only, no sync

5. **nativeMessaging**
   - Purpose: Communicate with Python host
   - Used in: `src/popup/hooks/useProfiles.ts`
   - Security: Only communicates with specified host

### Allowed Extension ID

Configured in native messaging manifest:
```json
{
  "allowed_extensions": ["aws-profile-containers@yourname.local"]
}
```

**Security**: Only the specified extension can connect to native host.

## Native Messaging Protocol

### Message Format

**Request** (Extension → Python):
```json
{
  "action": "getProfiles"
}
```

```json
{
  "action": "openProfile",
  "profileName": "my-profile"
}
```

**Response** (Python → Extension):
```json
{
  "action": "profileList",
  "profiles": [
    {
      "name": "profile1",
      "has_credentials": true,
      "expiration": null,
      "expired": false,
      "color": "blue",
      "icon": "fingerprint",
      "is_sso": false
    }
  ]
}
```

```json
{
  "action": "consoleUrl",
  "url": "https://signin.aws.amazon.com/federation...",
  "profileName": "profile1",
  "color": "blue",
  "icon": "fingerprint"
}
```

```json
{
  "action": "error",
  "message": "Could not read credentials file"
}
```

### Protocol Implementation

**Extension Side** (`src/popup/hooks/useProfiles.ts`):
```typescript
const port = browser.runtime.connectNative(NATIVE_MESSAGING_HOST_NAME);

port.onMessage.addListener((response: unknown) => {
  if (isProfileListResponse(response)) {
    // Handle profile list
  } else if (isErrorResponse(response)) {
    // Handle error
  }
});

port.postMessage({ action: "getProfiles" });
```

**Python Side** (`api-server/src/aws_profile_bridge/native_messaging.py`):
```python
message = read_message(sys.stdin)
if message['action'] == 'getProfiles':
    profiles = get_all_profiles()
    send_message(sys.stdout, {
        'action': 'profileList',
        'profiles': profiles
    })
```

## Build Pipeline

### Development Build

```bash
npm run dev
# → webpack -w --config config/webpack/webpack.dev.js
```

**Output**:
- `dist/js/opener.js`
- `dist/js/backgroundPage.js`
- `dist/js/popup.js`
- Source maps included
- No minification
- Fast rebuild

### Production Build

```bash
npm run build
# → npm run build:transpile
# → npm run build:update-version
# → npm run build:package
```

**Pipeline**:
1. **Transpile** (`webpack --config config/webpack/webpack.prod.js`)
   - Minification with Terser
   - Tree shaking (removes unused code)
   - Console.log stripping
   - Source maps for debugging

2. **Update Version** (`scripts/build/update-version.js`)
   - Syncs `package.json` version to `manifest.json`

3. **Package** (`web-ext build`)
   - Creates `.zip` file in `web-ext-artifacts/`
   - Ready for Mozilla Add-ons submission

### Bundle Analysis

```bash
npm run build:analyze
# → ANALYZE=true npm run build:transpile
```

Opens interactive bundle visualization showing:
- Module sizes
- Dependency tree
- Optimization opportunities

## Testing Architecture

### Unit Tests

**Framework**: Jest + React Testing Library

**Component Tests**:
- `src/popup/components/__tests__/`
- Tests: Rendering, user interactions, props, edge cases
- Coverage target: 90%+

**Hook Tests**:
- `src/popup/hooks/__tests__/`
- Tests: State management, side effects, error handling
- Mock: `webextension-polyfill`

**Utility Tests**:
- `src/utils/__tests__/`
- Tests: Pure functions, algorithms, edge cases
- Coverage target: 100%

### Integration Tests

- Native messaging protocol
- Profile loading end-to-end
- Container creation flow
- Cache hit/miss scenarios

### E2E Tests (Future)

- Full user workflows
- Browser automation with Playwright
- Real extension loaded in Firefox

## Performance Optimizations

### Frontend Optimizations

1. **React Memoization**
   ```typescript
   const organizations = useMemo(() => {
     // Expensive grouping operation
   }, [profiles]);
   ```

2. **Cache-First Loading**
   - Show cached data immediately
   - Fetch fresh data in background
   - Update UI when new data arrives

3. **Optimized Re-renders**
   - Individual hooks prevent unnecessary re-renders
   - Components only re-render when their props change

### Backend Optimizations

1. **File mtime Caching**
   ```python
   if cached_mtime == current_mtime:
       return cached_data
   ```

2. **In-Memory Token Cache**
   ```python
   self._memory_cache: Dict[str, tuple] = {}
   ```

3. **Hash-Based SSO Lookup**
   ```python
   cache_key = hashlib.sha1(start_url.encode()).hexdigest()
   # O(1) lookup instead of O(n) search
   ```

### Build Optimizations

1. **Tree Shaking** - Removes unused code
2. **Code Splitting** - Separate entry points
3. **Minification** - Reduces bundle size by 20-30%
4. **Scope Hoisting** - Concatenates modules

## Security Considerations

See `docs/security.md` for detailed security documentation.

**Key Security Features**:
- URL validation prevents XSS
- Native messaging restricts communication
- Container isolation prevents cross-contamination
- No credential storage in extension
- Error messages sanitized

## Future Architecture Enhancements

### Planned Improvements

1. **Service Worker Migration**
   - Migrate from background page to service worker
   - Required for Manifest V3

2. **Profile Sync**
   - Optional cloud sync for favorites/recent
   - Encrypted storage

3. **Advanced Caching**
   - IndexedDB for larger datasets
   - Background refresh

4. **WebSocket Communication**
   - Replace polling with push updates
   - Real-time credential expiration alerts

5. **Multi-Browser Support**
   - Chrome/Edge using different APIs
   - Shared core logic

## Deployment Architecture

### Extension Distribution

1. **Mozilla Add-ons (AMO)**
   - Automatic updates
   - Signed by Mozilla
   - Discovery through add-on store

2. **Manual Installation**
   - Development/testing
   - Enterprise deployments
   - Custom builds

### Native Host Distribution

1. **Pre-built Binaries**
   - PyInstaller standalone executables
   - Platform-specific (Linux, macOS Intel, macOS ARM)
   - No Python required

2. **Python Script**
   - Requires Python 3.8+
   - Dependencies: boto3, botocore
   - Manual installation

## Configuration Management

### Extension Configuration

**Hardcoded** (constants.ts):
```typescript
CACHE_DURATION_MS = 5 * 60 * 1000
MAX_RECENT_PROFILES = 10
```

**User Preferences** (browser.storage):
```typescript
selectedRegion: string
favorites: string[]
```

### Native Host Configuration

**Environment Variables**:
```bash
EXTENSION_ID="custom-id@example.com" ./install.sh
```

**Manifest Configuration**:
```json
{
  "allowed_extensions": ["$EXTENSION_ID"]
}
```

## Monitoring & Debugging

### Extension Debugging

1. **about:debugging**
   - Load temporary extension
   - Inspect popup
   - View background logs

2. **Browser Console**
   - Popup console (F12)
   - Background page console
   - Error tracking

### Native Host Debugging

1. **Log File**: `/tmp/aws_profile_bridge.log`
   ```python
   logging.basicConfig(
       level=logging.ERROR,
       handlers=[logging.FileHandler('/tmp/aws_profile_bridge.log')]
   )
   ```

2. **Manual Testing**:
   ```bash
   echo '{"action":"getProfiles"}' | python aws_profile_bridge.py
   ```

## Conclusion

The AWS Profile Containers extension employs a clean, modular architecture with clear separation of concerns. The frontend uses modern React patterns with custom hooks, while the backend leverages efficient caching and file parsing. Security is built-in at every layer, and the system is designed for both performance and maintainability.
