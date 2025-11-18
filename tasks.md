# AWS Citadel - Implementation Tasks

**Version:** 1.0.0
**Date:** 2025-11-18
**Status:** Draft

## Task Organization

This document breaks down the AWS Citadel project into actionable tasks organized by phase and priority. Each task includes estimated effort, dependencies, and acceptance criteria.

### Effort Estimation Legend
- **XS**: 1-2 hours
- **S**: 2-4 hours
- **M**: 4-8 hours (1 day)
- **L**: 8-16 hours (2 days)
- **XL**: 16-40 hours (1 week)

### Priority Legend
- **P0**: Critical, blocking other work
- **P1**: High priority, core functionality
- **P2**: Medium priority, important features
- **P3**: Low priority, nice to have

---

## Phase 0: Project Setup

### TASK-0.1: Repository Setup
**Priority**: P0
**Effort**: S
**Dependencies**: None

**Description**: Create new AWS Citadel repository and set up basic structure.

**Steps**:
1. Create new GitHub repository: `aws-citadel`
2. Initialize with README, LICENSE (choose MIT or Apache 2.0), .gitignore
3. Set up branch protection rules
4. Create initial directory structure:
   ```
   aws-citadel/
   ├── extension/          # Forked AWS Containers code
   ├── browser/            # LibreWolf configuration
   ├── native-messaging/   # Native messaging host
   ├── launcher/           # Platform-specific launchers
   ├── packaging/          # Distribution packaging
   ├── docs/               # Documentation
   └── tests/              # Test suites
   ```

**Acceptance Criteria**:
- ✅ Repository is created and accessible
- ✅ Directory structure is in place
- ✅ README has project overview
- ✅ LICENSE file is present

---

### TASK-0.2: Fork AWS Containers Extension
**Priority**: P0
**Effort**: M
**Dependencies**: TASK-0.1

**Description**: Copy AWS Containers extension code and set up as AWS Citadel extension.

**Steps**:
1. Copy extension source code to `extension/` directory
2. Update `manifest.json`:
   - Change name to "AWS Citadel"
   - Change ID to "aws-citadel@citadel.app"
   - Update version to 2.0.0
   - Add `webNavigation` permission
   - Add `nativeMessaging` permission
3. Update package.json with new project name
4. Update branding (icons, colors, naming)
5. Run `npm install` and verify build works
6. Update webpack config if needed

**Acceptance Criteria**:
- ✅ Extension code is copied and organized
- ✅ manifest.json is updated with new identity
- ✅ Build process works (`npm run build` succeeds)
- ✅ Extension loads in Firefox/LibreWolf for testing

---

### TASK-0.3: Set Up Development Environment
**Priority**: P0
**Effort**: M
**Dependencies**: TASK-0.2

**Description**: Configure development environment for extension and native host development.

**Steps**:
1. Document required tools:
   - Node.js 18+
   - Python 3.8+
   - LibreWolf browser
2. Set up ESLint and Prettier for consistent code style
3. Configure TypeScript strict mode
4. Set up hot reload for extension development
5. Create development scripts in package.json:
   - `dev`: Build extension in watch mode
   - `build`: Production build
   - `test`: Run tests
   - `lint`: Run linter

**Acceptance Criteria**:
- ✅ Development dependencies are documented
- ✅ Code style tools are configured
- ✅ Development scripts work
- ✅ Hot reload works for extension development

---

### TASK-0.4: Documentation Setup
**Priority**: P1
**Effort**: S
**Dependencies**: TASK-0.1

**Description**: Set up documentation structure and initial content.

**Steps**:
1. Copy spec.md, requirements.md, tasks.md to `docs/`
2. Create docs/README.md with documentation index
3. Create CONTRIBUTING.md with contribution guidelines
4. Create docs/DEVELOPMENT.md with setup instructions
5. Set up documentation website skeleton (GitHub Pages or similar)

**Acceptance Criteria**:
- ✅ All planning documents are in docs/
- ✅ CONTRIBUTING.md exists with clear guidelines
- ✅ DEVELOPMENT.md has setup instructions
- ✅ Documentation structure is clear

---

## Phase 1: Core Extension Modifications

### TASK-1.1: Implement URL Navigation Guard
**Priority**: P0
**Effort**: M
**Dependencies**: TASK-0.2

**Description**: Add URL filtering to block non-AWS domains.

**Steps**:
1. Create `src/background/navigation-guard.ts`
2. Implement `isAWSUrl()` function with domain whitelist
3. Add `webNavigation.onBeforeNavigate` listener in background script
4. Implement blocking logic:
   - Check if URL is AWS domain
   - If not, cancel navigation and send to native host
5. Add logging for blocked URLs
6. Write unit tests for domain validation

**Files to Create**:
- `extension/src/background/navigation-guard.ts`
- `extension/src/background/navigation-guard.test.ts`

**Acceptance Criteria**:
- ✅ AWS domains are allowed
- ✅ Non-AWS domains are blocked
- ✅ localhost:10999 is allowed
- ✅ Tests pass with 100% coverage
- ✅ Blocked URLs are logged

---

### TASK-1.2: Implement External Link Interception
**Priority**: P0
**Effort**: L
**Dependencies**: TASK-0.2

**Description**: Create content script to intercept clicks on external links.

**Steps**:
1. Create `src/content/link-interceptor.ts`
2. Add click event listener (capture phase)
3. Implement link checking logic:
   - Find closest anchor element
   - Extract URL
   - Check if AWS domain
   - If external, prevent default and send to background
4. Handle `window.open()` override
5. Handle iframe scenarios
6. Add event listener in all frames
7. Write unit tests with jsdom

**Files to Create**:
- `extension/src/content/link-interceptor.ts`
- `extension/src/content/link-interceptor.test.ts`

**Files to Modify**:
- `extension/manifest.json` (add content_scripts section)
- `extension/webpack.config.js` (add content script entry point)

