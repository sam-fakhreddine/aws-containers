# Systematic Fixes TODO List
## AWS Containers - Performance, Efficiency, Security & Code Quality Improvements

**Generated**: 2025-11-11
**Total Issues**: 47
**Tracking Branch**: claude/work-in-progress-011CV2U2qNgTPEUDAa78PNhX

---

## 🔴 PHASE 1: CRITICAL FIXES (Week 1-2)
*Priority: HIGH | Impact: HIGH | Effort: Medium*

### 1.1 Security & Type Safety

- [ ] **S-001**: Replace all `any` types with proper TypeScript interfaces
  - File: `src/popup/awsProfiles.tsx` (lines 119, 182, 210)
  - File: `src/opener/validator.ts` (multiple locations)
  - File: `src/__mocks__/webextension-polyfill.ts:5`
  - Action: Define `ProfileResponse`, `StorageData`, and other interfaces
  - Success Criteria: Zero `any` types in src/ directory

- [ ] **S-002**: Add comprehensive error handling for storage operations
  - File: `src/popup/awsProfiles.tsx:88-102, 230`
  - Action: Wrap all `browser.storage` calls in try-catch blocks
  - Action: Add user-friendly error messages
  - Success Criteria: All async storage operations have error handling

- [ ] **S-003**: Add error handling for Promise operations
  - File: `src/popup/awsProfiles.tsx:157-168, 307-315`
  - Action: Wrap `Promise.all` and async functions in try-catch
  - Success Criteria: No unhandled promise rejections

- [ ] **S-004**: Fix URL validation vulnerabilities
  - File: `src/opener/validator.ts:65-77`
  - Action: Explicitly validate protocol (reject `javascript:`, `data:`, `file:`)
  - Action: Don't auto-correct invalid URLs
  - Action: Return validation errors instead of throwing
  - Success Criteria: Security test passes for XSS/injection attempts

- [ ] **S-005**: Fix error message information disclosure
  - File: `src/opener/index.ts:6-7`
  - Action: Sanitize error messages before displaying to users
  - Action: Log full errors to console only in dev mode
  - Success Criteria: No file paths or stack traces shown to users

- [ ] **S-006**: Fix exception swallowing in Python code
  - File: `native-messaging/src/aws_profile_bridge/native_messaging.py:72, 105`
  - Action: Log exceptions with proper context
  - Action: Return specific error types instead of None
  - Success Criteria: All exceptions logged, never silently swallowed

- [ ] **S-007**: Add type guards for runtime validation
  - File: `src/popup/awsProfiles.tsx:90-92`
  - Action: Create `isStringArray()` and other type guard functions
  - Action: Validate data from storage before using
  - Success Criteria: All type assertions replaced with type guards

---

### 1.2 Code Quality Fundamentals

- [ ] **Q-001**: Extract all magic numbers to named constants
  - File: `src/popup/awsProfiles.tsx`
    - Line 97: `5 * 60 * 1000` → `CACHE_DURATION_MS`
    - Line 176: `10` → `MAX_RECENT_PROFILES`
    - Line 207: `400` → `POPUP_WIDTH_THRESHOLD`
  - File: `native-messaging/src/aws_profile_bridge/sso_manager.py:23`
    - `30` → `CACHE_TTL_SECONDS`
  - Success Criteria: No magic numbers in codebase

- [ ] **Q-002**: Remove production console.log statements
  - File: `src/backgroundPage.ts:19`
  - Action: Configure webpack to strip console.log in production
  - Action: Replace with proper logging framework
  - Success Criteria: No debug logs in production build

- [ ] **Q-003**: Fix empty catch blocks
  - File: `src/opener/validator.ts:72`
  - Action: Add logging or explanatory comments
  - Success Criteria: All catch blocks handle errors appropriately

- [ ] **Q-004**: Add TypeScript strict mode
  - File: `tsconfig.json`
  - Action: Enable `"strict": true` and fix resulting errors
  - Success Criteria: TypeScript strict mode enabled without errors

---

## 🟡 PHASE 2: REFACTORING & EFFICIENCY (Week 3-4)
*Priority: HIGH | Impact: MEDIUM | Effort: High*

### 2.1 Component Refactoring

