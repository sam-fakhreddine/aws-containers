# WXT Migration Guide

This document details the migration from Webpack to WXT Framework for the AWS Profile Containers extension.

## Overview

The extension was successfully migrated from a custom Webpack-based build system to the WXT Framework (Vite-based) while maintaining 100% feature parity and applying critical performance optimizations.

## Why Migrate to WXT?

### Benefits Achieved

- ⚡ **3-5x faster builds**: Vite + esbuild vs Webpack
- 🔥 **Hot Module Replacement**: Instant updates during development
- 🎯 **Better TypeScript support**: First-class TypeScript integration
- 🔧 **Simpler configuration**: Single `wxt.config.ts` vs multiple Webpack configs
- 📦 **Modern tooling**: Built on industry-standard Vite
- 🐛 **Better error messages**: Clear, actionable error reporting

### Performance Improvements

The migration included critical performance optimizations that resolved browser hang issues:

1. **useIsMounted hook**: Stable function references with `useCallback`
2. **ProfileSearch component**: Memoized region options
3. **OrganizationTabs component**: Memoized tabs array
4. **CSS optimizations**: Removed problematic `will-change` properties

## Migration Summary

### What Changed

#### Build System
- **Before**: Webpack 5 with custom configuration
- **After**: WXT Framework with Vite

#### Configuration
- **Before**: Multiple config files (`webpack.common.js`, `webpack.dev.js`, `webpack.prod.js`)
- **After**: Single `wxt.config.ts` file

#### Directory Structure
- **Before**: Entry points in `src/` with HTML in `public/`
- **After**: Entry points in `entrypoints/` with co-located HTML

#### Build Output
- **Before**: `dist/` directory
- **After**: `.output/firefox-mv2/` directory

### What Stayed the Same

- ✅ All functionality identical
- ✅ Same API communication (HTTP to localhost:10999)
- ✅ Same permissions and manifest structure
- ✅ Same React components and hooks
- ✅ Same TypeScript types and utilities
- ✅ Same test suite (Jest + fast-check)

## File Migration Map

### Entrypoints

| Old Location | New Location | Changes |
|-------------|--------------|---------|
| `src/backgroundPage.ts` | `entrypoints/background.ts` | Wrapped in `defineBackground()` |
| `src/popup/index.tsx` | `entrypoints/popup/main.tsx` | Created `index.html` template |
| `src/settings/index.tsx` | `entrypoints/options/main.tsx` | Created `index.html` template |
| `src/opener/index.ts` | `entrypoints/opener/main.ts` | Created `index.html` template |
| `public/popup.html` | `entrypoints/popup/index.html` | Simplified, removed inline scripts |
| `public/settings.html` | `entrypoints/options/index.html` | Simplified, removed inline scripts |
| `public/opener.html` | `entrypoints/opener/index.html` | Simplified, removed inline scripts |

### Shared Code (No Changes)

All files in `src/` remain in the same location:
- `src/components/` - React components
- `src/hooks/` - Custom hooks
- `src/services/` - API client and utilities
- `src/utils/` - Helper functions
- `src/types/` - TypeScript definitions
- `src/scss/` - Stylesheets

### Configuration

| Old Files | New File | Notes |
|-----------|----------|-------|
| `config/webpack/webpack.common.js` | `wxt.config.ts` | Consolidated |
| `config/webpack/webpack.dev.js` | `wxt.config.ts` | Consolidated |
| `config/webpack/webpack.prod.js` | `wxt.config.ts` | Consolidated |
| `config/babel.config.js` | `wxt.config.ts` | Vite handles transpilation |

### Removed Files

These files were removed as they're no longer needed:

```
config/
├── webpack/
│   ├── webpack.common.js
│   ├── webpack.dev.js
│   └── webpack.prod.js
├── babel.config.js
├── .eslintrc.js (moved to root)
└── .prettierrc.js (moved to root)
```

## Code Changes

### Background Script

**Before** (`src/backgroundPage.ts`):
```typescript
let messageListenerRegistered = false;

function handleMessage(request: unknown) {
  // ... logic
}

if (!messageListenerRegistered) {
  browser.runtime.onMessage.addListener(handleMessage);
  messageListenerRegistered = true;
}
```

