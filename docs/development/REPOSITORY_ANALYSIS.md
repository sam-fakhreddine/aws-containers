# AWS Containers Repository - Comprehensive Structure Overview

## Executive Summary

This is a Firefox extension project with a TypeScript/React frontend and Python native messaging backend. The repository has **~5,000 lines of TypeScript** and well-organized documentation, but exhibits several organizational anti-patterns that warrant restructuring.

---

## 1. ROOT DIRECTORY ORGANIZATION

### Current Layout
The root contains 23 configuration files and 4 executable scripts:

**Configuration Files (16 files):**
- `.eslintrc.js` - ESLint config
- `.prettierrc.js` - Prettier formatting
- `.gitattributes`, `.gitignore` - Git configuration
- `.npmrc` - NPM configuration
- `babel.config.js` - Babel transpiler config
- `commitlint.config.js` - Conventional commits validation
- `jest.config.js` - Jest test runner config
- `tsconfig.json` - TypeScript configuration
- `webpack.common.js`, `webpack.dev.js`, `webpack.prod.js` - Webpack bundler configs (3 files)
- `.releaserc.json` - Semantic Release configuration
- `package.json`, `package-lock.json` - NPM dependencies

**Build/Deployment Scripts (4 files):**
- `install.sh` - Installation script
- `build-native-host.sh` - Builds Python native messaging host
- `test-api-server.sh` - Tests native messaging
- `migrate-to-new-repo.sh` - Migration script (legacy)

**Documentation Files (8 files):**
- `README.md`, `SECURITY.md`, `QUICKSTART.md`, `INSTALL.md`, `MIGRATION.md`, `REBUILD_NOTES.md`
- `CHANGELOG.md` (auto-generated)
- `aws-console-containers.png` (logo image - 1MB)

**Issue:** Root is cluttered. Best practice would be to move build scripts and configs into subdirectories.

---

## 2. DIRECTORY STRUCTURE

```
aws-containers/
├── .github/
│   └── workflows/
│       ├── build-extension.yml
│       └── build-release.yml
├── .husky/
│   ├── commit-msg
│   └── pre-commit
├── bin/
│   └── linux/
│       └── (placeholder for pre-built executables)
├── dist/
│   ├── js/ (generated)
│   ├── img/
│   ├── manifest.json
│   ├── popup.html
│   ├── opener.html
│   ├── popup.css (generated)
│   └── .web-extension-id
├── docs/
│   ├── api/
│   │   ├── extension-api.md
│   │   └── api-server.md
│   ├── development/
│   │   ├── architecture.md
│   │   ├── building.md
│   │   ├── contributing.md
│   │   └── testing.md
│   ├── getting-started/
│   │   ├── first-steps.md
│   │   ├── installation.md
│   │   └── quick-start.md
│   ├── security/
│   │   ├── best-practices.md
│   │   ├── overview.md
│   │   └── privacy.md
│   ├── user-guide/
│   │   ├── containers.md
│   │   ├── features.md
│   │   ├── profiles.md
│   │   ├── troubleshooting.md
│   │   └── usage.md
│   ├── conf.py
│   ├── index.md
│   ├── .readthedocs.yaml
│   └── requirements.txt
├── api-server/
│   ├── src/
│   │   └── aws_profile_bridge/
│   │       ├── __init__.py
│   │       ├── aws_profile_bridge.py (main app)
│   │       ├── native_messaging.py
│   │       ├── file_parsers.py
│   │       ├── sso_manager.py
│   │       ├── credential_provider.py
│   │       ├── profile_metadata.py
│   │       └── console_url_generator.py
│   ├── tests/
│   │   ├── test_aws_profile_bridge.py
│   │   ├── test_console_url_generator.py
│   │   ├── test_file_parsers.py
│   │   ├── test_native_messaging.py
│   │   ├── test_profile_metadata.py
│   │   └── test_sso_manager.py
│   ├── setup.py
│   ├── requirements.txt
│   ├── pytest.ini
│   ├── .gitignore
│   ├── aws_profile_bridge.json (native messaging manifest)
│   └── README.md
├── scripts/
│   └── update-version.js
├── src/
│   ├── __mocks__/
│   │   └── webextension-polyfill.ts
│   ├── __testUtils__/
│   │   └── helpers.ts
│   ├── constants/
│   │   ├── index.ts
│   │   └── index.test.ts
│   ├── opener/
│   │   ├── index.ts
│   │   ├── index.test.ts
│   │   ├── containers.ts
│   │   ├── containers.test.ts
│   │   ├── parser.ts
│   │   ├── parser.test.ts
│   │   ├── tabs.ts
│   │   ├── tabs.test.ts
│   │   ├── validator.ts
│   │   └── validator.test.ts
│   ├── popup/
│   │   ├── index.tsx
│   │   ├── index.test.tsx
│   │   ├── awsProfiles.tsx
│   │   └── awsProfiles.test.tsx
│   ├── scss/
│   │   ├── app.scss
│   │   ├── bootstrap.scss
│   │   ├── main.scss
│   │   ├── _variables.scss
│   │   ├── components/
│   │   │   └── _popup.scss
│   │   └── README.md
│   ├── types/
│   │   └── index.ts
│   ├── backgroundPage.ts
│   ├── backgroundPage.test.ts
│   └── setupTests.ts
└── (configuration files and docs in root)
```

