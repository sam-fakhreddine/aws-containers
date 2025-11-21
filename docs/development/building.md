# Building from Source

Complete guide to building AWS Profile Containers from source.

## Build System

This extension uses the **WXT Framework** - a modern, Vite-powered framework for building web extensions. WXT provides:

- ⚡ Fast builds with Vite and esbuild
- 🔥 Hot Module Replacement (HMR) during development
- 📦 Optimized production builds with automatic code splitting
- 🎯 TypeScript-first with excellent type safety
- 🔧 Simple configuration with sensible defaults

### Why WXT?

WXT replaced our previous Webpack-based build system to provide:
- **Faster builds**: 3-5x faster than Webpack
- **Better DX**: Instant HMR and better error messages
- **Modern tooling**: Built on Vite, the industry standard
- **Simpler config**: Single `wxt.config.ts` vs multiple Webpack configs

## Prerequisites

### Required
- Node.js 22.14.0+ or 24.10.0+
- npm or yarn
- Git

### Optional
- Python 3.12+ (for API server)
- uv (Python package manager, recommended)

## Quick Build

```bash
# Clone repository
git clone https://github.com/sam-fakhreddine/aws-containers.git
cd aws-containers

# Install Node dependencies
yarn install

# Build extension
yarn build

# Output: .output/ directory
```

## Building the Extension

### Development Build

Development builds include source maps, faster compilation, and Hot Module Replacement (HMR):

```bash
# Start development server with HMR
yarn dev

# Or build once without HMR
yarn build --mode development
```

**What happens during development:**
1. WXT starts Vite dev server
2. Extension is built to `.output/firefox-mv2/`
3. File watcher monitors for changes
4. HMR updates extension without full reload (when possible)
5. Source maps included for debugging

**Development features:**
- ⚡ Instant updates with HMR
- 🐛 Full source maps for debugging
- 📊 Detailed build information
- 🔍 Better error messages

### Production Build

Production builds are optimized, minified, and ready for distribution:

```bash
# Build for production
yarn build

# Or explicitly specify production mode
yarn build --mode production
```

**What happens during production build:**
1. TypeScript compilation with type checking
2. React JSX transformation
3. SCSS compilation to CSS
4. Asset optimization and copying
5. Code minification and tree-shaking
6. Manifest generation for Firefox Manifest V2
7. Source map generation (external)

**Production optimizations:**
- 📦 Code splitting for optimal loading
- 🗜️ Minification with esbuild
- 🌳 Tree-shaking to remove unused code
- 🎯 Optimized chunk sizes
- 📉 Reduced bundle size

### Output Structure

WXT builds create `.output/` directory:

```
.output/
└── firefox-mv2/              # Firefox Manifest V2 build
    ├── manifest.json         # Generated manifest
    ├── background.js         # Background script
    ├── popup.html           # Popup page
    ├── popup.js             # Popup script
    ├── options.html         # Settings page
    ├── options.js           # Settings script
    ├── opener.html          # Opener page
    ├── opener.js            # Opener script
    ├── content-scripts/     # Content scripts (if any)
    ├── chunks/              # Shared code chunks
    └── icons/               # Extension icons
```

### Build Configuration

The build is configured in `wxt.config.ts`:

```typescript
import { defineConfig } from 'wxt';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Target Firefox with Manifest V2
  manifest: {
    manifest_version: 2,
    permissions: [
      'contextualIdentities',
      'cookies',
      'storage',
      'tabs',
      'alarms',
      'http://127.0.0.1:10999/*',
      'http://localhost:10999/*'
    ]
  },
  
  // Vite configuration
  vite: () => ({
    plugins: [react()],
    define: {
      __VERSION__: JSON.stringify(process.env.npm_package_version),
      __BUILD_TIMESTAMP__: JSON.stringify(new Date().toISOString())
    },
    resolve: {
      alias: {
        '@': '/src',
        '@src': '/src'
      }
    }
  })
});
```