- [ ] **R-001**: Create focused component structure
  - Current: `src/popup/awsProfiles.tsx` (620 lines, 12+ state variables)
  - Action: Split into multiple components:
    ```
    src/popup/
      ├── components/
      │   ├── ProfileList.tsx
      │   ├── ProfileSearch.tsx
      │   ├── OrganizationTabs.tsx
      │   ├── ProfileItem.tsx
      │   └── LoadingState.tsx
      ├── hooks/
      │   ├── useProfiles.ts
      │   ├── useFavorites.ts
      │   ├── useRecentProfiles.ts
      │   ├── useContainers.ts
      │   └── useProfileCache.ts
      ├── utils/
      │   └── profileFormatter.ts
      └── awsProfiles.tsx (main orchestrator, <150 lines)
    ```
  - Success Criteria: Each component <200 lines, single responsibility

- [ ] **R-002**: Extract ProfileList component
  - Action: Create `src/popup/components/ProfileList.tsx`
  - Responsibility: Render list of profiles with favorites/organizations
  - Success Criteria: ProfileList renders correctly with props

- [ ] **R-003**: Extract ProfileSearch component
  - Action: Create `src/popup/components/ProfileSearch.tsx`
  - Responsibility: Search and filter profiles
  - Success Criteria: Search functionality works independently

- [ ] **R-004**: Extract OrganizationTabs component
  - Action: Create `src/popup/components/OrganizationTabs.tsx`
  - Responsibility: Handle organization grouping and tab switching
  - Success Criteria: Tab switching works without main component

- [ ] **R-005**: Create custom hooks for data management
  - Action: Create `src/popup/hooks/useProfiles.ts`
  - Responsibility: Profile loading, caching, and refreshing
  - Success Criteria: Main component uses hook for all profile operations

- [ ] **R-006**: Create custom hook for favorites
  - Action: Create `src/popup/hooks/useFavorites.ts`
  - Responsibility: Manage favorite profiles (add, remove, persist)
  - Success Criteria: Favorites logic isolated in reusable hook

- [ ] **R-007**: Create custom hook for containers
  - Action: Create `src/popup/hooks/useContainers.ts`
  - Responsibility: Container creation, refresh, and management
  - Success Criteria: Container logic isolated in reusable hook

---

### 2.2 Code Deduplication

- [ ] **D-001**: Deduplicate container management code
  - Files:
    - `src/opener/containers.ts:65-84`
    - `src/popup/awsProfiles.tsx:21-39`
  - Action: Create `src/utils/containerManager.ts`
  - Action: Extract shared functions:
    - `prepareContainer(profile, color)`
    - `saveContainerId(profile, cookieStoreId)`
    - `getContainerColor(profile)`
  - Success Criteria: Single source of truth for container operations

- [ ] **D-002**: Deduplicate color generation code
  - File: `src/opener/containers.ts:37-47, 54-58`
  - Action: Move to `src/utils/colorGenerator.ts`
  - Action: Make consistent with Python bridge colors
  - Success Criteria: Single color generation algorithm used everywhere

- [ ] **D-003**: Remove unused imports
  - File: `src/constants/index.ts:5`
  - Action: Remove unused `AWSRegion` import
  - Action: Enable ESLint rule `no-unused-vars`
  - Success Criteria: ESLint passes with no unused imports

- [ ] **D-004**: Choose single package manager
  - Files: `package-lock.json` and `yarn.lock`
  - Action: Choose npm or yarn, remove other lock file
  - Action: Document choice in README
  - Success Criteria: Only one lock file in repository

---

### 2.3 Performance Optimizations

- [ ] **P-001**: Implement file-watcher based cache invalidation
  - File: `src/popup/awsProfiles.tsx:95-101`
  - Action: Compare mtime of `~/.aws/credentials` with cached timestamp
  - Action: Invalidate cache immediately when file changes detected
  - Success Criteria: Credentials update within 1 second of file change

- [ ] **P-002**: Eliminate redundant profile sorting
  - File: `src/popup/awsProfiles.tsx:122-124, 242-285`
  - Action: Sort profiles once during data fetch
  - Action: Use sorted data throughout component lifecycle
  - Success Criteria: Profiles sorted only once per load