---

## 3. BUILD SYSTEM ORGANIZATION

### Webpack Configuration

**Location:** Root directory (3 files)
- `webpack.common.js` - Common config for all builds
- `webpack.dev.js` - Development build (smaller, with source maps)
- `webpack.prod.js` - Production build (optimized)

**Entry Points (from webpack.common.js):**
```javascript
entry: {
    opener: "src/opener/index.ts",
    backgroundPage: "src/backgroundPage.ts",
    popup: "src/popup/index.tsx",
}
```

**Output:** `dist/js/` with filenames: `opener.js`, `backgroundPage.js`, `popup.js`

### NPM Build Scripts (package.json)
```json
"build:transpile": "webpack --config webpack.prod.js",
"build:update-version": "node scripts/update-version.js",
"build:package": "web-ext build --source-dir ./dist/ --overwrite-dest",
"build": "run-s build:transpile build:update-version build:package",
"dev": "webpack -w --config webpack.dev.js",
```

**Issue:** Build scripts and webpack configs scattered in root. Better to organize in `config/` or `build/` directory.

### CSS/SCSS Build Pipeline
- Source: `src/scss/` (6 files)
- Loader chain: Sass → CSS → Style-loader → injected into JavaScript
- Output: Embedded in JS bundles (not separate CSS files)
- Manifest entry: References HTML files, not CSS

### Other Build Tools
- **Babel** (babel.config.js) - For Jest transformation
- **TypeScript** (tsconfig.json) - Compilation to ES5
- **Jest** (jest.config.js) - Test runner with 74-76% coverage threshold
- **Web-ext** - Firefox extension packaging

---

## 4. CONFIGURATION FILES LOCATIONS

### Root Level (Current)
| File | Purpose |
|------|---------|
| `.eslintrc.js` | TypeScript/React linting rules |
| `.prettierrc.js` | Code formatting configuration |
| `.gitattributes` | Git line ending handling |
| `.gitignore` | Git exclusions |
| `.npmrc` | NPM registry configuration |
| `.releaserc.json` | Semantic Release versioning |
| `babel.config.js` | Babel transpilation |
| `commitlint.config.js` | Conventional commits validation |
| `jest.config.js` | Test runner configuration |
| `tsconfig.json` | TypeScript compiler options |

### Build Configs (Root)
| File | Purpose |
|------|---------|
| `webpack.common.js` | Webpack base config |
| `webpack.dev.js` | Webpack development config |
| `webpack.prod.js` | Webpack production config |
| `package.json` | Node.js metadata & scripts |
| `package-lock.json` | Dependency lock file |

### CI/CD
- `.github/workflows/build-extension.yml` - Builds on PR to main
- `.github/workflows/build-release.yml` - Builds on releases
- `.husky/pre-commit` - Runs linter before commits
- `.husky/commit-msg` - Validates commit message format

### Python Configuration (api-server/)
- `setup.py` - Python package configuration
- `requirements.txt` - Python dependencies
- `pytest.ini` - Test runner configuration
- `aws_profile_bridge.json` - Firefox native messaging manifest

### Documentation
- `docs/.readthedocs.yaml` - Read the Docs configuration
- `docs/conf.py` - Sphinx documentation configuration

---

## 5. EXTENSION SOURCE CODE STRUCTURE

### Architecture Overview

```
Extension = Popup UI + Content Script + Background Page + Native Messaging
```