### Path Aliases

The build system supports path aliases for cleaner imports:

```typescript
// Instead of relative imports
import { apiClient } from '../../../services/apiClient';

// Use path aliases
import { apiClient } from '@/services/apiClient';
import { useProfiles } from '@src/hooks/useProfiles';
```

Both `@/` and `@src/` resolve to the `src/` directory.

## Building the API Server

The extension communicates with a local Python API server via HTTP (localhost:10999).

### Using the Management Script (Recommended)

```bash
# Install and start API server
./scripts/manage.sh install

# Check status
./scripts/manage.sh status

# View logs
./scripts/manage.sh logs

# Stop server
./scripts/manage.sh stop
```

### Manual Installation

```bash
cd api-server

# Install with uv (recommended)
uv pip install -e .

# Or with pip
pip install -e .

# Start server
python -m aws_profile_bridge.cli server start
```

The API server:
- Binds to `localhost:10999` only
- Reads AWS credentials from `~/.aws/credentials`
- Provides token-based authentication
- Handles AWS Console URL federation

📖 See [API Server README](../api-server/README.md) for details

## Loading in Firefox

### Development Mode

1. Build the extension: `yarn dev` (or `yarn build`)
2. Open Firefox
3. Navigate to `about:debugging#/runtime/this-firefox`
4. Click "Load Temporary Add-on"
5. Select `.output/firefox-mv2/manifest.json`

The extension will reload automatically when you make changes (with HMR in dev mode).

### Production Testing

1. Build for production: `yarn build`
2. Follow the same steps above
3. Test with the production build from `.output/firefox-mv2/`

## Verification

### Test API Server

```bash
# Check API server status
./scripts/manage.sh status

# Test API connectivity
curl http://localhost:10999/health

# Should return: {"status": "healthy"}
```

### Test Extension

1. Click the extension icon in Firefox toolbar
2. Verify profiles are listed
3. Click a profile to open AWS Console
4. Verify container is created with correct color/icon

### Run Tests

```bash
# Run all tests
yarn test

# Run with coverage
yarn test:coverage

# Run property-based tests
yarn test src/__tests__/*.pbt.test.ts
```

## Project Structure

### Directory Layout

```
project-root/
├── wxt.config.ts              # WXT build configuration
├── tsconfig.json              # TypeScript configuration
├── package.json               # Node dependencies and scripts
│
├── entrypoints/               # WXT entrypoints (extension pages)
│   ├── background.ts          # Background script
│   ├── popup/                 # Popup page
│   │   ├── index.html
│   │   └── main.tsx
│   ├── options/               # Settings page
│   │   ├── index.html
│   │   └── main.tsx
│   └── opener/                # AWS Console opener
│       ├── index.html
│       └── main.ts
│
├── src/                       # Shared source code
│   ├── components/            # React components
│   │   ├── ProfileItem.tsx
│   │   ├── ProfileList.tsx
│   │   ├── ProfileSearch.tsx
│   │   └── ...
│   ├── hooks/                 # Custom React hooks
│   │   ├── useProfiles.ts
│   │   ├── useContainers.ts
│   │   └── ...
│   ├── services/              # API and browser services
│   │   ├── apiClient.ts       # HTTP API client
│   │   ├── browserUtils.ts
│   │   └── config.ts
│   ├── utils/                 # Utility functions
│   │   ├── containerManager.ts
│   │   └── profiles.ts
│   ├── types/                 # TypeScript definitions
│   │   └── index.ts
│   ├── scss/                  # Stylesheets
│   │   ├── main.scss
│   │   └── components/
│   └── __tests__/             # Test files
│       ├── *.test.ts          # Unit tests
│       └── *.pbt.test.ts      # Property-based tests
│
├── public/                    # Static assets
│   └── icons/                 # Extension icons
│
├── .output/                   # Build output (generated)
│   └── firefox-mv2/           # Firefox Manifest V2 build
│
├── api-server/                # Python API server
│   ├── src/
│   ├── tests/
│   └── pyproject.toml
│
└── docs/                      # Documentation
```