**Acceptance Criteria**:
- ✅ External links open in system browser
- ✅ AWS links navigate normally
- ✅ window.open is handled
- ✅ Works in iframes
- ✅ Tests pass

---

### TASK-1.3: Implement Native Messaging Integration
**Priority**: P0
**Effort**: L
**Dependencies**: TASK-1.1, TASK-1.2

**Description**: Add native messaging support to extension for system browser opening.

**Steps**:
1. Create `src/background/native-messaging.ts`
2. Implement connection management:
   - Connect to native host
   - Handle disconnections
   - Auto-reconnect logic
3. Implement message protocol:
   - `open_url` action
   - Success/error responses
4. Add message handlers in background script
5. Add error handling and logging
6. Write integration tests

**Files to Create**:
- `extension/src/background/native-messaging.ts`
- `extension/src/background/native-messaging.test.ts`

**Files to Modify**:
- `extension/src/background.ts` (integrate native messaging)

**Acceptance Criteria**:
- ✅ Extension can connect to native host
- ✅ Messages are sent correctly
- ✅ Disconnections are handled
- ✅ Auto-reconnect works
- ✅ Tests pass

---

### TASK-1.4: Update Background Script
**Priority**: P1
**Effort**: M
**Dependencies**: TASK-1.3

**Description**: Integrate navigation guard and native messaging into background script.

**Steps**:
1. Import navigation guard and native messaging modules
2. Initialize both systems on extension startup
3. Add message routing between content script and native host
4. Add error handling and recovery
5. Add logging for debugging
6. Test full flow: content script → background → native host

**Files to Modify**:
- `extension/src/background.ts`

**Acceptance Criteria**:
- ✅ Navigation guard is initialized
- ✅ Native messaging is initialized
- ✅ Message routing works
- ✅ Full flow is tested
- ✅ Error handling works

---

### TASK-1.5: Update Extension Manifest
**Priority**: P1
**Effort**: XS
**Dependencies**: TASK-1.2, TASK-1.3

**Description**: Update manifest.json with new permissions and content scripts.

**Steps**:
1. Add `webNavigation` permission
2. Add `nativeMessaging` permission
3. Add content scripts configuration:
   - Match AWS domains
   - Run at document_start
   - All frames
4. Update extension description
5. Update version to 2.0.0

**Files to Modify**:
- `extension/manifest.json`

**Acceptance Criteria**:
- ✅ All required permissions are added
- ✅ Content scripts are configured correctly
- ✅ Extension loads without errors
- ✅ Manifest validation passes

---

### TASK-1.6: Update Build Configuration
**Priority**: P1
**Effort**: S
**Dependencies**: TASK-1.2

**Description**: Update webpack config to include content script.

**Steps**:
1. Add content script entry point to webpack config
2. Configure output for content script
3. Ensure proper source maps for debugging
4. Test build process
5. Verify extension loads in browser

**Files to Modify**:
- `extension/webpack.config.js`

**Acceptance Criteria**:
- ✅ Content script is built
- ✅ Source maps work
- ✅ Extension loads with content script
- ✅ Build succeeds without errors

---

### TASK-1.7: Testing & Bug Fixes
**Priority**: P0
**Effort**: L
**Dependencies**: TASK-1.4, TASK-1.5, TASK-1.6

**Description**: Comprehensive testing of modified extension.

**Steps**:
1. Manual testing in LibreWolf:
   - Load extension
   - Open AWS Console
   - Click AWS link (should navigate)
   - Click external link (should fail for now - native host not ready)
   - Test search, favorites, recent profiles
2. Fix any bugs found
3. Test all existing extension features still work
4. Performance testing (profile loading, search)
5. Memory leak testing

**Acceptance Criteria**:
- ✅ All extension features work
- ✅ No regressions from original extension
- ✅ No console errors
- ✅ Performance is acceptable
- ✅ No memory leaks

---

## Phase 2: Native Messaging Host

### TASK-2.1: Create Native Messaging Host
**Priority**: P0
**Effort**: M
**Dependencies**: TASK-1.3

**Description**: Implement Python native messaging host for URL handling.

**Steps**:
1. Create `native-messaging/url-handler.py`
2. Implement native messaging protocol:
   - Read messages from stdin (4-byte length prefix + JSON)
   - Write messages to stdout (same format)
3. Implement action handlers:
   - `open_url`: Open URL in system browser
4. Add logging to `~/.aws-citadel/logs/native-host.log`
5. Add error handling
6. Make script executable
7. Write unit tests

**Files to Create**:
- `native-messaging/url-handler.py`
- `native-messaging/test_url_handler.py`
- `native-messaging/requirements.txt` (if needed)

**Acceptance Criteria**:
- ✅ Host reads messages correctly
- ✅ Host writes responses correctly
- ✅ URLs open in system browser
- ✅ Errors are logged
- ✅ Tests pass

---

### TASK-2.2: Create Host Manifests
**Priority**: P0
**Effort**: S
**Dependencies**: TASK-2.1

**Description**: Create platform-specific native messaging host manifests.

**Steps**:
1. Create Linux/macOS manifest: `native-messaging/com.citadel.urlhandler.json`
2. Create Windows manifest: `native-messaging/com.citadel.urlhandler.windows.json`
3. Set correct paths (will be updated by launcher on first run)
4. Set allowed extension ID
5. Document manifest installation locations:
   - Linux: `~/.librewolf/native-messaging-hosts/`
   - macOS: `~/Library/Application Support/LibreWolf/NativeMessagingHosts/`
   - Windows: Registry key

**Files to Create**:
- `native-messaging/com.citadel.urlhandler.json`
- `native-messaging/com.citadel.urlhandler.windows.json`

**Acceptance Criteria**:
- ✅ Manifests are valid JSON
- ✅ Paths are correct
- ✅ Extension ID matches
- ✅ Installation locations documented