#### A. **Popup (src/popup/)**
- **Component:** `AWSProfilesPopup` (FunctionComponent in React 19)
- **Files:**
  - `index.tsx` (25 lines) - Simple entry point
  - `awsProfiles.tsx` (400+ lines) - All UI logic
  - `index.test.tsx` - Tests for entry
  - `awsProfiles.test.tsx` - Tests for main component
- **Functionality:**
  - Profile listing with search
  - Favorites & recent profiles tracking
  - Region selector dropdown
  - Container management UI
  - Native messaging communication
  - Local storage for preferences
- **Issue:** Single monolithic component handles all UI, state, and business logic

#### B. **Opener (src/opener/)**
- **Purpose:** Opens tabs in Firefox containers with AWS console URLs
- **Files (8 files, all modular):**
  - `index.ts` - Entry point
  - `containers.ts` - Container preparation logic
  - `parser.ts` - URL parameter parsing
  - `tabs.ts` - Tab opening logic
  - `validator.ts` - Parameter validation
  - Plus test files for each module
- **Good:** Well-separated concerns, single responsibility

#### C. **Background Page (src/)**
- **File:** `backgroundPage.ts` (22 lines)
- **Purpose:** Minimal message listener for popup mount notifications
- **Test:** `backgroundPage.test.ts`
- **Good:** Lightweight, clear responsibility

#### D. **Types (src/types/)**
- **File:** `index.ts` - All shared interfaces
  - `AWSProfile` - Profile metadata
  - `Container` - Container config
  - `AWSRegion` - Region definition
  - `NativeMessageRequest/Response` - IPC types
  - Parameter validation types
- **Issue:** Types are centralized but popup has its own duplicate `AWSProfile` interface

#### E. **Constants (src/constants/)**
- **File:** `index.ts` - Shared constants
  - AWS regions list (10 regions)
  - Container colors (8 colors)
  - Container icons (8+ icons)
- **Test:** `index.test.ts`

#### F. **Styling (src/scss/)**
- **Files:**
  - `main.scss` - Main entry point
  - `app.scss` - App styles
  - `bootstrap.scss` - Bootstrap imports
  - `_variables.scss` - SCSS variables
  - `components/_popup.scss` - Popup-specific styles
  - `README.md` - SCSS documentation
- **Build:** Webpack injects styles via style-loader

#### G. **Test Utilities (src/__testUtils__)**
- `helpers.ts` - Shared test helper functions

#### H. **Test Mocks (src/__mocks__)**
- `webextension-polyfill.ts` - Mock browser API for testing

---

## 6. NATIVE MESSAGING (Python Backend)

### Structure
```
api-server/
├── src/aws_profile_bridge/
│   ├── aws_profile_bridge.py (Main application - ~150 lines)
│   ├── native_messaging.py (Protocol handling - ~100 lines)
│   ├── file_parsers.py (AWS config parsing - ~200 lines)
│   ├── sso_manager.py (SSO token management - ~250 lines)
│   ├── credential_provider.py (Orchestration - ~100 lines)
│   ├── profile_metadata.py (Color/icon rules - ~150 lines)
│   └── console_url_generator.py (AWS federation URLs - ~100 lines)
├── tests/ (6 test files, 100% mocked)
├── setup.py (Package configuration)
└── requirements.txt (3 dependencies: boto3, requests, jwctoken)
```

### Architecture Principles
- **SOLID principles** - Each class has single responsibility
- **DRY** - Shared INI parsing via base class
- **KISS** - Short methods, minimal nesting
- **Type hints** - Throughout for IDE support
- **100% mocked tests** - No file system or network dependencies

### Python Dependencies (3 main packages)
- `boto3` - AWS SDK
- `requests` - HTTP client
- `jwctoken` - JWT handling for SSO

---

## 7. ORGANIZATIONAL ISSUES & ANTI-PATTERNS

### Issue 1: Root Directory Clutter ⚠️
**Problem:**
- 23 configuration files in root
- 4 executable scripts in root
- 8 markdown documentation files in root
- Logo image (1MB) in root

**Best Practice:**
- Move configs to `config/` or `.config/`
- Move scripts to `scripts/` (already has update-version.js)
- Move docs to `docs/` (already exists - move root .md files there)
- Move images to `docs/assets/` or `src/assets/`