### Migration from Webpack

This project was migrated from Webpack to WXT. Here's what changed:

#### Files Moved

| Old Location | New Location | Notes |
|-------------|--------------|-------|
| `src/backgroundPage.ts` | `entrypoints/background.ts` | Wrapped in `defineBackground()` |
| `src/popup/index.tsx` | `entrypoints/popup/main.tsx` | Created `index.html` |
| `src/settings/index.tsx` | `entrypoints/options/main.tsx` | Created `index.html` |
| `src/opener/index.ts` | `entrypoints/opener/main.ts` | Created `index.html` |
| `public/popup.html` | `entrypoints/popup/index.html` | Simplified template |
| `public/settings.html` | `entrypoints/options/index.html` | Simplified template |
| `public/opener.html` | `entrypoints/opener/index.html` | Simplified template |

#### Files Removed

- `config/` - All Webpack configuration files
- `config/webpack/webpack.common.js`
- `config/webpack/webpack.dev.js`
- `config/webpack/webpack.prod.js`
- `config/babel.config.js`
- Webpack-related dependencies from `package.json`

#### Files Added

- `wxt.config.ts` - Single WXT configuration file
- `entrypoints/` directory structure
- HTML templates for each entrypoint

#### Shared Code

All shared code remains in `src/` with the same structure:
- Components, hooks, services, utils, types - unchanged
- Import paths updated to use `@/` or `@src/` aliases
- No functional changes to shared code

### Performance Optimizations Applied

During the migration, several performance optimizations were applied:

#### 1. useIsMounted Hook
**File**: `src/hooks/useIsMounted.ts`

**Optimization**: Wrapped returned function in `useCallback` to maintain stable reference.

```typescript
// Before: Function reference changed on every render
return () => isMountedRef.current;

// After: Stable function reference
return useCallback(() => isMountedRef.current, []);
```

**Impact**: Prevents unnecessary re-renders in components using this hook.

#### 2. ProfileSearch Component
**File**: `src/components/ProfileSearch.tsx`

**Optimization**: Wrapped `regionOptions` and `selectedOption` in `useMemo`.

```typescript
const regionOptions = useMemo(() => 
  enabledRegions.map(region => ({ ... })),
  [enabledRegions]
);
```

**Impact**: Prevents recalculation on every render.

#### 3. OrganizationTabs Component
**File**: `src/components/OrganizationTabs.tsx`

**Optimization**: Wrapped `tabs` array creation in `useMemo`.

```typescript
const tabs = useMemo(() => 
  organizations.map(org => ({ ... })),
  [organizations, activeTab]
);
```

**Impact**: Prevents array recreation on every render.

#### 4. CSS will-change Removal
**Files**: Various component and SCSS files

**Optimization**: Removed all `will-change` CSS properties.

```css
/* Removed from ProfileItem and other components */
/* will-change: transform; */
/* will-change: scroll-position; */
```

**Impact**: Prevents browser hangs and excessive memory usage. The `will-change` property can cause performance issues when overused.

### Why These Optimizations Matter

These optimizations specifically address browser hang issues that were occurring in the Webpack version:

1. **Stable References**: Using `useCallback` and `useMemo` prevents unnecessary re-renders
2. **Reduced Calculations**: Memoization prevents expensive recalculations
3. **Better Browser Performance**: Removing `will-change` prevents browser optimization conflicts

## Platform-Specific Notes

### Linux

No special considerations for building.

### macOS

No special considerations for building. The API server runs natively with Python.

### Windows

Not currently supported. Use WSL2 for development on Windows.

## Troubleshooting

See [Troubleshooting Guide](../user-guide/troubleshooting.md) for build issues.

## Next Steps

- [Contributing Guide](contributing.md)
- [Testing Guide](testing.md)
- [Architecture](architecture.md)