**After** (`entrypoints/background.ts`):
```typescript
export default defineBackground(() => {
  let messageListenerRegistered = false;

  function handleMessage(request: unknown) {
    // ... logic (unchanged)
  }

  if (!messageListenerRegistered) {
    browser.runtime.onMessage.addListener(handleMessage);
    messageListenerRegistered = true;
  }
});
```

**Change**: Wrapped in WXT's `defineBackground()` function.

### Popup Entrypoint

**Before** (`src/popup/index.tsx`):
```typescript
import React from 'react';
import { createRoot } from 'react-dom/client';
import { AWSProfilesPopup } from './awsProfiles';

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<AWSProfilesPopup />);
```

**After** (`entrypoints/popup/main.tsx`):
```typescript
import React from 'react';
import { createRoot } from 'react-dom/client';
import '@cloudscape-design/global-styles/index.css';
import { AWSProfilesPopup } from '@/popup/awsProfiles';

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<AWSProfilesPopup />);
```

**Changes**:
- Moved to `entrypoints/popup/`
- Added Cloudscape CSS import
- Updated import path to use `@/` alias

### HTML Templates

**Before** (`public/popup.html`):
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>AWS Profiles</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div id="root"></div>
  <script src="popup.js"></script>
</body>
</html>
```

**After** (`entrypoints/popup/index.html`):
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>AWS Profiles</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="./main.tsx"></script>
</body>
</html>
```

**Changes**:
- Removed CSS link (handled by Vite)
- Changed script to module type
- Script points to `main.tsx` (WXT handles bundling)

### Path Aliases

**Before** (relative imports):
```typescript
import { apiClient } from '../../../services/apiClient';
import { useProfiles } from '../../hooks/useProfiles';
```

**After** (path aliases):
```typescript
import { apiClient } from '@/services/apiClient';
import { useProfiles } from '@/hooks/useProfiles';
```

**Configuration** (`wxt.config.ts` and `tsconfig.json`):
```typescript
// wxt.config.ts
resolve: {
  alias: {
    '@': '/src',
    '@src': '/src'
  }
}

// tsconfig.json
"paths": {
  "@/*": ["./src/*"],
  "@src/*": ["./src/*"]
}
```

## Performance Optimizations

### 1. useIsMounted Hook

**File**: `src/hooks/useIsMounted.ts`

**Problem**: Function reference changed on every render, causing unnecessary re-renders.

**Solution**:
```typescript
export function useIsMounted(): () => boolean {
    const isMountedRef = useRef(true);
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);
    // Wrap in useCallback for stable reference
    return useCallback(() => isMountedRef.current, []);
}
```

### 2. ProfileSearch Component

**File**: `src/components/ProfileSearch.tsx`

**Problem**: `regionOptions` and `selectedOption` recalculated on every render.

**Solution**:
```typescript
const regionOptions = useMemo(() => 
  enabledRegions.map(region => ({
    label: region,
    value: region
  })),
  [enabledRegions]
);

const selectedOption = useMemo(() => 
  regionOptions.find(opt => opt.value === selectedRegion),
  [regionOptions, selectedRegion]
);
```

### 3. OrganizationTabs Component

**File**: `src/components/OrganizationTabs.tsx`

**Problem**: `tabs` array recreated on every render.

**Solution**:
```typescript
const tabs = useMemo(() => 
  organizations.map(org => ({
    id: org,
    label: org,
    // ... other properties
  })),
  [organizations, activeTab]
);
```

### 4. CSS will-change Removal

**Files**: `src/components/ProfileItem.tsx`, `src/popup/awsProfiles.tsx`, SCSS files

**Problem**: `will-change` CSS properties caused browser hangs and excessive memory usage.

**Solution**: Removed all instances:
```css
/* REMOVED */
/* will-change: transform; */
/* will-change: scroll-position; */
```

**Why**: The `will-change` property tells browsers to optimize for changes, but overuse causes:
- Excessive memory allocation
- Browser hangs during rendering
- Conflicts with browser's own optimizations

## Configuration Comparison

### Webpack Configuration (Before)

**webpack.common.js** (~100 lines):
```javascript
module.exports = {
  entry: {
    popup: './src/popup/index.tsx',
    backgroundPage: './src/backgroundPage.ts',
    opener: './src/opener/index.ts',
    settings: './src/settings/index.tsx'
  },
  module: {
    rules: [
      { test: /\.tsx?$/, use: 'ts-loader' },
      { test: /\.scss$/, use: ['style-loader', 'css-loader', 'sass-loader'] }
    ]
  },
  plugins: [
    new CopyWebpackPlugin({ patterns: [...] }),
    new DefinePlugin({ __VERSION__: ... })
  ]
  // ... more configuration
};
```