---

### TASK-2.3: Test Native Messaging End-to-End
**Priority**: P0
**Effort**: M
**Dependencies**: TASK-2.2, TASK-1.4

**Description**: Test full native messaging flow from extension to system browser.

**Steps**:
1. Manually install native messaging host:
   - Copy manifest to correct location
   - Make Python script executable
   - Test host standalone (echo test)
2. Load extension in LibreWolf
3. Test connection:
   - Check browser console for connection status
   - Send test message from extension console
4. Test full flow:
   - Navigate to AWS Console
   - Click external link
   - Verify system browser opens with URL
5. Test error cases:
   - Kill host, verify reconnection
   - Invalid messages
   - Invalid URLs
6. Document any platform-specific issues

**Acceptance Criteria**:
- ✅ Extension connects to host
- ✅ External links open in system browser
- ✅ Reconnection works
- ✅ Error handling works
- ✅ Works on Linux, macOS, Windows

---

## Phase 3: Browser Configuration

### TASK-3.1: Create userChrome.css
**Priority**: P1
**Effort**: S
**Dependencies**: None

**Description**: Create CSS file to customize LibreWolf UI.

**Steps**:
1. Create `browser/profile-template/chrome/userChrome.css`
2. Add rules to hide:
   - URL/address bar (`#nav-bar`)
   - Menu bar (`#toolbar-menubar`)
3. Keep tab bar visible
4. Style container tab indicators (thicker colored line)
5. Minimize window controls padding
6. Test in LibreWolf with custom profile

**Files to Create**:
- `browser/profile-template/chrome/userChrome.css`

**Acceptance Criteria**:
- ✅ URL bar is hidden
- ✅ Menu bar is hidden
- ✅ Tab bar is visible
- ✅ Container indicators are styled
- ✅ UI looks clean and professional

---

### TASK-3.2: Create user.js Preferences
**Priority**: P1
**Effort**: S
**Dependencies**: None

**Description**: Create Firefox preferences file for LibreWolf configuration.

**Steps**:
1. Create `browser/profile-template/user.js`
2. Add preferences:
   - Disable config warning
   - Set homepage to AWS Console
   - Disable new tab page
   - Enable containers
   - Disable DNS prefetch
   - Disable predictive loading
   - Disable telemetry prompts
3. Test preferences apply correctly
4. Document each preference

**Files to Create**:
- `browser/profile-template/user.js`

**Acceptance Criteria**:
- ✅ All preferences are set
- ✅ Homepage is AWS Console
- ✅ Containers are enabled
- ✅ Privacy features are enabled
- ✅ Preferences persist

---

### TASK-3.3: Create policies.json
**Priority**: P0
**Effort**: M
**Dependencies**: None

**Description**: Create Firefox policies for security and extension management.

**Steps**:
1. Create `browser/policies.json`
2. Add policies:
   - WebsiteFilter with AWS domain whitelist
   - Disable telemetry, Pocket, studies
   - Force-install AWS Citadel extension
   - Block camera, microphone, location
   - Disable password manager
   - Configure cookie behavior
3. Test policies apply correctly
4. Verify extension is force-installed
5. Verify domain whitelist works

**Files to Create**:
- `browser/policies.json`

**Acceptance Criteria**:
- ✅ Domain whitelist is enforced
- ✅ Extension is force-installed
- ✅ Privacy features are enforced
- ✅ Non-AWS domains are blocked
- ✅ Policies validate correctly

---

### TASK-3.4: Create Profile Template
**Priority**: P1
**Effort**: S
**Dependencies**: TASK-3.1, TASK-3.2

**Description**: Create complete profile template directory.

**Steps**:
1. Create directory structure:
   ```
   browser/profile-template/
   ├── chrome/
   │   └── userChrome.css
   ├── user.js
   └── extensions/
       └── (extension will be copied here)
   ```
2. Add README explaining profile structure
3. Test profile creation from template
4. Verify LibreWolf launches with profile

**Files to Create**:
- `browser/profile-template/README.md`

**Acceptance Criteria**:
- ✅ Profile structure is complete
- ✅ Template can be copied to create new profile
- ✅ LibreWolf accepts profile
- ✅ All customizations apply

---

## Phase 4: Application Launcher

### TASK-4.1: Create Linux Launcher Script
**Priority**: P1
**Effort**: M
**Dependencies**: TASK-3.4, TASK-2.2

**Description**: Create Bash launcher script for Linux.

**Steps**:
1. Create `launcher/aws-citadel.sh`
2. Implement:
   - Determine script directory
   - Set environment variables
   - Create profile on first run (copy from template)
   - Register native messaging host
   - Make native host executable
   - Launch LibreWolf with custom profile
3. Add command-line argument handling:
   - `--profile <path>`: Use custom profile
   - `--debug`: Enable debug logging
   - `--version`: Show version
4. Add error handling (LibreWolf not found, etc.)
5. Make script executable
6. Test on Ubuntu and Fedora

**Files to Create**:
- `launcher/aws-citadel.sh`

**Acceptance Criteria**:
- ✅ Script launches LibreWolf correctly
- ✅ Profile is created on first run
- ✅ Native host is registered
- ✅ Command-line arguments work
- ✅ Error handling works
- ✅ Works on multiple Linux distros

---

### TASK-4.2: Create macOS Launcher Script
**Priority**: P1
**Effort**: M
**Dependencies**: TASK-4.1

**Description**: Create Bash launcher script for macOS.

**Steps**:
1. Copy Linux launcher to `launcher/aws-citadel-mac.sh`
2. Update paths for macOS:
   - Application Support directory
   - LibreWolf.app location
3. Handle macOS app bundle execution
4. Test on macOS 11+ (Big Sur and later)
5. Handle macOS-specific permissions (notarization, etc.)

**Files to Create**:
- `launcher/aws-citadel-mac.sh`