- [ ] **P-003**: Add memoization for expensive computations
  - File: `src/popup/awsProfiles.tsx`
  - Action: Memoize `formatExpiration` function with `useMemo`
  - Action: Memoize filtered/sorted profile lists
  - Success Criteria: Render performance improved by 20%+

- [ ] **P-004**: Optimize recent profiles array operations
  - File: `src/popup/awsProfiles.tsx:173-176`
  - Action: Check if profile already first before reconstructing array
  - Action: Early return if no change needed
  - Success Criteria: Unnecessary array operations eliminated

- [ ] **P-005**: Add in-memory TTL cache for Python file operations
  - File: `native-messaging/src/aws_profile_bridge/file_parsers.py:16-43`
  - Action: Add memory cache layer before stat() calls
  - Action: Reduce filesystem operations by 50%+
  - Success Criteria: Cache hit rate >70% for repeated reads

- [ ] **P-006**: Optimize SSO cache search
  - File: `native-messaging/src/aws_profile_bridge/sso_manager.py:91-105`
  - Action: Implement indexed cache or improve hash algorithm
  - Action: Reduce fallback linear search frequency
  - Success Criteria: Cache lookups O(1) in 95%+ cases

---

### 2.4 Configuration Management

- [ ] **C-001**: Expand AWS regions to complete list
  - File: `src/popup/awsProfiles.tsx:54-65`
  - Action: Move to `src/constants/awsRegions.ts`
  - Action: Add all 26+ AWS regions (current: only 10)
  - Regions to add:
    - af-south-1 (Cape Town)
    - ap-east-1 (Hong Kong)
    - ap-northeast-3 (Osaka)
    - ap-south-1 (Mumbai)
    - ap-south-2 (Hyderabad)
    - ap-southeast-3 (Jakarta)
    - ap-southeast-4 (Melbourne)
    - ca-central-1 (Canada)
    - eu-central-2 (Zurich)
    - eu-south-1 (Milan)
    - eu-south-2 (Spain)
    - il-central-1 (Tel Aviv)
    - me-south-1 (Bahrain)
    - me-central-1 (UAE)
    - sa-east-1 (São Paulo)
  - Success Criteria: All AWS commercial regions available

- [ ] **C-002**: Make extension ID configurable
  - File: `install.sh:86-96`
  - Action: Use environment variable for extension ID
  - Action: Document configuration in README
  - Success Criteria: Extension ID not hardcoded

---

### 2.5 Webpack Optimization

- [ ] **W-001**: Configure production optimizations
  - File: `config/webpack/webpack.prod.js`
  - Action: Add explicit optimization configuration:
    ```javascript
    optimization: {
        minimize: true,
        minimizer: [new TerserPlugin({...})],
        usedExports: true,
        sideEffects: false,
    }
    ```
  - Success Criteria: Bundle size reduced by 20%+

- [ ] **W-002**: Add bundle analysis
  - Action: Install `webpack-bundle-analyzer`
  - Action: Add npm script `npm run analyze`
  - Success Criteria: Can visualize bundle composition

- [ ] **W-003**: Configure source maps for production
  - Action: Add `devtool: 'source-map'` to prod config
  - Success Criteria: Source maps generated for debugging

- [ ] **W-004**: Strip console.log in production
  - Action: Configure terser to drop console statements
  - Success Criteria: No console.log in production bundle

---

## 🟢 PHASE 3: TESTING & DOCUMENTATION (Week 5-6)
*Priority: MEDIUM | Impact: HIGH | Effort: High*

### 3.1 Unit Tests

- [ ] **T-001**: Write tests for ProfileList component
  - File: `src/popup/components/__tests__/ProfileList.test.tsx`
  - Test cases:
    - Renders list of profiles
    - Shows favorite indicator
    - Handles empty state
    - Handles loading state
    - Calls onClick handler
  - Success Criteria: 90%+ coverage for ProfileList

- [ ] **T-002**: Write tests for ProfileSearch component
  - File: `src/popup/components/__tests__/ProfileSearch.test.tsx`
  - Test cases:
    - Filters profiles by name
    - Filters by region
    - Handles empty search results
    - Debounces search input
  - Success Criteria: 90%+ coverage for ProfileSearch