**Example structure:**
```
config/
├── webpack/
│   ├── common.js
│   ├── dev.js
│   └── prod.js
├── .eslintrc.js
├── .prettierrc.js
├── jest.config.js
├── tsconfig.json
└── babel.config.js
```

---

### Issue 2: Test Files Colocated With Source ⚠️
**Current Structure:**
```
src/
├── opener/
│   ├── index.ts
│   ├── index.test.ts          ← Colocated
│   ├── containers.ts
│   ├── containers.test.ts     ← Colocated
│   └── ...
└── popup/
    ├── index.tsx
    ├── index.test.tsx         ← Colocated
    └── ...
```

**Best Practice:** Move to `__tests__/` or separate `tests/` directory

**Benefits:**
- Clear separation of source and test code
- Makes build/distribution cleaner
- Standard in many projects
- Can exclude entire directory from builds

**Proposed Structure:**
```
src/
├── opener/
│   ├── index.ts
│   ├── containers.ts
│   ├── parser.ts
│   └── ...
└── popup/
    ├── index.tsx
    └── awsProfiles.tsx

__tests__/
├── opener/
│   ├── index.test.ts
│   ├── containers.test.ts
│   ├── parser.test.ts
│   └── ...
└── popup/
    ├── index.test.tsx
    └── awsProfiles.test.tsx
```

---

### Issue 3: Duplicate Type Definitions ⚠️
**Problem:**
- `src/types/index.ts` defines `AWSProfile` interface
- `src/popup/awsProfiles.tsx` also defines its own `AWSProfile` interface (line 4-13)
- Causes inconsistency and maintenance issues

**Best Practice:**
- Use single source of truth
- Import types from centralized location
- Use discriminated unions for variations

**Example:**
```typescript
// src/types/index.ts
export interface AWSProfile {
    name: string;
    has_credentials: boolean;
    expiration: string | null;
    expired: boolean;
    color: string;
    icon: string;
    is_sso?: boolean;
    sso_start_url?: string;
}

// src/popup/awsProfiles.tsx
import { AWSProfile } from "@src/types";
```

---

### Issue 4: Monolithic Popup Component ⚠️
**Problem:**
- `src/popup/awsProfiles.tsx` is 400+ lines
- Mixes:
  - UI rendering
  - State management (11+ useState hooks)
  - Business logic (profile loading, filtering, favorites)
  - Native messaging communication
  - Container management
  - Browser storage operations

**Best Practice:**
- Extract business logic to custom hooks
- Separate container management code
- Use composition over monolithic components

**Proposed Refactoring:**
```
src/popup/
├── components/
│   ├── ProfileList.tsx
│   ├── ProfileSearch.tsx
│   ├── RegionSelector.tsx
│   ├── ContainerManager.tsx
│   └── FavoriteButton.tsx
├── hooks/
│   ├── useProfiles.ts (load, cache, refresh)
│   ├── useFavorites.ts (manage favorites)
│   ├── useRecentProfiles.ts (track recent)
│   ├── useNativeMessaging.ts (IPC)
│   └── useContainers.ts (container mgmt)
├── awsProfiles.tsx (Main component, orchestration only)
└── index.tsx
```

---

### Issue 5: CSS Separated From Components 🔄
**Current:**
```
src/
├── scss/
│   ├── main.scss
│   ├── app.scss
│   ├── _variables.scss
│   └── components/
│       └── _popup.scss
└── popup/
    └── awsProfiles.tsx
```

**Alternative (CSS-in-JS or co-location):**
- Modern projects use CSS modules or styled-components
- Current setup works but makes maintaining styles harder
- CSS is not tree-shakeable

**Consider:**
- If staying with SCSS: organize by component
- If using CSS Modules: co-locate with components
- If using styled-components: embed in components

---

### Issue 6: Build Scripts in Root ⚠️
**Current:**
```
├── build-native-host.sh
├── test-api-server.sh
├── migrate-to-new-repo.sh (legacy)
└── install.sh
```

**Best Practice:**
```
scripts/
├── build-native-host.sh
├── test-api-server.sh
├── install.sh
└── (legacy scripts in archive/)
```

---

### Issue 7: No Clear Separation of Concerns for Entry Points
**Current:**
- `src/opener/index.ts` - Clear and good
- `src/backgroundPage.ts` - Single-purpose, good
- `src/popup/index.tsx` - Simple, but awsProfiles.tsx is heavy