**Acceptance Criteria**:
- ✅ Script launches LibreWolf correctly on macOS
- ✅ Paths are correct for macOS
- ✅ Works on macOS 11+
- ✅ Handles app bundle correctly

---

### TASK-4.3: Create Windows Launcher Script
**Priority**: P1
**Effort**: L
**Dependencies**: TASK-4.1

**Description**: Create PowerShell launcher script for Windows.

**Steps**:
1. Create `launcher/aws-citadel.ps1`
2. Implement same functionality as Linux script:
   - Determine script directory
   - Create profile on first run
   - Register native messaging host (Windows Registry)
   - Launch LibreWolf
3. Add Windows-specific error handling
4. Test on Windows 10 and Windows 11
5. Handle Windows paths and registry operations

**Files to Create**:
- `launcher/aws-citadel.ps1`
- `launcher/aws-citadel.bat` (wrapper for PowerShell script)

**Acceptance Criteria**:
- ✅ Script launches LibreWolf correctly on Windows
- ✅ Registry keys are set correctly
- ✅ Profile creation works
- ✅ Works on Windows 10/11
- ✅ .bat wrapper works

---

### TASK-4.4: Test Launchers
**Priority**: P0
**Effort**: L
**Dependencies**: TASK-4.1, TASK-4.2, TASK-4.3

**Description**: Comprehensive testing of all launchers.

**Steps**:
1. Test Linux launcher:
   - Fresh install (no profile)
   - Existing profile
   - Command-line arguments
   - Error cases (no LibreWolf, no API server)
2. Test macOS launcher (same scenarios)
3. Test Windows launcher (same scenarios)
4. Test cross-version compatibility
5. Document any platform-specific issues
6. Create troubleshooting guide

**Acceptance Criteria**:
- ✅ All launchers work on their platforms
- ✅ First-run experience works
- ✅ Subsequent launches work
- ✅ Error messages are helpful
- ✅ Troubleshooting guide exists

---

## Phase 5: Packaging & Distribution

### TASK-5.1: Download and Bundle LibreWolf
**Priority**: P0
**Effort**: M
**Dependencies**: None

**Description**: Download LibreWolf binaries and set up bundling process.

**Steps**:
1. Create `packaging/download-librewolf.sh` script
2. Download LibreWolf binaries for each platform:
   - Linux: AppImage or tar.gz
   - macOS: .dmg
   - Windows: .zip
3. Extract and organize binaries
4. Document LibreWolf version being bundled
5. Create script to check for LibreWolf updates
6. Test extracted binaries run correctly

**Files to Create**:
- `packaging/download-librewolf.sh`
- `packaging/librewolf-versions.txt`

**Acceptance Criteria**:
- ✅ LibreWolf binaries are downloaded
- ✅ Binaries are organized by platform
- ✅ Version is documented
- ✅ Binaries execute correctly

---

### TASK-5.2: Create Linux Packages
**Priority**: P1
**Effort**: XL
**Dependencies**: TASK-5.1, TASK-4.1, TASK-3.4, TASK-1.7, TASK-2.3

**Description**: Package AWS Citadel for Linux distributions.

**Steps**:
1. **AppImage**:
   - Create AppImage directory structure
   - Include LibreWolf, extension, launcher, native host
   - Create AppImage using appimagetool
   - Test AppImage on Ubuntu, Fedora, Arch
2. **.deb package** (Debian/Ubuntu):
   - Create debian/ directory structure
   - Write control file, postinst script
   - Build .deb package
   - Test installation on Ubuntu
3. **.rpm package** (Fedora/RHEL):
   - Create .spec file
   - Build RPM with rpmbuild
   - Test installation on Fedora
4. Create desktop file for application launcher
5. Create application icon

**Files to Create**:
- `packaging/appimage/build.sh`
- `packaging/debian/control`
- `packaging/debian/postinst`
- `packaging/rpm/aws-citadel.spec`
- `packaging/aws-citadel.desktop`
- `packaging/icons/aws-citadel.png`

**Acceptance Criteria**:
- ✅ AppImage works on multiple distros
- ✅ .deb installs correctly on Ubuntu
- ✅ .rpm installs correctly on Fedora
- ✅ Desktop launcher appears in menu
- ✅ Icon is displayed correctly

---

### TASK-5.3: Create macOS Package
**Priority**: P1
**Effort**: L
**Dependencies**: TASK-5.1, TASK-4.2, TASK-3.4, TASK-1.7, TASK-2.3

**Description**: Package AWS Citadel for macOS.

**Steps**:
1. Create .app bundle structure:
   ```
   AWS Citadel.app/
   ├── Contents/
   │   ├── Info.plist
   │   ├── MacOS/
   │   │   └── aws-citadel (launcher script)
   │   └── Resources/
   │       ├── librewolf/
   │       ├── extension/
   │       ├── profile-template/
   │       └── native-messaging/
   ```
2. Create Info.plist with app metadata
3. Add icon (convert PNG to .icns)
4. Code sign the app (optional, requires Apple Developer account)
5. Create .dmg installer:
   - Background image
   - Applications folder shortcut
   - Drag-to-install interface
6. Test on macOS 11+

**Files to Create**:
- `packaging/macos/Info.plist`
- `packaging/macos/build-dmg.sh`
- `packaging/macos/dmg-background.png`

**Acceptance Criteria**:
- ✅ .app bundle is structured correctly
- ✅ App launches from Finder
- ✅ .dmg installer works
- ✅ App icon is displayed
- ✅ Works on macOS 11+

---

### TASK-5.4: Create Windows Package
**Priority**: P1
**Effort**: L
**Dependencies**: TASK-5.1, TASK-4.3, TASK-3.4, TASK-1.7, TASK-2.3

**Description**: Package AWS Citadel for Windows.

