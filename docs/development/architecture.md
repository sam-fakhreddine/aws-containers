# Architecture

Technical architecture overview of AWS Profile Containers.

## System Components

```
┌─────────────────────────────────────────────┐
│           Firefox Browser                    │
│  ┌───────────────────────────────────────┐  │
│  │     AWS Profile Containers Extension │  │
│  │         (Built with WXT)             │  │
│  │                                       │  │
│  │  ┌─────────────┐   ┌──────────────┐  │  │
│  │  │   Popup UI  │   │  Background  │  │  │
│  │  │  (React)    │   │    Script    │  │  │
│  │  └──────┬──────┘   └──────┬───────┘  │  │
│  │         │                 │          │  │
│  │         └─────────┬───────┘          │  │
│  │                   │                  │  │
│  │         ┌─────────▼────────┐         │  │
│  │         │   API Client     │         │  │
│  │         │  (HTTP/fetch)    │         │  │
│  │         └─────────┬────────┘         │  │
│  │                   │                  │  │
│  │         ┌─────────▼────────┐         │  │
│  │         │ Container        │         │  │
│  │         │ Management       │         │  │
│  │         └─────────┬────────┘         │  │
│  └───────────────────┼──────────────────┘  │
│                      │ HTTP (localhost)    │
└──────────────────────┼─────────────────────┘
                       │
         ┌─────────────▼──────────────┐
         │  HTTP API Server           │
         │  (Python/FastAPI)          │
         │  localhost:10999           │
         │                            │
         │  ┌──────────────────────┐  │
         │  │ Token Auth           │  │
         │  └──────────┬───────────┘  │
         │             │              │
         │  ┌──────────▼───────────┐  │
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

### Build System

**Framework:** WXT (Vite-based)

**Configuration:** `wxt.config.ts`

**Benefits:**
- ⚡ Fast builds with Vite and esbuild
- 🔥 Hot Module Replacement during development
- 📦 Optimized production builds
- 🎯 TypeScript-first with excellent type safety

**Directory Structure:**
```
entrypoints/          # Extension pages (WXT convention)
├── background.ts     # Background script
├── popup/           # Popup UI
├── options/         # Settings page
└── opener/          # AWS Console opener

src/                 # Shared code
├── components/      # React components
├── hooks/          # Custom hooks
├── services/       # API client, utilities
├── utils/          # Helper functions
└── types/          # TypeScript definitions
```

### Popup UI (`entrypoints/popup/`)

**Technology:** React + TypeScript + Cloudscape Design System

**Files:**
- `main.tsx` - Entry point (WXT convention)
- `index.html` - HTML template
- `src/popup/awsProfiles.tsx` - Main UI component
- `src/components/` - Reusable components

**Responsibilities:**
- Render profile list
- Handle user interactions
- Display favorites/recent/all profiles
- Search and filter
- Region selection
- Communicate with API server via HTTP

**State Management:**
- Local React state for UI
- Browser storage for persistence (favorites, recent, region)
- Custom hooks for data fetching

### Background Script (`entrypoints/background.ts`)

**Technology:** TypeScript (wrapped in WXT's `defineBackground()`)

**Responsibilities:**
- Message routing between popup and API server
- Error handling
- Lifecycle management
- Extension initialization

**APIs Used:**
- `browser.runtime.onMessage` - Receive messages from popup
- `browser.storage.local` - Persistent storage
- `fetch()` - HTTP requests to API server

### API Client (`src/services/apiClient.ts`)

**Technology:** TypeScript with fetch API

**Responsibilities:**
- HTTP communication with API server (localhost:10999)
- Token-based authentication
- Request/response handling
- Error handling and retries

**Endpoints:**
- `GET /health` - Health check
- `GET /profiles` - List AWS profiles
- `POST /console-url` - Generate AWS Console URL

**Authentication:**
- Token stored in browser local storage
- Token sent in `X-Auth-Token` header
- Token generated on first API server start

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

## HTTP API Server

### Architecture

**Implementation:** Python with FastAPI

**Location:**
- **Source:** `api-server/src/aws_profile_bridge/`
- **Running:** HTTP server on `localhost:10999`

**Management:**
- Start: `./scripts/manage.sh start`
- Stop: `./scripts/manage.sh stop`
- Status: `./scripts/manage.sh status`
- Logs: `./scripts/manage.sh logs`

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
2. Popup calls API client
   ↓
3. API client sends HTTP GET to localhost:10999/profiles
   - Includes X-Auth-Token header
   ↓
4. API server:
   - Validates token
   - Reads ~/.aws/credentials (credential profiles)
   - Reads ~/.aws/config (SSO profiles)
   - Checks SSO token cache
   - Enriches with metadata (colors, icons, expiration)
   ↓
5. API server returns JSON array of profiles
   ↓
6. API client returns to popup
   ↓
7. Popup renders profile list
```

### Profile Open Request