**Suggestion:**
- Consider moving layout/container logic to separate files
- Keep index.tsx as thin entry point

---

### Issue 8: TypeScript Paths Alias Not Fully Used
**tsconfig.json defines:**
```json
"@src/*": ["src/*"]
```

**But:**
- webpack.common.js also defines it
- Sometimes used, sometimes relative imports
- Could be more consistent

**Improvement:**
- Use `@src/` consistently throughout
- Add more semantic aliases like `@components/`, `@hooks/`, `@utils/`

---

### Issue 9: Build Output Not Staged in Version Control
**Current:**
- `dist/` folder is generated by build
- `web-ext-artifacts/` generated for packaging
- `.gitignore` excludes them (correct)

**But:**
- HTML files in `dist/` seem to be hand-written
- These should be in `src/` with their own build process

**Issue: HTML files are in dist/ but should be in src/**

---

### Issue 10: No Organized Error Handling or Logging
**Problem:**
- Error handling scattered throughout components
- No centralized error boundary
- Logging uses `console.log`

**Suggestion:**
```
src/
├── utils/
│   ├── logger.ts
│   └── errorHandler.ts
└── components/
    └── ErrorBoundary.tsx
```

---

## 8. POSITIVE PATTERNS TO KEEP

### ✅ Well-Organized Documentation
- 21 markdown files
- Clear structure: API, Development, Getting Started, Security, User Guide
- Separate Read the Docs configuration
- Professional and comprehensive

### ✅ Modular Opener Module
- Single responsibility principle
- Each function has clear purpose
- Well-tested with unit tests
- Good example to follow

### ✅ Clean Native Messaging Architecture
- Separation of concerns in Python
- SOLID principles implemented
- Dependency injection throughout
- Comprehensive test coverage (100% mocked)

### ✅ Type Safety
- Full TypeScript configuration
- Strict mode enabled
- Good use of interfaces

### ✅ Testing Setup
- Jest configured properly
- Coverage thresholds defined (74-76%)
- Test utilities organized
- Mock setup included

### ✅ Git Workflow
- Husky pre-commit hooks
- Commitlint for conventional commits
- Semantic Release for versioning
- Branch protection likely on main

### ✅ CI/CD Pipeline
- GitHub Actions workflows for build and release
- Automated version management
- Build artifact storage

---

## SUMMARY TABLE: FILES THAT SHOULD BE GROUPED

| Category | Current Location | Suggested Location | Files |
|----------|-----------------|-------------------|-------|
| **Build Config** | Root | `config/` | webpack.*.js, babel.config.js, tsconfig.json |
| **Code Quality** | Root | `config/` | .eslintrc.js, .prettierrc.js, commitlint.config.js, jest.config.js |
| **Package Config** | Root | Root (OK) | package.json, package-lock.json |
| **Git Config** | Root | Root (OK) | .gitignore, .gitattributes |
| **CI/CD** | `.github/workflows/` | Root (OK) | - |
| **Git Hooks** | `.husky/` | Root (OK) | - |
| **Build Scripts** | Root | `scripts/` | *.sh files |
| **Release Config** | Root | `config/` or Root | .releaserc.json |
| **Test Files** | Colocated with src | `__tests__/` | *.test.ts, *.test.tsx |
| **Documentation** | Root + `docs/` | `docs/` | README.md, SECURITY.md, INSTALL.md, etc. |
| **Assets** | Root | `docs/assets/` or `src/assets/` | *.png |
| **Styles** | `src/scss/` | `src/styles/` or embed in components | *.scss |
| **Types** | `src/types/` | Root (OK) but remove duplicates | index.ts |

---

## RECOMMENDED REORGANIZATION PRIORITY

### High Priority (Impacts Developer Experience)
1. **Move tests to `__tests__/`** - Cleaner structure
2. **Remove duplicate types** - Single source of truth
3. **Refactor popup component** - Break into smaller pieces
4. **Move config files to `config/`** - Cleaner root

### Medium Priority (Maintainability)
5. **Move docs to `docs/`** - Already partially done
6. **Move build scripts to `scripts/`** - Better organization
7. **Add semantic path aliases** - Better imports
8. **Standardize CSS organization** - Better maintainability

### Low Priority (Nice to Have)
9. **Extract custom hooks** - Better reusability
10. **Add error boundary** - Better error handling
11. **Organize utilities** - Better code organization
