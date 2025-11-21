# Saray - Technical Specification

**Version:** 1.0.0
**Date:** 2025-11-18
**Status:** Draft

## Executive Summary

Saray is a standalone desktop application that provides a secure, isolated environment for accessing the AWS Management Console. Built on LibreWolf (privacy-hardened Firefox) and leveraging the proven AWS Containers extension, Saray creates a dedicated workspace with container-based profile isolation while restricting access exclusively to AWS services.

## Project Overview

### Vision
Transform the AWS Containers browser extension into a standalone desktop application that serves as a secure, single-purpose interface to the AWS Management Console.

### Goals
1. **Isolation**: Create a completely isolated environment separate from general-purpose browsers
2. **Security**: Restrict navigation to AWS domains only, with external links opening in default browser
3. **Usability**: Provide streamlined AWS Console access with container-based profile management
4. **Portability**: Reuse existing extension logic with minimal modifications

### Key Features
- LibreWolf-based standalone application
- Browser container tabs for AWS profile isolation
- Restricted navigation to AWS domains only
- Hidden URL bar and minimal browser chrome
- External link redirection to system default browser
- Pre-configured with AWS Containers extension
- Native desktop integration (launcher, app icon, system tray)

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Saray App                        │
├─────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────┐  │
│  │           LibreWolf Browser Runtime                   │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  AWS Containers Extension (Modified)            │  │  │
│  │  │  ┌──────────────────────────────────────────┐   │  │  │
│  │  │  │  Container 1: AWS Profile A               │   │  │  │
│  │  │  └──────────────────────────────────────────┘   │  │  │
│  │  │  ┌──────────────────────────────────────────┐   │  │  │
│  │  │  │  Container 2: AWS Profile B               │   │  │  │
│  │  │  └──────────────────────────────────────────┘   │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │                      ↕                                 │  │
│  │              [URL Filter]                              │  │
│  └──────────────────────┬─────────────────────────────────┘  │
│                         │                                    │
│              ┌──────────▼──────────┐                         │
│              │ Browser Policies    │                         │
│              │ - Domain Whitelist  │                         │
│              │ - Security Settings │                         │
│              └─────────────────────┘                         │
├─────────────────────────────────────────────────────────────┤
│         Backend: FastAPI Server (localhost:10999)           │
│  ┌────────────────────────────────────────────────────┐     │
│  │ Existing Endpoints:                                │     │
│  │ - /profiles          - /profiles/enrich            │     │
│  │ - /profiles/{name}/console-url                     │     │
│  │                                                     │     │
│  │ New Endpoint:                                      │     │
│  │ - POST /open-url     (opens URL in system browser) │     │
│  └────────────────────────────────────────────────────┘     │
│                         ↓                                    │
│                  [System Default Browser]                   │
└─────────────────────────────────────────────────────────────┘
```

### Component Architecture

#### 1. LibreWolf Browser Core
- **Base**: LibreWolf 133.x+ (latest stable)
- **Profile**: Custom isolated profile with Saray-specific settings
- **Modifications**:
  - `userChrome.css` for UI customization
  - `user.js` for preference overrides
  - `policies.json` for security policies

#### 2. AWS Containers Extension (Forked)
**Reused Components (90%+)**:
- React UI (popup, settings pages)
- API client (`services/apiClient.ts`)
- Container management (`services/containers.ts`)
- Custom React hooks (`popup/hooks/`)
- Profile management logic
- Type definitions and validators

**Modified Components**:
- Background script: Add URL filtering logic
- Content scripts: Add external link interception
- API client: Add new endpoint for opening external URLs

**New Components**:
- URL navigation guard
- External link handler (calls API)

#### 3. FastAPI Backend (Enhanced)
- **Purpose**: Central backend service (already exists)
- **New Endpoint**: `POST /open-url`
  - Request: `{"url": "https://example.com"}`
  - Opens URL in system default browser using Python's `webbrowser` module
  - Returns: `{"success": true}` or error
- **Existing Endpoints**: Profile management, console URL generation
- **Benefits**: Same authentication/communication pattern, easier debugging

#### 4. Browser Policies & Configuration
- **policies.json**: WebsiteFilter, security settings, extension management
- **userChrome.css**: Hide URL bar, minimize chrome
- **user.js**: Privacy settings, disable unwanted features

#### 5. Application Launcher
- **Purpose**: Start LibreWolf with correct profile and settings
- **Platform-specific**: Shell script (Linux/macOS), batch/PowerShell (Windows)
- **Functions**:
  - Set environment variables
  - Launch with correct profile
  - Handle first-run setup
  - Verify API server is running

### Data Flow

#### Profile Loading Flow
```
User launches Saray
    ↓
