# Saray - Requirements Document

**Version:** 1.0.0
**Date:** 2025-11-18
**Status:** Draft

## Document Purpose

This document outlines the functional and non-functional requirements for Saray, a standalone desktop application for secure AWS Console access.

## Stakeholders

- **End Users**: DevOps engineers, cloud architects, AWS administrators
- **Development Team**: Extension developers, platform engineers
- **Security Team**: Application security reviewers
- **Open Source Community**: Contributors and maintainers

## Project Scope

### In Scope
- Standalone desktop application for Linux, macOS, and Windows
- LibreWolf-based browser runtime with AWS Containers extension
- Container-based AWS profile isolation
- URL filtering restricted to AWS domains
- External link handling (open in system browser)
- Native messaging for system integration
- Pre-configured security policies
- Application launcher and packaging

### Out of Scope (Initial Release)
- Mobile applications (iOS/Android)
- System tray integration (Phase 2)
- Auto-update mechanism (Phase 2)
- SSO integration (Phase 3)
- Cloud-based settings sync (Phase 3)
- Browser extension for other browsers

## Functional Requirements

### FR-1: Application Launch

**FR-1.1**: The application shall provide a platform-specific launcher (shell script for Linux/macOS, executable for Windows).

**FR-1.2**: The launcher shall initialize LibreWolf with a custom, isolated profile directory.

**FR-1.3**: On first launch, the application shall create the necessary profile directory structure.

**FR-1.4**: The application shall register the native messaging host on first launch.