**Steps**:
1. **Installer (.exe)**:
   - Use Inno Setup or NSIS
   - Create installer script
   - Include all components
   - Add Start Menu shortcut
   - Add desktop shortcut (optional)
   - Add uninstaller
2. **Portable .zip**:
   - Create directory structure
   - Bundle all components
   - Include README for portable usage
3. Add application icon
4. Test on Windows 10 and Windows 11

**Files to Create**:
- `packaging/windows/installer.iss` (Inno Setup script)
- `packaging/windows/build-installer.bat`
- `packaging/windows/aws-citadel.ico`

**Acceptance Criteria**:
- ✅ Installer creates Start Menu shortcut
- ✅ App launches from Start Menu
- ✅ Uninstaller works correctly
- ✅ Portable .zip works without installation
- ✅ Works on Windows 10/11

---

### TASK-5.5: Create Installation Documentation
**Priority**: P1
**Effort**: M
**Dependencies**: TASK-5.2, TASK-5.3, TASK-5.4

**Description**: Write comprehensive installation guides for all platforms.

**Steps**:
1. Create `docs/installation/linux.md`:
   - AppImage usage
   - .deb installation (apt install)
   - .rpm installation (dnf install)
   - Troubleshooting
2. Create `docs/installation/macos.md`:
   - .dmg installation
   - Security settings (Gatekeeper)
   - Troubleshooting
3. Create `docs/installation/windows.md`:
   - Installer usage
   - Portable version usage
   - Troubleshooting
4. Create `docs/installation/README.md` with platform selection
5. Add screenshots for each step
6. Document system requirements

**Files to Create**:
- `docs/installation/linux.md`
- `docs/installation/macos.md`
- `docs/installation/windows.md`
- `docs/installation/README.md`

**Acceptance Criteria**:
- ✅ Installation steps are clear and complete
- ✅ Screenshots are included
- ✅ Troubleshooting sections exist
- ✅ System requirements are documented

---

## Phase 6: Testing & Quality Assurance

### TASK-6.1: Unit Tests
**Priority**: P1
**Effort**: L
**Dependencies**: TASK-1.7

**Description**: Write comprehensive unit tests for all extension code.

**Steps**:
1. Set up Jest and React Testing Library
2. Write tests for:
   - URL validation (`navigation-guard.test.ts`)
   - Link interception (`link-interceptor.test.ts`)
   - Native messaging (`native-messaging.test.ts`)
   - Container management (`containers.test.ts`)
   - API client (`apiClient.test.ts`)
   - React components (`*.test.tsx`)
   - Custom hooks (`hooks/*.test.ts`)
3. Achieve >80% code coverage
4. Set up coverage reporting
5. Add pre-commit hook to run tests

**Acceptance Criteria**:
- ✅ All modules have unit tests
- ✅ Code coverage >80%
- ✅ All tests pass
- ✅ Tests run in CI/CD
- ✅ Pre-commit hook works

---

### TASK-6.2: Integration Tests
**Priority**: P1
**Effort**: L
**Dependencies**: TASK-2.3, TASK-4.4

**Description**: Write integration tests for component interactions.

**Steps**:
1. Set up Playwright or Selenium for browser automation
2. Write tests for:
   - Extension ↔ API server communication
   - Extension ↔ Native host communication
   - Container creation and isolation
   - URL filtering and external link handling
   - Profile loading and switching
3. Test on Firefox and LibreWolf
4. Automate tests in CI/CD

**Files to Create**:
- `tests/integration/extension-api.test.ts`
- `tests/integration/native-messaging.test.ts`
- `tests/integration/containers.test.ts`
- `tests/integration/url-filtering.test.ts`

**Acceptance Criteria**:
- ✅ Integration tests cover major flows
- ✅ Tests run automatically
- ✅ Tests pass on Firefox and LibreWolf
- ✅ CI/CD runs integration tests

---

### TASK-6.3: End-to-End Tests
**Priority**: P2
**Effort**: XL
**Dependencies**: TASK-5.2, TASK-5.3, TASK-5.4

**Description**: Write end-to-end tests for complete user workflows.

**Steps**:
1. Set up E2E test framework (Playwright recommended)
2. Write tests for:
   - Fresh installation
   - Launch application
   - Load profiles from API
   - Search for profile
   - Open profile in container
   - Open multiple tabs in same container
   - Click external link (verify system browser opens)
   - Mark profile as favorite
   - Close and reopen (verify state persistence)
3. Test on all platforms (Linux, macOS, Windows)
4. Create test fixtures (mock API server responses)
5. Automate tests in CI/CD

**Files to Create**:
- `tests/e2e/installation.test.ts`
- `tests/e2e/profile-workflow.test.ts`
- `tests/e2e/external-links.test.ts`
- `tests/e2e/favorites.test.ts`

**Acceptance Criteria**:
- ✅ E2E tests cover complete user journeys
- ✅ Tests run on all platforms
- ✅ Mock API server works
- ✅ Tests are automated
- ✅ Tests pass consistently

---

### TASK-6.4: Performance Testing
**Priority**: P2
**Effort**: M
**Dependencies**: TASK-5.2, TASK-5.3, TASK-5.4

**Description**: Test application performance and resource usage.

**Steps**:
1. Test startup time:
   - Cold start (no profile)
   - Warm start (existing profile)
   - Measure time to AWS Console load
2. Test profile loading:
   - 10 profiles
   - 100 profiles
   - 1000 profiles
3. Test search performance:
   - Search with different profile counts
   - Measure response time
4. Test memory usage:
   - Single tab
   - 10 tabs
   - 50 tabs
   - Memory leak detection
5. Test CPU usage:
   - Idle
   - Active navigation
   - Multiple tabs
6. Document performance metrics
7. Compare with requirements (NFR-1)

**Files to Create**:
- `tests/performance/startup.test.ts`
- `tests/performance/profile-loading.test.ts`
- `tests/performance/memory.test.ts`
- `docs/performance-report.md`