Launcher script executes
    ↓
LibreWolf starts with custom profile
    ↓
Extension loads and initializes
    ↓
Extension fetches profiles from API (localhost:10999)
    ↓
User selects profile
    ↓
Extension creates/reuses container for profile
    ↓
Opens AWS Console in container tab
```

#### External Link Handling Flow
```
User clicks external link in AWS Console
    ↓
Content script intercepts click event
    ↓
Sends message to background script
    ↓
Background script calls API: POST /open-url
    ↓
API server opens URL in system default browser
    ↓
Original tab remains on AWS Console
```

#### URL Navigation Guard Flow
```
Navigation event occurs
    ↓
webNavigation.onBeforeNavigate listener fires
    ↓
Check if URL is AWS domain
    ↓
If YES: Allow navigation
    ↓
If NO:
  - Cancel navigation
  - Call API: POST /open-url
  - Open in system browser via API
```

## Technical Specifications

### Browser Configuration

#### userChrome.css
```css
/* Hide URL navigation bar */
#nav-bar {
  display: none !important;
}

/* Hide menu bar */
#toolbar-menubar {
  display: none !important;
}

/* Keep tab bar for container tabs */
#TabsToolbar {
  visibility: visible !important;
}

/* Minimize window controls padding */
.titlebar-spacer[type="pre-tabs"] {
  display: none !important;
}

/* Style container tab indicators */
.tabbrowser-tab[usercontextid] .tab-context-line {
  height: 4px !important;
}
```

#### policies.json
```json
{
  "policies": {
    "DisableTelemetry": true,
    "DisablePocket": true,
    "DisableFirefoxStudies": true,
    "DontCheckDefaultBrowser": true,
    "DisableSetDesktopBackground": true,
    "ExtensionSettings": {
      "aws-saray@saray.app": {
        "installation_mode": "force_installed",
        "install_url": "file:///path/to/extension.xpi"
      }
    },
    "WebsiteFilter": {
      "Block": ["<all_urls>"],
      "Exceptions": [
        "*://*.aws.amazon.com/*",
        "*://*.amazonaws.com/*",
        "*://console.aws.amazon.com/*",
        "*://signin.aws.amazon.com/*",
        "*://*.console.aws.amazon.com/*",
        "http://localhost:10999/*",
        "http://127.0.0.1:10999/*"
      ]
    },
    "Permissions": {
      "Camera": {
        "BlockNewRequests": true
      },
      "Microphone": {
        "BlockNewRequests": true
      },
      "Location": {
        "BlockNewRequests": true
      }
    },
    "PasswordManagerEnabled": false,
    "PopupBlocking": {
      "Default": false
    },
    "Cookies": {
      "Behavior": "reject-tracker-and-partition-foreign",
      "BehaviorPrivateBrowsing": "reject-tracker-and-partition-foreign"
    }
  }
}
```

#### user.js Preferences
```javascript
// Disable features not needed for AWS Console
user_pref("browser.aboutConfig.showWarning", false);
user_pref("browser.shell.checkDefaultBrowser", false);
user_pref("browser.startup.homepage", "https://console.aws.amazon.com");
user_pref("browser.newtabpage.enabled", false);
user_pref("browser.newtab.url", "https://console.aws.amazon.com");

// Container-specific settings
user_pref("privacy.userContext.enabled", true);
user_pref("privacy.userContext.ui.enabled", true);

// Security hardening
user_pref("network.dns.disablePrefetch", true);
user_pref("network.prefetch-next", false);
user_pref("network.predictor.enabled", false);