- [ ] **T-003**: Write tests for useProfiles hook
  - File: `src/popup/hooks/__tests__/useProfiles.test.ts`
  - Test cases:
    - Loads profiles successfully
    - Handles loading state
    - Handles error state
    - Caches profiles correctly
    - Refreshes profiles
  - Success Criteria: 90%+ coverage for useProfiles

- [ ] **T-004**: Write tests for useFavorites hook
  - File: `src/popup/hooks/__tests__/useFavorites.test.ts`
  - Test cases:
    - Adds favorite
    - Removes favorite
    - Persists to storage
    - Loads from storage
  - Success Criteria: 90%+ coverage for useFavorites

- [ ] **T-005**: Write tests for useContainers hook
  - File: `src/popup/hooks/__tests__/useContainers.test.ts`
  - Test cases:
    - Creates container
    - Refreshes containers
    - Handles container creation error
    - Manages container state
  - Success Criteria: 90%+ coverage for useContainers

- [ ] **T-006**: Write tests for containerManager utility
  - File: `src/utils/__tests__/containerManager.test.ts`
  - Test cases:
    - Prepares container with color
    - Saves container ID
    - Handles duplicate containers
  - Success Criteria: 100% coverage for containerManager

---

### 3.2 Integration Tests

- [ ] **T-007**: Write integration tests for native messaging
  - File: `src/__tests__/integration/nativeMessaging.test.ts`
  - Test cases:
    - Connects to native host
    - Sends profile request
    - Receives profile response
    - Handles connection errors
    - Handles timeout
  - Success Criteria: Native messaging protocol fully tested

- [ ] **T-008**: Write integration tests for profile loading flow
  - File: `src/__tests__/integration/profileLoading.test.ts`
  - Test cases:
    - End-to-end profile loading
    - Cache hit scenario
    - Cache miss scenario
    - Error recovery
  - Success Criteria: Complete profile loading flow tested

---

### 3.3 E2E Tests

- [ ] **T-009**: Set up E2E testing framework
  - Action: Install Playwright or Puppeteer
  - Action: Configure for browser extension testing
  - Action: Add npm script `npm run test:e2e`
  - Success Criteria: E2E framework runs successfully

- [ ] **T-010**: Write E2E test for profile selection
  - Test: User opens popup, selects profile, console opens in container
  - Success Criteria: Full user workflow tested

- [ ] **T-011**: Write E2E test for favorites
  - Test: User adds/removes favorites, favorites persist
  - Success Criteria: Favorites workflow tested

- [ ] **T-012**: Write E2E test for error scenarios
  - Test: Python bridge not installed, shows error message
  - Success Criteria: Error handling tested end-to-end

---

### 3.4 Documentation

- [ ] **DOC-001**: Add JSDoc to all exported functions
  - Files: All TypeScript files in `src/`
  - Action: Document parameters, return types, examples
  - Success Criteria: 100% of public API documented

- [ ] **DOC-002**: Add docstrings to Python classes
  - Files: All Python files in `native-messaging/src/`
  - Action: Document classes, methods, parameters
  - Success Criteria: 100% of public API documented

- [ ] **DOC-003**: Create architecture documentation
  - File: `docs/architecture.md`
  - Content:
    - Component diagram
    - Data flow diagram
    - Native messaging protocol
    - Extension manifest permissions
  - Success Criteria: Clear architecture diagrams

- [ ] **DOC-004**: Create security documentation
  - File: `docs/security.md`
  - Content:
    - Security model
    - Permission justifications
    - Data handling practices
    - Threat model
  - Success Criteria: Security practices documented

- [ ] **DOC-005**: Add inline code comments
  - Action: Add explanatory comments for complex logic
  - Focus areas:
    - Cache invalidation logic
    - SSO token handling
    - Container color generation
  - Success Criteria: Complex logic well-explained

- [ ] **DOC-006**: Update README with development guide
  - File: `README.md`
  - Content:
    - Development setup
    - Testing guidelines
    - Contribution guidelines
    - Release process
  - Success Criteria: New developers can onboard from README

---