**Acceptance Criteria**:
- ✅ Startup time <3 seconds
- ✅ Profile loading <1 second
- ✅ Search response <50ms
- ✅ Memory usage <500 MB (10 tabs)
- ✅ No memory leaks detected
- ✅ Performance report created

---

### TASK-6.5: Security Testing
**Priority**: P0
**Effort**: L
**Dependencies**: TASK-1.7, TASK-2.3

**Description**: Test security features and identify vulnerabilities.

**Steps**:
1. **URL filtering tests**:
   - Attempt to navigate to non-AWS domains
   - Try to bypass whitelist
   - Test with encoded URLs, redirects
2. **Container isolation tests**:
   - Verify cookies are isolated
   - Test cross-container data access
   - Verify localStorage isolation
3. **XSS testing**:
   - Test input fields for XSS
   - Test link interception for XSS
4. **Native messaging security**:
   - Test with malformed messages
   - Test with malicious URLs
   - Verify host validation
5. **Extension permissions**:
   - Verify minimal permissions
   - Check for unnecessary access
6. **Penetration testing** (if resources available)
7. Document security findings
8. Fix any vulnerabilities

**Files to Create**:
- `tests/security/url-filtering.test.ts`
- `tests/security/container-isolation.test.ts`
- `tests/security/xss.test.ts`
- `docs/security-report.md`

**Acceptance Criteria**:
- ✅ URL filtering cannot be bypassed
- ✅ Containers are fully isolated
- ✅ No XSS vulnerabilities
- ✅ Native messaging is secure
- ✅ Minimal permissions used
- ✅ Security report created

---

### TASK-6.6: Accessibility Testing
**Priority**: P2
**Effort**: M
**Dependencies**: TASK-1.7

**Description**: Test accessibility and WCAG 2.1 compliance.

**Steps**:
1. Install accessibility testing tools (axe, WAVE)
2. Test with screen readers:
   - NVDA (Windows)
   - VoiceOver (macOS)
   - Orca (Linux)
3. Test keyboard navigation:
   - Tab order
   - Focus indicators
   - Keyboard shortcuts
4. Test color contrast (WCAG AA)
5. Test with browser zoom (200%, 400%)
6. Test with different font sizes
7. Fix accessibility issues
8. Document accessibility features

**Files to Create**:
- `docs/accessibility.md`

**Acceptance Criteria**:
- ✅ WCAG 2.1 Level AA compliance
- ✅ Screen readers work correctly
- ✅ Keyboard navigation works
- ✅ Color contrast passes
- ✅ Zoom works without breaking layout
- ✅ Accessibility guide created

---

## Phase 7: Documentation

### TASK-7.1: User Manual
**Priority**: P1
**Effort**: L
**Dependencies**: TASK-5.5

**Description**: Write comprehensive user manual.

**Steps**:
1. Create `docs/user-guide/README.md` with table of contents
2. Write sections:
   - Getting started
   - Installing AWS Citadel
   - Configuring API server
   - Managing profiles
   - Using favorites
   - Region selection
   - Keyboard shortcuts
   - Troubleshooting
   - FAQ
3. Add screenshots for each section
4. Create video tutorials (optional)
5. Test documentation with new users

**Files to Create**:
- `docs/user-guide/README.md`
- `docs/user-guide/getting-started.md`
- `docs/user-guide/profiles.md`
- `docs/user-guide/troubleshooting.md`
- `docs/user-guide/faq.md`

**Acceptance Criteria**:
- ✅ User manual is complete and clear
- ✅ Screenshots are included
- ✅ FAQ covers common questions
- ✅ Troubleshooting section is helpful
- ✅ New users can follow guide successfully

---

### TASK-7.2: Developer Documentation
**Priority**: P2
**Effort**: M
**Dependencies**: TASK-0.3

**Description**: Write documentation for contributors.

**Steps**:
1. Update `CONTRIBUTING.md` with:
   - Code of conduct
   - How to report bugs
   - How to suggest features
   - Pull request process
   - Code style guidelines
2. Create `docs/development/README.md` with:
   - Development setup
   - Building from source
   - Running tests
   - Debugging tips
3. Create `docs/development/architecture.md` with:
   - High-level architecture
   - Component descriptions
   - Data flows
4. Create `docs/development/api-reference.md` with:
   - Extension APIs
   - Native messaging protocol
   - API server endpoints
5. Add code examples

**Files to Create/Update**:
- `CONTRIBUTING.md`
- `docs/development/README.md`
- `docs/development/architecture.md`
- `docs/development/api-reference.md`

**Acceptance Criteria**:
- ✅ CONTRIBUTING.md is clear and complete
- ✅ Development setup is documented
- ✅ Architecture is explained
- ✅ API reference is complete
- ✅ Code examples are included

---

### TASK-7.3: API Server Documentation
**Priority**: P1
**Effort**: S
**Dependencies**: None

**Description**: Document API server requirements and setup.

**Steps**:
1. Create `docs/api-server.md` with:
   - What is the API server
   - Why it's needed
   - How to install (link to existing docs)
   - How to configure
   - API endpoints (reference existing docs)
   - Troubleshooting API server issues
2. Add example API responses
3. Document token generation
4. Add troubleshooting for common issues

**Files to Create**:
- `docs/api-server.md`

**Acceptance Criteria**:
- ✅ API server purpose is explained
- ✅ Setup instructions are clear
- ✅ Token generation is documented
- ✅ Troubleshooting section exists

---

### TASK-7.4: README and Landing Page
**Priority**: P1
**Effort**: M
**Dependencies**: TASK-7.1, TASK-5.5

**Description**: Create compelling README and project landing page.

**Steps**:
1. Update root `README.md` with:
   - Project description and benefits
   - Screenshots
   - Key features
   - Quick start guide
   - Installation links
   - Documentation links
   - Contributing section
   - License information