// Disable unwanted prompts
user_pref("datareporting.policy.dataSubmissionPolicyBypassNotification", true);
user_pref("browser.rights.3.shown", true);
```

### Extension Modifications

#### Updated manifest.json
```json
{
  "manifest_version": 3,
  "name": "Saray",
  "version": "2.0.0",
  "description": "Secure AWS Console access with container-based profile isolation",

  "permissions": [
    "contextualIdentities",
    "tabs",
    "cookies",
    "storage",
    "alarms",
    "webNavigation"
  ],

  "host_permissions": [
    "http://127.0.0.1:10999/*",
    "http://localhost:10999/*",
    "https://*.amazonaws.com/*",
    "https://*.aws.amazon.com/*"
  ],

  "background": {
    "service_worker": "dist/background.js",
    "type": "module"
  },

  "content_scripts": [
    {
      "matches": [
        "https://*.aws.amazon.com/*",
        "https://*.amazonaws.com/*"
      ],
      "js": ["dist/content-script.js"],
      "run_at": "document_start",
      "all_frames": true
    }
  ],

  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "32": "icons/icon-32.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
  }
}
```

#### New Background Script Features
```typescript
// background.ts additions

import { apiClient } from './services/apiClient';

// URL navigation guard
browser.webNavigation.onBeforeNavigate.addListener(
  async (details) => {
    if (details.frameId !== 0) return; // Only check main frame

    const url = new URL(details.url);

    if (!isAWSUrl(url.hostname)) {
      // Cancel navigation
      await browser.tabs.remove(details.tabId);

      // Open in system browser via API
      await openInSystemBrowser(details.url);
    }
  },
  { url: [{ schemes: ["http", "https"] }] }
);

function isAWSUrl(hostname: string): boolean {
  const awsDomains = [
    'aws.amazon.com',
    'amazonaws.com',
    'localhost',
    '127.0.0.1'
  ];

  return awsDomains.some(domain =>
    hostname === domain || hostname.endsWith('.' + domain)
  );
}

async function openInSystemBrowser(url: string): Promise<void> {
  try {
    await apiClient.post('/open-url', { url });
  } catch (error) {
    console.error('Failed to open URL in system browser:', error);
    // Fallback: show notification to user
    browser.notifications.create({
      type: 'basic',
      title: 'External Link',
      message: `Could not open: ${url}`
    });
  }
}

// Listen for messages from content script
browser.runtime.onMessage.addListener((message) => {
  if (message.type === 'OPEN_EXTERNAL') {
    openInSystemBrowser(message.url);
    return Promise.resolve({ success: true });
  }
});
```

#### New Content Script
```typescript
// content-script.ts

// Intercept external links
document.addEventListener('click', (event) => {
  const target = event.target as HTMLElement;
  const link = target.closest('a');

  if (!link || !link.href) return;

  try {
    const url = new URL(link.href);

    // Check if it's an external (non-AWS) link
    if (!isAWSUrl(url.hostname)) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      // Send to background script
      browser.runtime.sendMessage({
        type: 'OPEN_EXTERNAL',
        url: link.href
      });
    }
  } catch (e) {
    // Invalid URL, ignore
  }
}, true); // Capture phase to intercept early

function isAWSUrl(hostname: string): boolean {
  const awsDomains = [
    'aws.amazon.com',
    'amazonaws.com'
  ];

  return awsDomains.some(domain =>
    hostname === domain || hostname.endsWith('.' + domain)
  );
}

// Also handle window.open attempts
const originalWindowOpen = window.open;
window.open = function(url?: string | URL, target?: string, features?: string) {
  if (url) {
    const urlStr = url.toString();
    const urlObj = new URL(urlStr, window.location.href);

    if (!isAWSUrl(urlObj.hostname)) {
      browser.runtime.sendMessage({
        type: 'OPEN_EXTERNAL',
        url: urlStr
      });
      return null;
    }
  }

  return originalWindowOpen.call(window, url, target, features);
};
```

### FastAPI Backend Enhancement

#### New API Endpoint
Add to the existing FastAPI server (already running on localhost:10999):

```python
# In the existing FastAPI server

import webbrowser
from fastapi import HTTPException
from pydantic import BaseModel, HttpUrl

class OpenUrlRequest(BaseModel):
    url: str

@app.post("/open-url")
async def open_external_url(request: OpenUrlRequest):
    """
    Open a URL in the system default browser.
    Used for external links clicked within AWS Console.
    """
    try:
        # Validate URL is not an AWS domain (security check)
        from urllib.parse import urlparse
        parsed = urlparse(request.url)

        aws_domains = ['aws.amazon.com', 'amazonaws.com']
        if any(domain in parsed.hostname for domain in aws_domains if parsed.hostname):
            raise HTTPException(
                status_code=400,
                detail="AWS URLs should not be opened externally"
            )

        # Open in system browser
        webbrowser.open(request.url)

        return {"success": True, "url": request.url}

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to open URL: {str(e)}"
        )