**webpack.dev.js** (~30 lines):
```javascript
module.exports = merge(common, {
  mode: 'development',
  devtool: 'inline-source-map',
  // ... dev-specific config
});
```

**webpack.prod.js** (~40 lines):
```javascript
module.exports = merge(common, {
  mode: 'production',
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin({ ... })]
  }
  // ... prod-specific config
});
```

**Total**: ~170 lines across 3 files

### WXT Configuration (After)

**wxt.config.ts** (~40 lines):
```typescript
import { defineConfig } from 'wxt';
import react from '@vitejs/plugin-react';

export default defineConfig({
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
    ],
    browser_specific_settings: {
      gecko: {
        id: 'aws-profile-containers@samfakhreddine.dev'
      }
    }
  },
  
  vite: () => ({
    plugins: [react()],
    define: {
      __VERSION__: JSON.stringify(process.env.npm_package_version),
      __BUILD_TIMESTAMP__: JSON.stringify(new Date().toISOString().slice(0, 16))
    },
    resolve: {
      alias: {
        '@': '/src',
        '@src': '/src'
      }
    }
  }),
  
  outDir: '.output'
});
```

**Total**: ~40 lines in 1 file (76% reduction)

## Build Commands

### Before (Webpack)

```bash
# Development
npm run dev          # Webpack watch mode

# Production
npm run build        # Webpack production build

# Output
dist/                # Build output directory
```

### After (WXT)

```bash
# Development
yarn dev             # WXT dev server with HMR

# Production
yarn build           # WXT production build

# Output
.output/firefox-mv2/ # Build output directory
```

## Testing

### Test Suite (Unchanged)

All tests continue to work with minimal changes:

```bash
# Unit tests
yarn test

# Property-based tests
yarn test src/__tests__/*.pbt.test.ts

# Coverage
yarn test:coverage
```

### Property-Based Tests

Six property-based tests verify migration correctness:

1. **Build output equivalence**: Core functionality works identically
2. **Manifest permission preservation**: All permissions preserved
3. **API communication**: HTTP to localhost:10999 (no nativeMessaging)
4. **Path alias resolution**: `@/` and `@src/` resolve correctly
5. **Performance optimizations**: All optimizations applied
6. **CSS property removal**: No `will-change` properties remain

## Rollback Plan

If issues arise, rollback is straightforward:

1. **Git revert**: All changes in version control
2. **Webpack branch**: Keep Webpack build on separate branch
3. **Dependencies**: `package.json` tracks all changes

## Success Metrics

✅ **All criteria met**:

- Extension builds without errors
- All unit tests pass (100%)
- All property-based tests pass (6/6)
- Extension loads and runs in Firefox
- All features work identically
- No performance regressions
- Build time improved (3-5x faster)
- Development experience improved (HMR)
- All Webpack configuration removed
- Documentation updated

## Lessons Learned

### What Went Well

1. **WXT conventions**: Clear directory structure made migration straightforward
2. **Vite speed**: Significantly faster builds improved development experience
3. **Type safety**: TypeScript caught issues during migration
4. **Property-based tests**: Verified correctness across many inputs
5. **Performance fixes**: Resolved long-standing browser hang issues

### Challenges

1. **Background script wrapping**: Required understanding WXT's `defineBackground()`
2. **HTML templates**: Needed to create separate HTML files for each entrypoint
3. **Import paths**: Updated many relative imports to use aliases
4. **Build output path**: Updated documentation and scripts for new `.output/` directory

### Recommendations

For future migrations:

1. **Start with configuration**: Get `wxt.config.ts` working first
2. **Migrate incrementally**: One entrypoint at a time
3. **Test frequently**: Run tests after each major change
4. **Use property-based tests**: Verify correctness across many scenarios
5. **Document as you go**: Keep migration notes for documentation

## Resources

- [WXT Documentation](https://wxt.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Migration Spec](.kiro/specs/webpack-to-wxt-migration/)
- [Build Documentation](./building.md)
- [Architecture Documentation](./architecture.md)

## Support

Questions about the migration? See:

- [Building from Source](./building.md)
- [Contributing Guide](./contributing.md)
- [GitHub Issues](https://github.com/sam-fakhreddine/aws-containers/issues)