```
1. User clicks profile in popup
   ↓
2. Popup calls API client with:
   - profile name
   - region
   ↓
3. API client sends HTTP POST to localhost:10999/console-url
   - Includes X-Auth-Token header
   - Body: {"profile": "...", "region": "..."}
   ↓
4. API server:
   - Validates token
   - Reads credentials for profile
   - Calls AWS Federation API
   - Generates console URL
   ↓
5. API server returns console URL
   ↓
6. API client returns to popup
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
Extension ←(HTTP/localhost)→ API Server ←(HTTPS)→ AWS
    ↓                            ↓
Local Storage            Local Filesystem
(metadata + token)       (credentials)
```

**Token Authentication:**
- Token generated on API server first start
- Stored in `~/.aws-profile-bridge/token`
- Extension reads token and includes in requests
- Server validates token on each request

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

**Framework:** WXT (Vite-based)

**Configuration:** `wxt.config.ts`

**Entry points:**
- `entrypoints/popup/main.tsx` → `.output/firefox-mv2/popup.js`
- `entrypoints/background.ts` → `.output/firefox-mv2/background.js`
- `entrypoints/options/main.tsx` → `.output/firefox-mv2/options.js`
- `entrypoints/opener/main.ts` → `.output/firefox-mv2/opener.js`

**Build Process:**
1. TypeScript compilation with type checking
2. React JSX transformation
3. SCSS compilation to CSS
4. Asset optimization and copying
5. Code minification and tree-shaking
6. Manifest generation for Firefox Manifest V2

**Output:**
- `.output/firefox-mv2/` directory
- Optimized JavaScript bundles
- Compiled CSS
- Generated manifest.json
- Static assets (icons, images)

**Commands:**
```bash
# Development (with HMR)
yarn dev

# Production build
yarn build
```

**Performance:**
- 3-5x faster than Webpack
- Hot Module Replacement in development
- Optimized code splitting
- Tree-shaking for smaller bundles

### API Server

**Framework:** Python with FastAPI

**Installation:**
```bash
# Using management script
./scripts/manage.sh install

# Manual with uv
cd api-server && uv pip install -e .
```

**Running:**
```bash
# Start server
./scripts/manage.sh start

# Or manually
python -m aws_profile_bridge.cli server start
```

**Configuration:**
- Binds to `localhost:10999`
- Token-based authentication
- Automatic token generation
- Logging to `~/.aws-profile-bridge/logs/`

## Testing Architecture

### Extension Tests

**Framework:** Jest + React Testing Library + fast-check

**Test Types:**
1. **Unit Tests** - Component and function tests
2. **Property-Based Tests** - Verify correctness properties across many inputs
3. **Integration Tests** - API communication tests

**Coverage:**
- Component rendering
- User interactions
- State management
- API client communication
- Container management

**Files:**
- `*.test.tsx` - Component tests
- `*.test.ts` - Unit tests
- `*.pbt.test.ts` - Property-based tests
- `__mocks__/` - Mock implementations

**Property-Based Tests:**
- Build output equivalence
- Manifest permission preservation
- API communication preservation
- Path alias resolution
- Performance optimizations
- CSS property removal

**Commands:**
```bash
# Run all tests
yarn test

# Run with coverage
yarn test:coverage

# Run property-based tests
yarn test src/__tests__/*.pbt.test.ts
```

### API Server Tests

**Framework:** pytest

**Coverage:**
- File parsing
- SSO management
- Credential provider
- URL generation
- HTTP API endpoints
- Token authentication

**Files:**
- `tests/test_*.py` - Unit tests
- Mocked file I/O
- Mocked AWS API calls
- 90%+ coverage

**Commands:**
```bash
cd api-server

# Run tests
pytest

# Run with coverage
pytest --cov
```

## Deployment Architecture

### Distribution

**Extension:**
- Built locally by user with WXT
- Loaded as temporary add-on from `.output/firefox-mv2/`
- Or signed and distributed as `.xpi`

**API Server:**
- Installed via management script
- Runs as background service
- Python-based, no compilation needed

### Installation

**Quick Install:**
```bash
# Clone repository
git clone https://github.com/sam-fakhreddine/aws-containers.git
cd aws-containers

# Install API server
./scripts/manage.sh install

# Build extension
yarn install
yarn build

# Load in Firefox
# about:debugging → Load Temporary Add-on → .output/firefox-mv2/manifest.json
```

**Management Script:** `./scripts/manage.sh`

**Commands:**
- `install` - Install and start API server
- `start` - Start API server
- `stop` - Stop API server
- `status` - Check server status
- `logs` - View server logs
- `restart` - Restart server

### Updates

**Extension update:**
```bash
git pull
yarn install
yarn build
# Reload extension in Firefox (about:debugging)
```

**API server update:**
```bash
git pull
./scripts/manage.sh restart
```

**Future:** Automatic updates via AMO (addons.mozilla.org)

## Further Reading

- [WXT Migration Guide](WXT_MIGRATION.md) - Details on Webpack to WXT migration
- [Building from Source](building.md) - Build instructions and configuration
- [Contributing Guide](contributing.md) - How to contribute
- [Testing Guide](testing.md) - Testing strategy and guidelines