```

#### API Client Update (Extension)
```typescript
// services/apiClient.ts - add method

export async function openExternalUrl(url: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/open-url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Token': getApiToken(),
    },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    throw new Error(`Failed to open URL: ${response.statusText}`);
  }

  return response.json();
}
```

### Application Launcher

#### Linux/macOS Launcher
```bash
#!/bin/bash
# aws-saray launcher script

set -e

# Determine script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CITADEL_HOME="$SCRIPT_DIR"

# Paths
LIBREWOLF_BIN="$CITADEL_HOME/librewolf/librewolf"
PROFILE_DIR="$CITADEL_HOME/profile"
POLICIES_PATH="$CITADEL_HOME/policies.json"

# Set environment variables
export MOZ_ENABLE_WAYLAND=1  # Enable Wayland support on Linux
export MOZ_DBUS_REMOTE=1

# Create profile directory if it doesn't exist
if [ ! -d "$PROFILE_DIR" ]; then
    echo "First run: Creating profile..."
    mkdir -p "$PROFILE_DIR"
    cp -r "$CITADEL_HOME/profile-template/"* "$PROFILE_DIR/"
fi

# Check if API server is running
if ! curl -s http://localhost:10999/health > /dev/null 2>&1; then
    echo "Warning: API server not running on localhost:10999"
    echo "Please start the AWS Profile API server before launching Saray"
    exit 1
fi

# Launch LibreWolf with custom profile
exec "$LIBREWOLF_BIN" \
    --profile "$PROFILE_DIR" \
    --new-instance \
    --name "Saray" \
    --class "aws-saray" \
    "https://console.aws.amazon.com" \
    "$@"
```

#### Windows Launcher (PowerShell)
```powershell
# aws-saray.ps1

$ErrorActionPreference = "Stop"

# Determine script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$SarayHome = $ScriptDir

# Paths
$LibreWolfBin = Join-Path $SarayHome "librewolf\librewolf.exe"
$ProfileDir = Join-Path $SarayHome "profile"
$PoliciesPath = Join-Path $SarayHome "policies.json"

