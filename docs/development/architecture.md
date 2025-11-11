# Architecture

Technical architecture overview of AWS Profile Containers.

## System Components

```
┌─────────────────────────────────────────────┐
│           Firefox Browser                    │
│  ┌───────────────────────────────────────┐  │
│  │     AWS Profile Containers Extension │  │
│  │                                       │  │
│  │  ┌─────────────┐   ┌──────────────┐  │  │
│  │  │   Popup UI  │   │  Background  │  │  │
│  │  │  (React)    │   │    Page      │  │  │
│  │  └──────┬──────┘   └──────┬───────┘  │  │
│  │         │                 │          │  │
│  │         └─────────┬───────┘          │  │
│  │                   │                  │  │
│  │         ┌─────────▼────────┐         │  │
│  │         │ Container        │         │  │
│  │         │ Management       │         │  │
│  │         └─────────┬────────┘         │  │
│  └───────────────────┼──────────────────┘  │
│                      │ Native Messaging    │
└──────────────────────┼─────────────────────┘
                       │
         ┌─────────────▼──────────────┐
         │  Native Messaging Host     │
         │  (Python/Standalone Binary)│
         │                            │
         │  ┌──────────────────────┐  │
         │  │ Profile Aggregator   │  │
         │  └──────────┬───────────┘  │
         │             │              │
         │  ┌──────────▼───────────┐  │
         │  │ Credential Provider  │  │
         │  └──────────┬───────────┘  │
         │             │              │
         │  ┌──────────▼───────────┐  │
         │  │ Console URL Gen.     │  │
         │  └──────────────────────┘  │
         └─────────────┬──────────────┘
                       │
         ┌─────────────▼──────────────┐
         │    Local Filesystem        │
         │  ~/.aws/credentials        │
         │  ~/.aws/config             │
         │  ~/.aws/sso/cache/         │
         └────────────────────────────┘
                       │
         ┌─────────────▼──────────────┐
         │      AWS APIs (HTTPS)      │
         │  - Federation API          │
         │  - SSO API                 │
         └────────────────────────────┘
```

## Extension Components

### Popup UI (`src/popup/`)

**Technology:** React + TypeScript

**Files:**
- `index.tsx` - Entry point
- `awsProfiles.tsx` - Main UI component

**Responsibilities:**
- Render profile list
- Handle user interactions
- Display favorites/recent/all profiles
- Search and filter
- Region selection
- Communicate with background page

**State Management:**
- Local React state for UI
- Browser storage for persistence (favorites, recent, region)

### Background Page (`src/backgroundPage.ts`)

**Technology:** TypeScript

**Responsibilities:**
- Native messaging communication
- Message routing between popup and native host
- Error handling
- Lifecycle management

**APIs Used:**
- `browser.runtime.connectNative()` - Connect to native host
- `browser.runtime.sendNativeMessage()` - Send messages
- `browser.runtime.onMessage` - Receive from popup

### Container Management (`src/opener/`)

**Files:**
- `containers.ts` - Container operations
- `tabs.ts` - Tab management
- `parser.ts` - URL parsing
- `validator.ts` - Input validation

**Responsibilities:**
- Create Firefox containers
- Assign colors/icons
- Open tabs in containers
- Clear containers

**APIs Used:**
- `browser.contextualIdentities.*` - Container operations
- `browser.tabs.*` - Tab management

## Native Messaging Host

### Architecture

**Implementation:** Python (source) or Standalone executable (PyInstaller)

**Location:**
- **Source:** `native-messaging/src/aws_profile_bridge/`
- **Installed:** `~/.local/bin/aws_profile_bridge`

### Modules

#### Main Application (`aws_profile_bridge.py`)

**Responsibilities:**
- Application entry point
- Wire all components together
- Handle messaging protocol

#### Native Messaging (`native_messaging.py`)

**Classes:**
- `NativeMessagingReader` - Read messages from stdin
- `NativeMessagingWriter` - Write messages to stdout
- `NativeMessagingHost` - Main message loop

**Protocol:**
```
Input: 4-byte length (native byte order) + JSON message
Output: 4-byte length + JSON response
```

#### File Parsers (`file_parsers.py`)

**Classes:**
- `FileCache` - File caching based on mtime
- `INIFileParser` - Base INI parser (DRY)
- `CredentialsFileParser` - Parse `~/.aws/credentials`
- `ConfigFileParser` - Parse `~/.aws/config`
- `ProfileConfigReader` - Read individual profile configs

**Caching:**
- File mtime-based cache
- Invalidates on file modification
- Reduces file I/O

#### SSO Manager (`sso_manager.py`)

**Classes:**
- `SSOTokenCache` - Cache SSO tokens (file + memory)
- `SSOCredentialsProvider` - Fetch credentials via AWS SSO API
- `SSOProfileEnricher` - Add SSO status to profiles

**SSO Flow:**
1. Read SSO config from `~/.aws/config`
2. Find cached token in `~/.aws/sso/cache/`
3. Call AWS SSO API to get role credentials
4. Return temporary credentials

#### Credential Provider (`credential_provider.py`)

**Classes:**
- `CredentialProvider` - Orchestrate credential retrieval
- `ProfileAggregator` - Aggregate profiles from all sources

**Aggregation:**
1. Parse `~/.aws/credentials`
2. Parse `~/.aws/config` (SSO profiles)
3. Merge and deduplicate
4. Enrich with metadata

#### Profile Metadata (`profile_metadata.py`)

**Classes:**
- `MetadataRule` - Base rule (Strategy pattern)
- `KeywordMetadataRule` - Keyword-based mapping
- `ProfileMetadataProvider` - Provide colors/icons