## 🔵 PHASE 4: ADVANCED OPTIMIZATIONS (Week 7-8)
*Priority: LOW | Impact: MEDIUM | Effort: Medium*

### 4.1 Advanced Performance

- [ ] **AP-001**: Implement React.memo for components
  - Files: All components in `src/popup/components/`
  - Action: Wrap components in React.memo with custom comparison
  - Success Criteria: Unnecessary re-renders eliminated

- [ ] **AP-002**: Implement virtualization for long lists
  - File: `src/popup/components/ProfileList.tsx`
  - Action: Use react-window or react-virtualized for 100+ profiles
  - Success Criteria: Smooth scrolling with 500+ profiles

- [ ] **AP-003**: Add performance monitoring
  - Action: Implement React Profiler API
  - Action: Log render times in development
  - Success Criteria: Can identify performance bottlenecks

- [ ] **AP-004**: Implement lazy loading for components
  - Action: Use React.lazy() for large components
  - Action: Add Suspense boundaries
  - Success Criteria: Initial load time reduced

---

### 4.2 Advanced Security

- [ ] **AS-001**: Add rate limiting for AWS API calls
  - File: `native-messaging/src/aws_profile_bridge/console_url_generator.py:89-115`
  - Action: Implement token bucket or sliding window rate limiter
  - Action: Limit to 10 requests per minute per profile
  - Success Criteria: Rate limiting prevents API abuse

- [ ] **AS-002**: Add HTTPS enforcement
  - File: `native-messaging/src/aws_profile_bridge/console_url_generator.py:32-33`
  - Action: Validate all URLs are HTTPS only
  - Action: Reject HTTP URLs with error
  - Success Criteria: Only HTTPS URLs allowed

- [ ] **AS-003**: Add input sanitization for profile names
  - File: `src/popup/awsProfiles.tsx:528-529`
  - Action: Explicitly sanitize profile names (even though React escapes)
  - Action: Add DOMPurify or similar
  - Success Criteria: XSS protection explicit and tested

- [ ] **AS-004**: Sanitize error messages
  - File: `native-messaging/src/aws_profile_bridge/console_url_generator.py:175-177`
  - Action: Use generic error messages that don't leak system state
  - Success Criteria: Error messages don't reveal profile existence

- [ ] **AS-005**: Add security headers validation
  - Action: Validate Content-Security-Policy in extension
  - Success Criteria: CSP configured correctly

---

### 4.3 Code Style & Cleanup

- [ ] **CS-001**: Extract inline styles to CSS modules
  - File: `src/popup/awsProfiles.tsx`
  - Action: Create `awsProfiles.module.scss`
  - Action: Replace all inline styles with CSS classes
  - Success Criteria: Zero inline styles in component

- [ ] **CS-002**: Enforce consistent quote style
  - Action: Configure Prettier/ESLint for consistent quotes
  - Action: Run auto-fix across codebase
  - Success Criteria: All files use consistent quote style

- [ ] **CS-003**: Add pre-commit hooks
  - Action: Install husky
  - Action: Configure lint-staged
  - Hooks:
    - Run ESLint
    - Run Prettier
    - Run unit tests
  - Success Criteria: Pre-commit hooks prevent bad commits

- [ ] **CS-004**: Add commit message linting
  - Action: Install commitlint
  - Action: Configure conventional commits
  - Success Criteria: Commit messages follow standard format

---

### 4.4 Memory & Resource Management

- [ ] **MEM-001**: Fix port listener cleanup
  - File: `src/popup/awsProfiles.tsx:119, 140, 182`
  - Action: Use useEffect cleanup to remove listeners
  - Action: Disconnect port on unmount
  - Success Criteria: No memory leaks from listeners

- [ ] **MEM-002**: Add resource cleanup for Python
  - Action: Ensure all file handles closed properly
  - Action: Add context managers where missing
  - Success Criteria: No file handle leaks

- [ ] **MEM-003**: Implement proper cache eviction
  - Action: Add LRU cache with size limits
  - Action: Evict oldest entries when cache full
  - Success Criteria: Memory usage bounded

---

### 4.5 Developer Experience

- [ ] **DX-001**: Add detailed error messages
  - Action: Replace generic errors with specific guidance
  - Example: "Python bridge not found" → "Install Python bridge with: ./install.sh"
  - Success Criteria: All errors actionable