# Create profile directory if it doesn't exist
if (-not (Test-Path $ProfileDir)) {
    Write-Host "First run: Creating profile..."
    New-Item -ItemType Directory -Path $ProfileDir | Out-Null
    Copy-Item -Path (Join-Path $SarayHome "profile-template\*") `
              -Destination $ProfileDir -Recurse
}

# Check if API server is running
try {
    $null = Invoke-WebRequest -Uri "http://localhost:10999/health" -TimeoutSec 2
} catch {
    Write-Host "Warning: API server not running on localhost:10999"
    Write-Host "Please start the AWS Profile API server before launching Saray"
    exit 1
}

# Launch LibreWolf
& $LibreWolfBin `
    -profile $ProfileDir `
    -new-instance `
    "https://console.aws.amazon.com"
```

## Security Considerations

### Threat Model

**Assets to Protect**:
1. AWS credentials and session tokens
2. AWS Console access
3. User data within AWS services

**Threats**:
1. **Phishing**: User navigates to fake AWS login page
   - **Mitigation**: URL filtering, domain whitelist
2. **Data Exfiltration**: Malicious extension or script extracts data
   - **Mitigation**: Extension isolation, no additional extensions allowed
3. **Session Hijacking**: XSS or CSRF attacks
   - **Mitigation**: LibreWolf's privacy features, container isolation
4. **Credential Exposure**: Credentials stored insecurely
   - **Mitigation**: No credentials in extension, API server reads from `~/.aws/credentials`

### Security Features

1. **Domain Whitelisting**: Only AWS domains accessible
2. **Container Isolation**: Each AWS profile in separate container
3. **No URL Bar**: Prevents manual navigation to phishing sites
4. **External Link Protection**: Non-AWS links open in system browser
5. **Privacy Hardening**: LibreWolf's built-in privacy features
6. **No Additional Extensions**: Only Saray extension allowed
7. **Isolated Profile**: Separate from user's main browser profile

### Security Best Practices

- Regular LibreWolf updates for security patches
- Minimal permissions in extension manifest
- Code review for extension modifications
- Secure native messaging host implementation
- Proper error handling to avoid information leakage

## Performance Considerations

### Resource Usage
- **Memory**: ~200-400 MB (LibreWolf base + extension + tabs)
- **Disk**: ~150-200 MB (LibreWolf + extension + profile)
- **CPU**: Minimal when idle, standard browser CPU usage when active

### Optimization Strategies
1. Reuse existing extension caching (1-minute profile cache)
2. Lazy load profile data
3. Debounced search (300ms)
4. Memoized React components
5. Efficient container management (reuse existing containers)

## Compatibility

### Supported Platforms
- **Linux**: Ubuntu 20.04+, Fedora 38+, Arch, Debian 11+
- **macOS**: 11 (Big Sur) and later
- **Windows**: Windows 10/11 (64-bit)

### Browser Requirements
- LibreWolf 133.x or later
- Firefox Contextual Identities support (built-in)

### Dependencies
- **Python**: 3.8+ (for native messaging host and API server)
- **Node.js**: 18+ (for extension build process)
- **AWS CLI**: Optional (for credential management)

## Future Enhancements

### Phase 2 Features
1. **System Tray Integration**: Minimize to system tray
2. **Quick Profile Switcher**: Global keyboard shortcut
3. **Session Management**: Save/restore tab sessions
4. **Update Mechanism**: Auto-update for app and extension
5. **Custom Themes**: Light/dark mode with AWS-themed colors

### Phase 3 Features
1. **SSO Integration**: Direct AWS SSO login flow
2. **Multi-Region Support**: Quick region switching
3. **Favorites Sync**: Cloud-based favorites synchronization
4. **Audit Logging**: Local log of console activities
5. **Screenshot Protection**: Prevent screenshots in sensitive views

## Testing Strategy

### Unit Tests
- Extension logic (React components, hooks, services)
- URL validation and filtering
- Container management
- Native messaging protocol

### Integration Tests
- Extension ↔ Native host communication
- Extension ↔ API server communication
- Container creation and isolation
- URL filtering and external link handling

### End-to-End Tests
- Launch application
- Load AWS profiles
- Open console in container
- Click external link (opens in system browser)
- Switch between profiles
- Close application

### Manual Testing
- UI/UX testing on each platform
- Accessibility testing
- Performance testing with many tabs
- Security testing (attempt to bypass restrictions)

## Deployment & Distribution

### Packaging Formats
- **Linux**: AppImage, .deb, .rpm, Flatpak
- **macOS**: .dmg, .app bundle
- **Windows**: .exe installer, portable .zip

### Installation Process
1. Download platform-specific package
2. Extract/install to desired location
3. Run launcher script
4. First-run setup: Profile creation, extension initialization
5. API server check: Verify localhost:10999 is running

### Update Strategy
- Version checking on startup
- Download update in background
- Prompt user to restart for update
- Rollback capability if update fails

## Documentation Requirements

### User Documentation
1. **Installation Guide**: Step-by-step for each platform
2. **User Manual**: Features, usage, shortcuts
3. **Troubleshooting**: Common issues and solutions
4. **FAQ**: Frequently asked questions

### Developer Documentation
1. **Architecture Overview**: This document
2. **Development Setup**: Build environment setup
3. **Contributing Guide**: How to contribute
4. **API Reference**: Extension APIs, native messaging protocol

## Maintenance & Support

### Versioning
- **Semantic Versioning**: MAJOR.MINOR.PATCH
- **Release Cycle**: Monthly minor releases, weekly patches for critical bugs

### Support Channels
- GitHub Issues: Bug reports and feature requests
- Documentation: Self-service help
- Community Discord: User community support

### Monitoring
- Crash reports (with user consent)
- Anonymous usage statistics (opt-in)
- Update success/failure metrics

## Success Metrics

### User Metrics
- Number of active installations
- Daily active users
- Average session duration
- Profile switches per session

### Performance Metrics
- Startup time < 3 seconds
- Profile load time < 1 second
- Memory usage < 500 MB with 10 tabs
- CPU usage < 5% when idle

### Quality Metrics
- Crash rate < 0.1%
- Bug fix time < 7 days
- User satisfaction > 4.5/5

## Conclusion

Saray transforms the proven AWS Containers extension into a secure, standalone desktop application. By leveraging LibreWolf's privacy features and Firefox's container technology, Saray provides an isolated, secure environment for AWS Console access while maintaining the usability and features users expect.

The architecture maximizes code reuse (90%+ of extension logic unchanged) while adding critical security features like URL filtering and external link handling. The result is a professional-grade application that addresses the need for secure, isolated AWS Console access.