2. Create GitHub Pages site (optional):
   - Landing page with hero section
   - Download buttons for each platform
   - Feature highlights
   - Screenshots/video
   - Documentation links
3. Add badges (build status, version, license, etc.)
4. Create compelling visuals

**Files to Create/Update**:
- `README.md`
- `docs/index.html` (if creating GitHub Pages site)

**Acceptance Criteria**:
- ✅ README is clear and compelling
- ✅ Screenshots are included
- ✅ Installation is easy to find
- ✅ Links to documentation work
- ✅ Badges are displayed

---

## Phase 8: Release & Distribution

### TASK-8.1: Set Up CI/CD Pipeline
**Priority**: P1
**Effort**: L
**Dependencies**: TASK-6.1, TASK-6.2

**Description**: Set up automated build and test pipeline.

**Steps**:
1. Create GitHub Actions workflows:
   - `.github/workflows/test.yml`: Run tests on PRs
   - `.github/workflows/build.yml`: Build extension
   - `.github/workflows/release.yml`: Build packages on release
2. Configure runners for each platform:
   - Ubuntu (for Linux packages)
   - macOS (for macOS package)
   - Windows (for Windows packages)
3. Set up artifact upload
4. Configure release automation
5. Add status badges to README
6. Test workflows

**Files to Create**:
- `.github/workflows/test.yml`
- `.github/workflows/build.yml`
- `.github/workflows/release.yml`

**Acceptance Criteria**:
- ✅ Tests run automatically on PRs
- ✅ Builds succeed on all platforms
- ✅ Artifacts are uploaded
- ✅ Release automation works
- ✅ Status badges show in README

---

### TASK-8.2: Create Release Checklist
**Priority**: P1
**Effort**: S
**Dependencies**: None

**Description**: Document release process and create checklist.

**Steps**:
1. Create `docs/release-process.md` with:
   - Pre-release checklist
   - Version bumping process
   - Changelog update
   - Testing requirements
   - Build process
   - Release creation
   - Post-release tasks
2. Create release checklist template
3. Document versioning scheme (semantic versioning)
4. Document branching strategy

**Files to Create**:
- `docs/release-process.md`
- `.github/RELEASE_CHECKLIST.md`

**Acceptance Criteria**:
- ✅ Release process is documented
- ✅ Checklist is complete
- ✅ Versioning scheme is clear
- ✅ Branching strategy is documented

---

### TASK-8.3: Create v1.0.0 Release
**Priority**: P0
**Effort**: M
**Dependencies**: All previous tasks

**Description**: Create first official release of AWS Citadel.

**Steps**:
1. Complete all P0 and P1 tasks
2. Run through release checklist
3. Update version to 1.0.0:
   - `extension/package.json`
   - `extension/manifest.json`
4. Update CHANGELOG.md
5. Create git tag: `v1.0.0`
6. Trigger release build via GitHub Actions
7. Download and verify all packages
8. Create GitHub release with:
   - Release notes
   - Download links for all platforms
   - Installation instructions
9. Announce release

**Acceptance Criteria**:
- ✅ All P0/P1 tasks complete
- ✅ Version bumped to 1.0.0
- ✅ CHANGELOG updated
- ✅ Git tag created
- ✅ Packages built successfully
- ✅ GitHub release created
- ✅ Release announced

---

### TASK-8.4: Set Up Distribution Channels
**Priority**: P2
**Effort**: M
**Dependencies**: TASK-8.3

**Description**: Set up distribution for easy installation.

**Steps**:
1. **Linux**:
   - Submit to Flathub (Flatpak)
   - Create PPA for Ubuntu
   - Submit to AUR (Arch User Repository)
2. **macOS**:
   - Create Homebrew formula
   - Submit to Homebrew Cask
3. **Windows**:
   - Consider Windows Package Manager (winget)
   - Consider Chocolatey
4. Document installation from each source
5. Set up auto-update for each channel

**Files to Create**:
- `packaging/flatpak/com.citadel.aws.yml`
- `packaging/homebrew/aws-citadel.rb`
- `packaging/winget/aws-citadel.yaml`

**Acceptance Criteria**:
- ✅ Flatpak package submitted
- ✅ Homebrew formula created
- ✅ At least one Windows package manager supported
- ✅ Installation documented for each
- ✅ Auto-update works

---

## Phase 9: Post-Launch

### TASK-9.1: Gather User Feedback
**Priority**: P1
**Effort**: Ongoing
**Dependencies**: TASK-8.3

**Description**: Set up feedback channels and gather user input.

**Steps**:
1. Set up GitHub Discussions for Q&A
2. Create issue templates:
   - Bug report
   - Feature request
   - Question
3. Monitor issues and discussions
4. Create user survey (optional)
5. Analyze feedback for prioritization
6. Document common requests

**Files to Create**:
- `.github/ISSUE_TEMPLATE/bug_report.md`
- `.github/ISSUE_TEMPLATE/feature_request.md`
- `.github/ISSUE_TEMPLATE/question.md`
- `.github/DISCUSSION_TEMPLATE/`

**Acceptance Criteria**:
- ✅ GitHub Discussions enabled
- ✅ Issue templates created
- ✅ Feedback is being collected
- ✅ Common requests are documented

---

### TASK-9.2: Bug Fixes and Patches
**Priority**: P0
**Effort**: Ongoing
**Dependencies**: TASK-8.3

**Description**: Address bugs reported by users.

**Steps**:
1. Triage incoming bug reports
2. Prioritize by severity and impact
3. Fix P0/P1 bugs quickly (within 7 days)
4. Create patch releases as needed
5. Update CHANGELOG
6. Notify users of critical fixes

**Acceptance Criteria**:
- ✅ Bugs are triaged within 24 hours
- ✅ Critical bugs fixed within 7 days
- ✅ Patch releases are published
- ✅ Users are notified

---