- [ ] **DX-002**: Add development tools
  - Action: Add React DevTools integration
  - Action: Add Redux DevTools (if using Redux)
  - Success Criteria: Better debugging in development

- [ ] **DX-003**: Add storybook for component development
  - Action: Install and configure Storybook
  - Action: Add stories for all components
  - Success Criteria: Can develop components in isolation

- [ ] **DX-004**: Improve build performance
  - Action: Add webpack caching
  - Action: Optimize TypeScript compilation
  - Success Criteria: Build time reduced by 30%

---

## 📊 SUCCESS METRICS

### Code Quality Metrics
- [ ] TypeScript strict mode: ✅ Enabled
- [ ] Test coverage: ≥80% overall
- [ ] Test coverage (critical paths): ≥90%
- [ ] ESLint violations: 0
- [ ] Prettier violations: 0
- [ ] Code duplication: <5%
- [ ] Average component size: <200 lines
- [ ] Cyclomatic complexity: <10 per function

### Performance Metrics
- [ ] Bundle size: <350KB (current: ~500KB)
- [ ] Initial load time: <500ms
- [ ] Profile load time: <1s
- [ ] Cache hit rate: >70%
- [ ] Re-render count: Reduced by 50%

### Security Metrics
- [ ] Critical vulnerabilities: 0
- [ ] High vulnerabilities: 0
- [ ] Medium vulnerabilities: <3
- [ ] npm audit: Clean
- [ ] SAST scan: No blockers

### Documentation Metrics
- [ ] Public API documentation: 100%
- [ ] Architecture documentation: Complete
- [ ] Security documentation: Complete
- [ ] README: Comprehensive

---

## 🔧 TOOLS & AUTOMATION SETUP

### Required Tools
- [ ] Install ESLint with stricter rules
- [ ] Install Prettier
- [ ] Install husky for pre-commit hooks
- [ ] Install lint-staged
- [ ] Install commitlint
- [ ] Install webpack-bundle-analyzer
- [ ] Install Jest coverage tools
- [ ] Install Playwright/Puppeteer for E2E
- [ ] Install Storybook (optional)

### CI/CD Additions
- [ ] Add linting to CI pipeline
- [ ] Add test coverage reporting
- [ ] Add security scanning (npm audit, Snyk)
- [ ] Add bundle size tracking
- [ ] Add performance budgets

### Monitoring
- [ ] Set up error tracking (Sentry or similar)
- [ ] Set up performance monitoring
- [ ] Set up dependency update alerts (Dependabot)

---

## 📝 PROGRESS TRACKING

### Phase 1: Critical Fixes
- Total Tasks: 11
- Completed: 0
- In Progress: 0
- Blocked: 0
- **Progress: 0%**

### Phase 2: Refactoring & Efficiency
- Total Tasks: 27
- Completed: 0
- In Progress: 0
- Blocked: 0
- **Progress: 0%**

### Phase 3: Testing & Documentation
- Total Tasks: 18
- Completed: 0
- In Progress: 0
- Blocked: 0
- **Progress: 0%**

### Phase 4: Advanced Optimizations
- Total Tasks: 19
- Completed: 0
- In Progress: 0
- Blocked: 0
- **Progress: 0%**

### **OVERALL PROGRESS: 0/75 (0%)**

---

## 🎯 NEXT STEPS

### Immediate (Today)
1. Review this TODO list with team
2. Prioritize Phase 1 tasks
3. Assign owners to critical tasks
4. Set up development environment with required tools

### This Week
1. Complete S-001 through S-007 (Security & Type Safety)
2. Complete Q-001 through Q-004 (Code Quality Fundamentals)
3. Set up automated testing for completed fixes

### This Month
1. Complete Phase 1 and Phase 2
2. Achieve 50%+ test coverage
3. Reduce bundle size by 20%

### This Quarter
1. Complete all 4 phases
2. Achieve 80%+ test coverage
3. Pass security audit
4. Document architecture and security model

---

**Document Status**: 🟢 Active
**Last Updated**: 2025-11-11
**Owner**: Development Team
**Review Frequency**: Weekly