**FR-1.5**: The application shall open AWS Console (https://console.aws.amazon.com) as the default homepage.

**FR-1.6**: The application launcher shall verify that the API server (localhost:10999) is running and display an error if not accessible.

### FR-2: Browser Configuration

**FR-2.1**: The application shall hide the URL/address bar from the user interface.

**FR-2.2**: The application shall hide the menu bar from the user interface.

**FR-2.3**: The application shall keep the tab bar visible for container tab identification.

**FR-2.4**: The application shall display container indicators (colored lines) on tabs.

**FR-2.5**: The application shall set AWS Console as the new tab page.

**FR-2.6**: The application shall disable browser features not needed for AWS Console (Pocket, telemetry, studies, etc.).

### FR-3: AWS Profile Management

**FR-3.1**: The extension shall fetch AWS profiles from the API server on startup.

**FR-3.2**: The extension shall display profiles in a searchable, categorized list (favorites, recent, all).

**FR-3.3**: The extension shall allow users to mark profiles as favorites.

**FR-3.4**: The extension shall track recently used profiles (last 10).

**FR-3.5**: The extension shall provide search functionality with 300ms debouncing.

**FR-3.6**: The extension shall cache profile data for 1 minute to reduce API calls.

**FR-3.7**: The extension shall display profile metadata (name, account ID, role, etc.).

### FR-4: Container Tab Management

**FR-4.1**: The extension shall create a unique browser container for each AWS profile.

**FR-4.2**: The extension shall assign consistent colors to containers based on profile name hash.

**FR-4.3**: The extension shall reuse existing containers when opening the same profile.

**FR-4.4**: The extension shall isolate cookies, storage, and sessions between containers.

**FR-4.5**: The extension shall display container name and color in the tab interface.

**FR-4.6**: The extension shall allow users to open multiple tabs within the same container.

**FR-4.7**: The extension shall clean up unused containers when profiles are removed.

### FR-5: URL Navigation Restriction

**FR-5.1**: The application shall maintain a whitelist of allowed AWS domains:
- `*.aws.amazon.com`
- `*.amazonaws.com`
- `console.aws.amazon.com`
- `signin.aws.amazon.com`
- `localhost:10999`
- `127.0.0.1:10999`

**FR-5.2**: The application shall block navigation to domains not in the whitelist.

**FR-5.3**: The application shall use browser policies (WebsiteFilter) as the first line of defense.

**FR-5.4**: The extension shall use `webNavigation.onBeforeNavigate` listener as a second defense layer.

**FR-5.5**: When blocked navigation is detected, the application shall display no error to the user (silent block).

**FR-5.6**: The application shall log blocked navigation attempts for debugging purposes.

### FR-6: External Link Handling

**FR-6.1**: The extension shall intercept click events on all anchor (`<a>`) tags.

**FR-6.2**: The extension shall check if the link target is an AWS domain.

**FR-6.3**: For non-AWS links, the extension shall:
- Prevent default navigation
- Stop event propagation
- Send the URL to the background script
- Open the URL in the system default browser via API call

**FR-6.4**: The extension shall handle `window.open()` calls similarly to anchor clicks.

**FR-6.5**: The extension shall handle links in all frames (main frame and iframes).

**FR-6.6**: The extension shall handle links that open in new tabs/windows.

### FR-7: External URL Opening via API

**FR-7.1**: The API server shall provide a `/open-url` endpoint for opening external URLs.

**FR-7.2**: The endpoint shall accept POST requests with JSON payload: `{"url": "https://..."}`.

**FR-7.3**: The endpoint shall open URLs in the system default browser using Python's `webbrowser` module.

**FR-7.4**: The endpoint shall validate that AWS URLs are not opened externally (security check).

**FR-7.5**: The endpoint shall log all URL opening actions for debugging purposes.

**FR-7.6**: The endpoint shall handle errors gracefully and return appropriate HTTP status codes.

### FR-8: API Server Integration

**FR-8.1**: The extension shall communicate with the existing API server at `http://localhost:10999`.

**FR-8.2**: The extension shall send the API token in the `X-API-Token` header.

**FR-8.3**: The extension shall fetch profiles from `/profiles` and `/profiles/enrich` endpoints.

**FR-8.4**: The extension shall fetch pre-authenticated console URLs from `/profiles/{name}/console-url`.

**FR-8.5**: The extension shall handle API errors gracefully and display user-friendly error messages.

**FR-8.6**: The extension shall implement a 5-second timeout for API requests (except health checks at 1s).

**FR-8.7**: The extension shall retry failed API requests up to 3 times with exponential backoff.

**FR-8.8**: The extension shall call the `/open-url` endpoint when external links need to be opened.

### FR-9: AWS Region Selection

**FR-9.1**: The extension shall allow users to select their preferred AWS region.

**FR-9.2**: The extension shall support all 28+ AWS regions.

**FR-9.3**: The extension shall remember the user's region selection across sessions.

**FR-9.4**: The extension shall inject the selected region into console URLs before opening.

**FR-9.5**: The extension shall provide a region selector in the popup UI.

### FR-10: User Interface

**FR-10.1**: The extension popup shall use React 19 and Cloudscape Design System components.

**FR-10.2**: The popup shall provide three views: All Profiles, Favorites, Recent.

**FR-10.3**: The popup shall display profile cards with name, account, role, and actions.

**FR-10.4**: The popup shall highlight favorite profiles with a filled star icon.

**FR-10.5**: The popup shall show a loading state while fetching profiles.

**FR-10.6**: The popup shall display error messages when API calls fail.

**FR-10.7**: The settings page shall allow configuration of API URL, token, and region.

**FR-10.8**: The UI shall support light and dark themes based on browser preference.

### FR-11: Settings Management

**FR-11.1**: The application shall store settings in browser local storage.

**FR-11.2**: The application shall allow users to configure:
- API server URL (default: http://localhost:10999)
- API token (validated: 32+ alphanumeric characters)
- Default AWS region
- Theme preference (light/dark/system)

**FR-11.3**: The settings page shall validate inputs before saving.

**FR-11.4**: The settings page shall provide default values for all settings.

**FR-11.5**: The application shall migrate settings from the browser extension version if detected.

### FR-12: Error Handling

**FR-12.1**: The application shall display user-friendly error messages for common failures:
- API server not running
- Invalid API token
- Network errors
- Profile loading failures

**FR-12.2**: The application shall log detailed error information for debugging.

**FR-12.3**: The application shall provide error recovery suggestions (e.g., "Start the API server").

**FR-12.4**: The application shall not expose sensitive information in error messages.

**FR-12.5**: The application shall handle extension crashes gracefully with automatic recovery.

### FR-13: Keyboard Shortcuts

**FR-13.1**: The application shall support the following keyboard shortcuts:
- `Ctrl/Cmd + K`: Open profile search
- `Ctrl/Cmd + T`: New tab (stays on AWS Console)
- `Ctrl/Cmd + W`: Close tab
- `Ctrl/Cmd + Shift + T`: Reopen closed tab
- `Ctrl/Cmd + Tab`: Switch between tabs

**FR-13.2**: The application shall not override browser security shortcuts (e.g., `Ctrl + Q`).

## Non-Functional Requirements

### NFR-1: Performance

**NFR-1.1**: The application shall start up in less than 3 seconds on average hardware.

**NFR-1.2**: Profile loading shall complete in less than 1 second with a warm cache.

**NFR-1.3**: The extension popup shall open in less than 200ms.

**NFR-1.4**: Search results shall appear within 50ms of user input (after debounce).

**NFR-1.5**: Memory usage shall not exceed 500 MB with 10 open tabs.

**NFR-1.6**: CPU usage shall remain below 5% when idle.

**NFR-1.7**: The application shall handle 100+ AWS profiles without performance degradation.

### NFR-2: Security

**NFR-2.1**: The application shall not store AWS credentials in any form.

**NFR-2.2**: The application shall isolate cookies and sessions between containers.

**NFR-2.3**: The application shall enforce HTTPS for all AWS domain connections.

**NFR-2.4**: The application shall validate all user inputs to prevent injection attacks.

**NFR-2.5**: The application shall use Content Security Policy (CSP) headers.

**NFR-2.6**: The native messaging host shall validate all messages before processing.

**NFR-2.7**: The application shall run with minimal permissions (no unnecessary browser permissions).

**NFR-2.8**: The application shall log security-relevant events (blocked URLs, failed authentications).

**NFR-2.9**: The application shall use LibreWolf's privacy hardening features.

**NFR-2.10**: The application shall be resistant to XSS, CSRF, and clickjacking attacks.

### NFR-3: Reliability

**NFR-3.1**: The application shall have a crash rate below 0.1%.

**NFR-3.2**: The application shall recover automatically from extension crashes.

**NFR-3.3**: The application shall handle network interruptions gracefully.

**NFR-3.4**: The application shall handle API server restarts without requiring restart.

**NFR-3.5**: The application shall preserve user state (open tabs, containers) across restarts.

**NFR-3.6**: The application shall validate data integrity on startup.

### NFR-4: Usability

**NFR-4.1**: The application shall be intuitive for users familiar with AWS Console.

**NFR-4.2**: The application shall provide visual feedback for all user actions.

**NFR-4.3**: The application shall display loading states during asynchronous operations.

**NFR-4.4**: The application shall provide helpful error messages with recovery steps.

**NFR-4.5**: The application shall use consistent AWS-themed visual design.

**NFR-4.6**: The application shall be accessible (WCAG 2.1 Level AA compliance).

**NFR-4.7**: The application shall work with screen readers.

**NFR-4.8**: The application shall support keyboard-only navigation.

### NFR-5: Compatibility

**NFR-5.1**: The application shall work on Linux (Ubuntu 20.04+, Fedora 38+, Arch, Debian 11+).

**NFR-5.2**: The application shall work on macOS 11 (Big Sur) and later.

**NFR-5.3**: The application shall work on Windows 10 and Windows 11 (64-bit).

**NFR-5.4**: The application shall work with LibreWolf 133.x and later.

**NFR-5.5**: The application shall work with Python 3.8 and later (for native host and API server).

**NFR-5.6**: The application shall not require root/administrator privileges for normal operation.

**NFR-5.7**: The application shall coexist with user's regular browser installations.

**NFR-5.8**: The application shall work with existing AWS CLI credential configurations.

### NFR-6: Maintainability

**NFR-6.1**: The codebase shall maintain 90%+ code reuse from the original extension.

**NFR-6.2**: The code shall follow TypeScript and React best practices.

**NFR-6.3**: The code shall include comprehensive inline documentation.

**NFR-6.4**: The code shall have a consistent code style (enforced by ESLint/Prettier).

**NFR-6.5**: The code shall have modular architecture for easy updates.

**NFR-6.6**: The build process shall be automated with clear documentation.

**NFR-6.7**: The project shall include automated tests with >80% code coverage.

### NFR-7: Portability

**NFR-7.1**: The application shall use cross-platform libraries and tools.

**NFR-7.2**: The build process shall support building for all target platforms.

**NFR-7.3**: The application shall use platform-agnostic paths and file operations.

**NFR-7.4**: The application shall handle platform-specific differences gracefully.

**NFR-7.5**: The packaging process shall produce native formats for each platform.

### NFR-8: Scalability

**NFR-8.1**: The application shall handle 1000+ AWS profiles without performance issues.

**NFR-8.2**: The application shall handle 50+ simultaneous open tabs.

**NFR-8.3**: The application shall handle large numbers of favorites (100+).

**NFR-8.4**: The application shall efficiently manage container resources.

**NFR-8.5**: The search functionality shall remain fast with large profile lists.

### NFR-9: Documentation

**NFR-9.1**: The project shall include comprehensive README with quick start guide.

**NFR-9.2**: The project shall include installation guides for each platform.

**NFR-9.3**: The project shall include user manual with screenshots.

**NFR-9.4**: The project shall include troubleshooting documentation.

**NFR-9.5**: The project shall include developer documentation for contributors.

**NFR-9.6**: The project shall include API reference documentation.

**NFR-9.7**: The project shall include architecture diagrams and technical specifications.

**NFR-9.8**: All documentation shall be kept up-to-date with code changes.

### NFR-10: Licensing

**NFR-10.1**: The project shall use an OSI-approved open source license.

**NFR-10.2**: All third-party dependencies shall have compatible licenses.

**NFR-10.3**: The project shall include a LICENSE file in the repository.

**NFR-10.4**: The project shall include license information in all source files.

**NFR-10.5**: The project shall document all third-party licenses used.

## User Stories

### Epic 1: Application Setup

**US-1.1**: As a DevOps engineer, I want to download and install Saray quickly so I can start using it without complex setup.

**US-1.2**: As a user, I want the application to check for the API server on startup so I know immediately if something is wrong.

**US-1.3**: As a user, I want clear error messages if the API server is not running so I know how to fix the issue.

### Epic 2: Profile Management

**US-2.1**: As an AWS administrator managing multiple accounts, I want to see all my profiles in an organized list so I can quickly find the one I need.

**US-2.2**: As a frequent user, I want to mark my most-used profiles as favorites so I can access them quickly.

**US-2.3**: As a user, I want to see my recently used profiles so I can quickly return to accounts I was just working on.

**US-2.4**: As a user managing 100+ profiles, I want fast search functionality so I can find profiles by name, account ID, or role.

**US-2.5**: As a user, I want profile colors to be consistent across sessions so I can visually identify tabs easily.

### Epic 3: Secure Console Access

**US-3.1**: As a security-conscious user, I want each AWS profile to open in an isolated container so my sessions don't interfere with each other.

**US-3.2**: As a user, I want to see which profile each tab belongs to so I don't perform actions on the wrong account.

**US-3.3**: As a user, I want multiple tabs open for the same profile so I can work across multiple AWS services simultaneously.

**US-3.4**: As a user, I want the application to prevent me from navigating to non-AWS sites so I don't accidentally leave the secure environment.

**US-3.5**: As a user, I want external links (like documentation) to open in my regular browser automatically so I can reference them while working.

### Epic 4: Navigation & Workflow

**US-4.1**: As a user, I want to select my preferred AWS region so consoles open directly in the region I work in.

**US-4.2**: As a user, I want the application to remember my region preference so I don't have to select it every time.

**US-4.3**: As a keyboard power user, I want keyboard shortcuts so I can navigate efficiently without reaching for the mouse.

**US-4.4**: As a user, I want to open multiple services in the same profile so I can work across EC2, S3, Lambda, etc. simultaneously.

### Epic 5: Security & Privacy

**US-5.1**: As a security engineer, I want the application to hide the URL bar so users can't manually navigate to phishing sites.

**US-5.2**: As a compliance officer, I want all sessions to be isolated so credentials can't leak between accounts.

**US-5.3**: As a user, I want the application to block non-AWS domains so I can't be tricked into visiting malicious sites.

**US-5.4**: As a user, I want the application to use a privacy-hardened browser so my activities are protected.

**US-5.5**: As an administrator, I want the application to log security events so I can audit usage if needed.

### Epic 6: Reliability & Performance

**US-6.1**: As a user, I want the application to start quickly so I don't waste time waiting.

**US-6.2**: As a user, I want profiles to load fast so I can get to work immediately.

**US-6.3**: As a user, I want the application to handle network errors gracefully so temporary connectivity issues don't disrupt my workflow.

**US-6.4**: As a user with many tabs open, I want the application to use reasonable memory so it doesn't slow down my system.

### Epic 7: Configuration

**US-7.1**: As a user, I want to configure the API server URL so I can use a custom server location if needed.

**US-7.2**: As a user, I want to configure my API token so I can authenticate with the backend.

**US-7.3**: As a user, I want to choose between light and dark themes so the UI matches my preference.

**US-7.4**: As a user, I want my settings to be validated before saving so I don't enter invalid configurations.

## Constraints

### Technical Constraints

**TC-1**: Must use LibreWolf as the browser base (Firefox fork requirement).

**TC-2**: Must maintain compatibility with existing AWS Profile API server.

**TC-3**: Must use Firefox's Contextual Identities API for containers.

**TC-4**: Must use native messaging for system integration (browser security constraint).

**TC-5**: Must package LibreWolf binaries (cannot rely on system installation).

**TC-6**: Must work offline after initial setup (profile cache).

### Business Constraints

**BC-1**: Must be open source to maintain community trust.

**BC-2**: Must reuse existing extension code to minimize development time.

**BC-3**: Must not require paid cloud services (fully local operation).

**BC-4**: Must be distributable without app store approval (security review timelines).

### Regulatory Constraints

**RC-1**: Must comply with GDPR for EU users (no unauthorized data collection).

**RC-2**: Must comply with WCAG 2.1 Level AA for accessibility.

**RC-3**: Must not store or transmit AWS credentials (compliance requirements).

### User Constraints

**UC-1**: Users must have the AWS Profile API server running locally.

**UC-2**: Users must have Python 3.8+ installed (for native host and API server).

**UC-3**: Users must have valid AWS credentials configured (via AWS CLI or environment).

**UC-4**: Users must have sufficient disk space (200 MB) for installation.

**UC-5**: Users must have sufficient permissions to run the application and access localhost:10999.

## Dependencies

### External Dependencies

**ED-1**: LibreWolf browser (v133.x+)

**ED-2**: AWS Profile API server (existing Python FastAPI server with new `/open-url` endpoint)

**ED-3**: Python 3.8+ (for API server)

**ED-4**: System default browser (for external link handling)

### Internal Dependencies

**ID-1**: AWS Containers extension codebase (fork source)

**ID-2**: Cloudscape Design System components

**ID-3**: React 19 and React DOM

**ID-4**: TypeScript 5.x

**ID-5**: Webpack 5 (build system)

**ID-6**: WebExtension Polyfill

### Development Dependencies

**DD-1**: Node.js 18+ (for build process)

**DD-2**: npm or yarn (package management)

**DD-3**: ESLint and Prettier (code quality)

**DD-4**: Jest and React Testing Library (testing)

**DD-5**: Git (version control)

## Acceptance Criteria

### Application Launch
- ✅ Application starts in less than 3 seconds
- ✅ Custom profile directory is created on first run
- ✅ AWS Console homepage loads automatically
- ✅ Error message displayed if API server is not running
- ✅ Launcher checks API server health before starting

### Browser UI
- ✅ URL bar is not visible
- ✅ Menu bar is not visible
- ✅ Tab bar is visible with container indicators
- ✅ Container colors are displayed on tabs

### Profile Management
- ✅ Profiles load from API server
- ✅ Search finds profiles by name, account, role
- ✅ Favorites can be added/removed
- ✅ Recent profiles are tracked
- ✅ Profile list is responsive and fast

### Container Isolation
- ✅ Each profile opens in a unique container
- ✅ Cookies are isolated between containers
- ✅ Multiple tabs can open in the same container
- ✅ Containers have consistent colors

### URL Filtering
- ✅ AWS domains are accessible
- ✅ Non-AWS domains are blocked
- ✅ Blocked navigation is silent (no error shown)
- ✅ localhost:10999 is accessible

### External Links
- ✅ Clicking external links opens system browser
- ✅ External links don't navigate the current tab
- ✅ window.open for external URLs opens system browser
- ✅ AWS links navigate normally

### API Integration
- ✅ Extension can call /open-url endpoint
- ✅ URLs open in system default browser
- ✅ Errors are logged and handled gracefully
- ✅ API server validates URLs before opening

### Settings
- ✅ API URL is configurable
- ✅ API token is validated
- ✅ Region selection works
- ✅ Theme preference is saved
- ✅ Settings persist across restarts

### Performance
- ✅ Startup time < 3 seconds
- ✅ Profile load < 1 second
- ✅ Search response < 50ms
- ✅ Memory usage < 500 MB with 10 tabs

### Security
- ✅ No credentials stored in extension
- ✅ Container isolation works
- ✅ HTTPS enforced for AWS domains
- ✅ No XSS vulnerabilities
- ✅ Security events are logged

## Risk Assessment

### High Priority Risks

**R-1: LibreWolf Compatibility Issues**
- **Risk**: Future LibreWolf updates break functionality
- **Mitigation**: Pin to specific LibreWolf version range, automated testing
- **Contingency**: Maintain compatibility layer, document version requirements

**R-2: API Endpoint Security**
- **Risk**: /open-url endpoint could be exploited to open malicious URLs
- **Mitigation**: URL validation, authentication via API token, AWS domain blocking
- **Contingency**: Disable external link opening, manual copy-paste URLs

**R-3: Container API Changes**
- **Risk**: Firefox/LibreWolf changes Contextual Identities API
- **Mitigation**: Monitor Firefox releases, maintain fallback implementation
- **Contingency**: Revert to profile-based isolation

### Medium Priority Risks

**R-4: Performance Degradation**
- **Risk**: Application becomes slow with many profiles/tabs
- **Mitigation**: Performance testing, profiling, optimization
- **Contingency**: Implement pagination, lazy loading

**R-5: Cross-Platform Differences**
- **Risk**: Platform-specific bugs are hard to reproduce
- **Mitigation**: CI/CD testing on all platforms, platform-specific testers
- **Contingency**: Document platform-specific workarounds

**R-6: API Server Dependency**
- **Risk**: API server changes break integration
- **Mitigation**: Version API, maintain backwards compatibility
- **Contingency**: Bundle compatible API server version

### Low Priority Risks

**R-7: User Adoption**
- **Risk**: Users prefer browser extension over standalone app
- **Mitigation**: Clear value proposition, ease of installation
- **Contingency**: Maintain browser extension version

**R-8: Distribution Challenges**
- **Risk**: Packaging issues on some platforms
- **Mitigation**: Test packaging on all platforms, clear documentation
- **Contingency**: Provide portable/manual installation option

## Glossary

- **Saray**: The standalone desktop application (this project)
- **AWS Containers**: The original browser extension being forked
- **LibreWolf**: Privacy-hardened Firefox fork used as application base
- **Container**: Firefox Contextual Identity for session isolation
- **Profile**: AWS account/role combination for console access
- **Native Messaging**: Browser API for extension-to-native-app communication
- **API Server**: Python FastAPI server providing AWS profile data
- **userChrome.css**: Firefox CSS file for customizing browser UI
- **policies.json**: Firefox policy file for security and feature configuration
- **Contextual Identities**: Firefox API for container tabs

## Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Product Owner | [TBD] | | |
| Lead Developer | [TBD] | | |
| Security Reviewer | [TBD] | | |
| QA Lead | [TBD] | | |

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-11-18 | Claude | Initial requirements document |