### TASK-9.3: Monitor LibreWolf Updates
**Priority**: P1
**Effort**: Ongoing
**Dependencies**: TASK-8.3

**Description**: Stay up-to-date with LibreWolf releases.

**Steps**:
1. Subscribe to LibreWolf release notifications
2. Test new LibreWolf versions for compatibility
3. Update bundled LibreWolf version when stable
4. Document any breaking changes
5. Release updates as needed

**Acceptance Criteria**:
- ✅ LibreWolf updates are monitored
- ✅ Compatibility is tested
- ✅ Updates are released when needed

---

## Task Dependencies Graph

```
Phase 0: Setup
TASK-0.1 (Repo Setup)
    ├── TASK-0.2 (Fork Extension)
    │       ├── TASK-0.3 (Dev Environment)
    │       └── TASK-1.* (Extension Modifications)
    └── TASK-0.4 (Documentation)

Phase 1: Extension
TASK-1.1 (Navigation Guard) ──┐
TASK-1.2 (Link Interceptor) ──┼──> TASK-1.3 (Native Messaging)
                              │           │
                              │           └──> TASK-1.4 (Background Script)
                              │                       │
TASK-1.5 (Manifest) ──────────┼───────────────────────┤
TASK-1.6 (Build Config) ──────┘                       │
                                                       │
                                        TASK-1.7 (Testing) ──┐
                                                              │
Phase 2: Native Host                                         │
TASK-2.1 (Host Implementation) ──> TASK-2.2 (Manifests)     │
                                           │                  │
                                           └──> TASK-2.3 (E2E Test) ──┤
                                                                       │
Phase 3: Browser Config                                               │
TASK-3.1 (userChrome.css) ──┐                                        │
TASK-3.2 (user.js) ──────────┼──> TASK-3.4 (Profile Template)       │
TASK-3.3 (policies.json) ────┘                                        │
                                                                       │
Phase 4: Launchers                                                     │
TASK-3.4 ──> TASK-4.1 (Linux Launcher) ───────────────────────────┐  │
             TASK-4.2 (macOS Launcher) ───────────────────────────┼──┤
             TASK-4.3 (Windows Launcher) ─────────────────────────┘  │
                                                                       │
Phase 5: Packaging                                                     │
TASK-5.1 (Bundle LibreWolf) ──┐                                       │
TASK-1.7, TASK-2.3, TASK-4.* ─┼──> TASK-5.2 (Linux Packages)         │
                               ├──> TASK-5.3 (macOS Package)          │
                               ├──> TASK-5.4 (Windows Package)        │
                               └──> TASK-5.5 (Install Docs)           │
                                                                       │
Phase 6: QA                                                            │
TASK-1.7 ──────────────────────────> TASK-6.1 (Unit Tests) ──────────┤
TASK-2.3, TASK-4.4 ──────────────────> TASK-6.2 (Integration Tests) ─┤
TASK-5.* ────────────────────────────> TASK-6.3 (E2E Tests) ──────────┤
                                       TASK-6.4 (Performance) ─────────┤
TASK-1.7, TASK-2.3 ──────────────────> TASK-6.5 (Security) ───────────┤
TASK-1.7 ──────────────────────────────> TASK-6.6 (Accessibility) ────┤
                                                                       │
Phase 7: Documentation                                                 │
TASK-5.5 ──> TASK-7.1 (User Manual) ───────────────────────┐          │
TASK-0.3 ──> TASK-7.2 (Developer Docs) ────────────────────┤          │
             TASK-7.3 (API Server Docs) ───────────────────┼──────────┤
TASK-7.1, TASK-5.5 ──> TASK-7.4 (README) ─────────────────┘          │
                                                                       │
Phase 8: Release                                                       │
TASK-6.1, TASK-6.2 ──> TASK-8.1 (CI/CD) ──────────────────┐          │
                       TASK-8.2 (Release Checklist) ───────┼──────────┘
ALL TASKS ──────────────────────────> TASK-8.3 (v1.0.0 Release)
                                              │
                                              └──> TASK-8.4 (Distribution)
                                                          │
Phase 9: Post-Launch                                     │
TASK-8.3 ──> TASK-9.1 (Feedback) ────────────────────────┤
             TASK-9.2 (Bug Fixes) ────────────────────────┤
             TASK-9.3 (Monitor LibreWolf) ────────────────┘
```

## Estimated Timeline

| Phase | Duration | Start After |
|-------|----------|-------------|
| Phase 0: Setup | 1 week | - |
| Phase 1: Extension | 2 weeks | Phase 0 |
| Phase 2: Native Host | 1 week | Phase 1 |
| Phase 3: Browser Config | 3 days | Phase 0 |
| Phase 4: Launchers | 1 week | Phase 3 |
| Phase 5: Packaging | 2 weeks | Phase 1-4 complete |
| Phase 6: QA | 2 weeks | Phase 5 |
| Phase 7: Documentation | 1 week | Phase 5 |
| Phase 8: Release | 1 week | Phase 6-7 |
| **Total** | **~10 weeks** | |

## Resource Requirements

- **1-2 Full-time Developers**: Extension and packaging work
- **1 QA Engineer** (part-time): Testing
- **1 Technical Writer** (part-time): Documentation
- **Access to**:
  - Linux VM (Ubuntu, Fedora)
  - macOS machine
  - Windows machine
  - GitHub Actions runners

## Success Metrics

- All P0 tasks completed before v1.0.0 release
- All P1 tasks completed for v1.0.0 release
- Test coverage >80%
- Documentation completeness >90%
- Zero critical bugs in v1.0.0
- Successful installation on all target platforms

## Notes

- Tasks can be parallelized where dependencies allow
- Some tasks (especially packaging) require platform-specific expertise
- QA tasks should run continuously throughout development
- Documentation should be updated as features are implemented
- This is a living document - update as tasks are completed or priorities change