**Color Assignment:**
```python
Patterns:
- "prod|production" → red
- "stag|staging" → yellow
- "dev|development" → green
- "test|qa" → turquoise
- "int|integration" → blue
- "janus" → purple
```

#### Console URL Generator (`console_url_generator.py`)

**Classes:**
- `ConsoleURLGenerator` - Generate federation URLs
- `ProfileConsoleURLGenerator` - High-level interface

**Federation Flow:**
1. Get credentials (access key, secret, session token)
2. Call AWS Federation API:
   ```
   POST https://signin.aws.amazon.com/federation
   Action=getSigninToken
   Session={"sessionId": access_key, ...}
   ```
3. Parse signin token from response
4. Build console URL:
   ```
   https://signin.aws.amazon.com/federation
   ?Action=login&SigninToken=<token>&Destination=<console_url>
   ```

## Data Flow

### Profile List Request

```
1. User clicks extension icon
   ↓
2. Popup sends getProfiles message to background
   ↓
3. Background sends to native host via native messaging
   ↓
4. Native host:
   - Reads ~/.aws/credentials (credential profiles)
   - Reads ~/.aws/config (SSO profiles)
   - Checks SSO token cache
   - Enriches with metadata (colors, icons, expiration)
   ↓
5. Native host returns JSON array of profiles
   ↓
6. Background forwards to popup
   ↓
7. Popup renders profile list
```

### Profile Open Request

```
1. User clicks profile in popup
   ↓
2. Popup sends openProfile message with:
   - profile name
   - region
   ↓
3. Background sends to native host
   ↓
4. Native host:
   - Reads credentials for profile
   - Calls AWS Federation API
   - Generates console URL
   ↓
5. Native host returns console URL
   ↓
6. Background forwards to popup
   ↓
7. Popup:
   - Creates/finds container
   - Opens URL in container tab
```

## Design Patterns

### Strategy Pattern

Used in `ProfileMetadataProvider`:
- `MetadataRule` interface
- Multiple rule implementations
- Runtime selection

### Repository Pattern

Used in file parsers:
- `FileCache` abstracts file access
- Parsers read from cache
- Centralized caching logic

### Dependency Injection

Used throughout native host:
- Components receive dependencies via constructor
- Easy to mock for testing
- Clear dependencies

### Observer Pattern

Used in extension:
- Background page listens for popup messages
- Popup listens for native host responses

## Security Architecture

### Isolation Layers

1. **Browser containers** - Tab-level isolation
2. **Native messaging** - Process isolation
3. **Credential scope** - Never stored, one-time use
4. **Network** - HTTPS only, AWS endpoints only

### Trust Boundaries

```
Extension ←(native messaging)→ Native Host ←(HTTPS)→ AWS
    ↓                              ↓
Local Storage              Local Filesystem
(metadata only)            (credentials)
```

### Attack Surface

**Minimized:**
- No remote code execution
- No credential storage
- Minimal permissions
- Input validation
- No web server

## Performance Considerations

### Caching

- File mtime-based cache (native host)
- Browser local storage (favorites, recent)
- SSO token cache (memory + disk)

### Lazy Loading

- Profiles loaded on popup open (not background)
- Credentials read on-demand (not preloaded)
- Containers created when needed

### Optimization

- Single file read per credential file (cached)
- Minimal DOM updates in React
- Efficient search/filter (client-side)

## Build System

### Extension Build

**Tool:** Webpack

**Entry points:**
- `src/popup/index.tsx` → `dist/popup.js`
- `src/backgroundPage.ts` → `dist/backgroundPage.js`
- `src/opener/index.ts` → `dist/opener.js`

**Loaders:**
- TypeScript (`ts-loader`)
- SCSS (`sass-loader`, `css-loader`, `style-loader`)

**Output:**
- `dist/` directory
- Bundled JavaScript
- Compiled CSS
- Manifest and static assets

### Native Host Build

**Tool:** PyInstaller

**Input:** Python source in `native-messaging/src/`

**Output:** Standalone executable
- Linux: `bin/linux/aws_profile_bridge`
- macOS Intel: `bin/darwin-x86_64/aws_profile_bridge`
- macOS ARM64: `bin/darwin-arm64/aws_profile_bridge`

**Includes:**
- Python runtime
- boto3, botocore
- All dependencies
- ~15-20MB

## Testing Architecture

### Extension Tests

**Framework:** Jest + React Testing Library

**Coverage:**
- Component rendering
- User interactions
- State management
- Native messaging mocks

**Files:**
- `*.test.tsx` - Component tests
- `*.test.ts` - Unit tests
- `__mocks__/` - Mock implementations

### Native Host Tests

**Framework:** pytest

**Coverage:**
- File parsing
- SSO management
- Credential provider
- URL generation
- Native messaging protocol

**Files:**
- `tests/test_*.py` - Unit tests
- Mocked file I/O
- Mocked AWS API calls
- 75%+ coverage

## Deployment Architecture

### Distribution

**Extension:**
- Built locally by user
- Loaded as temporary add-on
- Or signed and distributed as `.xpi`

**Native Host:**
- Pre-built executables in GitHub Releases
- Or built locally with `build-native-host.sh`
- Installed to `~/.local/bin/`

### Installation

**Script:** `install.sh`

**Steps:**
1. Detect platform
2. Find or use existing executable/script
3. Copy to `~/.local/bin/`
4. Create native messaging manifest
5. Build extension (if needed)

### Updates

**Manual update:**
```bash
git pull
npm run build
# Reload extension in Firefox
```

**Future:** Automatic updates via AMO (addons.mozilla.org)

## Further Reading

- [Contributing Guide](contributing.md)
- [Building from Source](building.md)
- [Testing Guide](testing.md)
