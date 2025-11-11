# Repository Reorganization

This document describes the repository reorganization completed on 2025-11-11.

## Overview

The repository has been reorganized to follow industry best practices for a multi-component project (TypeScript/React browser extension + Python native messaging host).

## Changes Made

### 1. Configuration Files Moved to `config/`

The following configuration files have been moved from the root directory to `config/`:

- `.eslintrc.js` → `config/.eslintrc.js`
- `.prettierrc.js` → `config/.prettierrc.js`
- `.prettierignore` → `config/.prettierignore`
- `babel.config.js` → `config/babel.config.js`
- `commitlint.config.js` → `config/commitlint.config.js`
- `.releaserc.json` → `config/.releaserc.json`

**Kept in root** (required by tooling):
- `tsconfig.json` - TypeScript compiler expects this in root
- `jest.config.js` - Jest expects this in root

### 2. Webpack Configuration Organized

Webpack configs moved to `config/webpack/`:

- `webpack.common.js` → `config/webpack/webpack.common.js`
- `webpack.dev.js` → `config/webpack/webpack.dev.js`
- `webpack.prod.js` → `config/webpack/webpack.prod.js`

All configs updated to use correct paths relative to new location.

### 3. Scripts Reorganized

Build and utility scripts moved from root to `scripts/` with proper subdirectories:

- `build-native-host.sh` → `scripts/build/build-native-host.sh`
- `update-version.js` → `scripts/build/update-version.js`
- `test-native-messaging.sh` → `scripts/test/test-native-messaging.sh`
- `migrate-to-new-repo.sh` → `scripts/migrate-to-new-repo.sh`

**Kept in root**:
- `install.sh` - Primary user-facing entry point

### 4. Assets Organized

Static assets moved to proper locations:

- `aws-console-containers.png` → `docs/assets/aws-console-containers.png`

### 5. Directory Structure Created

New directories created:

- `config/` - All build and linting configuration
- `config/webpack/` - Webpack-specific configuration
- `scripts/build/` - Build scripts
- `scripts/test/` - Test scripts
- `docs/assets/` - Documentation assets

## New Repository Structure

```
aws-containers/
├── .github/                    # CI/CD workflows (unchanged)
├── .husky/                     # Git hooks (updated to reference new config paths)
├── bin/                        # Compiled binaries (unchanged)
├── config/                     # ✨ NEW: All configuration files
│   ├── webpack/
│   │   ├── webpack.common.js
│   │   ├── webpack.dev.js
│   │   └── webpack.prod.js
│   ├── .eslintrc.js
│   ├── .prettierrc.js
│   ├── .prettierignore
│   ├── babel.config.js
│   ├── commitlint.config.js
│   └── .releaserc.json
├── docs/                       # Documentation
│   ├── assets/                 # ✨ NEW: Documentation assets (images, etc.)
│   ├── api/
│   ├── development/
│   ├── getting-started/
│   ├── security/
│   └── user-guide/
├── native-messaging/           # Python native messaging host (unchanged)
│   ├── src/
│   ├── tests/
│   ├── setup.py
│   └── requirements.txt
├── scripts/                    # ✨ REORGANIZED: All build/utility scripts
│   ├── build/
│   │   ├── build-native-host.sh
│   │   └── update-version.js
│   ├── test/
│   │   └── test-native-messaging.sh
│   └── migrate-to-new-repo.sh
├── src/                        # Extension source code (unchanged)
│   ├── __mocks__/
│   ├── __testUtils__/
│   ├── constants/
│   ├── opener/
│   ├── popup/
│   ├── scss/
│   └── types/
├── dist/                       # Build output (unchanged, gitignored)
├── web-ext-artifacts/          # Extension packages (unchanged, gitignored)
├── .gitignore
├── .npmrc
├── install.sh                  # Main installation script (kept in root)
├── jest.config.js              # Jest config (kept in root)
├── tsconfig.json               # TypeScript config (kept in root)
├── package.json
├── package-lock.json
├── yarn.lock
├── README.md
├── LICENSE
├── CHANGELOG.md
├── INSTALL.md
├── MIGRATION.md
├── QUICKSTART.md
├── REBUILD_NOTES.md
└── SECURITY.md
```

## Updated References

All references to moved files have been updated in:

- `package.json` - Script commands updated to reference new config paths
- `.husky/commit-msg` - Updated to reference `config/commitlint.config.js`
- `.github/workflows/*.yml` - Updated to reference new semantic-release config
- `install.sh` - Updated to reference new script paths
- `README.md` - Updated image and script references
- `config/webpack/webpack.common.js` - Updated to resolve paths from new location
- `scripts/build/update-version.js` - Updated to resolve paths from new location

## Benefits

1. **Cleaner Root Directory**: Reduced configuration file clutter in root
2. **Better Organization**: Related files grouped together logically
3. **Easier Navigation**: Clear separation between source, config, and scripts
4. **Industry Standard**: Follows common patterns used in modern projects
5. **Maintainability**: Easier to find and update configuration files
6. **Scalability**: Better structure for future growth

## Build Verification

- ✅ Build process tested and working
- ✅ All 243 tests passing
- ✅ Webpack compilation successful
- ✅ Test coverage maintained (76% coverage)

## Migration Notes

For developers working with this repository:

1. **Config files** are now in `config/` directory
2. **Build scripts** are in `scripts/build/`
3. **Install script** remains in root: `./install.sh`
4. **Build command** unchanged: `npm run build` or `yarn build`
5. **Test command** unchanged: `npm test` or `yarn test`

## Backward Compatibility

The following remain in their original locations for backward compatibility and tooling requirements:

- `install.sh` - Main entry point
- `tsconfig.json` - Required by TypeScript compiler
- `jest.config.js` - Required by Jest
- `package.json` - NPM standard
- Documentation files (README, LICENSE, etc.)
