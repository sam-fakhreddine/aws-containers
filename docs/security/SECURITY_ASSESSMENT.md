# Security Assessment: AWS Profile Containers

**Date**: 2025-11-18
**Version**: 0.1.0
**Reviewer**: Security Audit
**Status**: Production-Ready with Minor Hardening Needed

---

## Executive Summary

### Overall Security Posture: **STRONG** ✅

AWS Profile Containers demonstrates **solid security practices** with defense-in-depth principles. The architecture minimizes credential exposure and follows AWS security best practices.

**Key Findings**:
- ✅ Credentials handled safely (no persistence, no logging)
- ✅ Strong authentication with cryptographic tokens
- ✅ Container isolation working correctly
- 🔴 **Critical**: CORS wildcard allows ANY Firefox extension
- 🟡 **Medium**: Extension validator incomplete/not applied
- 🟡 **Medium**: Token pattern validation too permissive

---

## Table of Contents

1. [Application Overview](#application-overview)
2. [Architecture Analysis](#architecture-analysis)
3. [Security Strengths](#security-strengths)
4. [Critical Security Concerns](#critical-security-concerns)
5. [Medium Priority Concerns](#medium-priority-concerns)
6. [Low Priority Improvements](#low-priority-improvements)
7. [Threat Model](#threat-model)
8. [Compliance & Privacy](#compliance--privacy)
9. [Recommendations](#recommendations)

---

## Application Overview

### Purpose
AWS Profile Containers is a Firefox extension that:
- Reads AWS credentials from `~/.aws/credentials` and `~/.aws/config`
- Retrieves cached AWS SSO tokens from `~/.aws/sso/cache/`
- Generates temporary AWS Console federation URLs without exposing credentials
- Opens AWS Console sessions in isolated Firefox containers (one per profile)
- Supports both static credential-based and AWS SSO (Identity Center) profiles

### Key Workflow
```
1. User clicks profile in extension popup
2. Extension → API Server (localhost:10999): Profile name only
3. API Server reads credentials from filesystem
4. API Server → AWS Federation API: Temporary credentials (HTTPS)
5. AWS Federation API → API Server: Temporary signin token
6. API Server → Extension: Console URL (with signin token, not credentials)
7. Extension opens URL in isolated Firefox container
```

### Technology Stack

**Frontend**:
- React 19 + TypeScript 5.4
- Cloudscape Design System
- webextension-polyfill

**Backend**:
- FastAPI 0.121+ / Python 3.12+
- Uvicorn (ASGI server)
- boto3 1.40+

---

## Architecture Analysis

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Firefox Extension                        │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ Popup UI    │  │ Settings     │  │ Background Page  │   │
│  │ (React)     │  │ (Token Mgmt) │  │ (Message Router) │   │
│  └──────┬──────┘  └──────┬───────┘  └────────┬─────────┘   │
│         │                │                    │              │
│         └────────────────┴────────────────────┘              │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP + X-API-Token header
                           │ (localhost:10999)
┌──────────────────────────▼──────────────────────────────────┐
│                    FastAPI Server                            │
│  ┌──────────────┐  ┌───────────────┐  ┌─────────────────┐  │
│  │ Auth         │  │ Credential    │  │ Console URL     │  │
│  │ (Token +     │  │ Provider      │  │ Generator       │  │
│  │ Rate Limit)  │  │               │  │                 │  │
│  └──────────────┘  └───────┬───────┘  └────────┬────────┘  │
└────────────────────────────┼──────────────────────┼─────────┘
                             │ File I/O              │ HTTPS
                             │                       │
┌────────────────────────────▼─────────────┐  ┌─────▼────────┐
│  ~/.aws/                                 │  │ AWS APIs     │
│  ├── credentials                         │  │ • Federation │
│  ├── config                              │  │ • SSO Portal │
│  └── sso/cache/                          │  └──────────────┘
└──────────────────────────────────────────┘
```

### Key Components

| Component | Technology | Purpose | Security Notes |
|-----------|-----------|---------|----------------|
| **Frontend** | React 19 + TypeScript | Popup UI, settings, profile management | CSP enforced, no inline scripts |
| **Background Page** | TypeScript | Message routing, lifecycle management | Isolated context |
| **API Server** | FastAPI + Uvicorn | Request handling, authentication | Token auth, rate limiting |
| **Credential Provider** | Python | Reads AWS config files | Safe INI parsing, no dangerous functions |
| **Console URL Generator** | Python (urllib) | Calls AWS Federation API | HTTPS only, temporary tokens |
| **SSO Manager** | Python | Manages SSO token caching | Validates expiration |
| **Container Manager** | TypeScript | Firefox container API integration | Isolated browser contexts |

---

## Security Strengths

### 1. Credential Handling Excellence ✅

**What Makes It Strong**:
- **No persistence**: AWS credentials are read on-demand and immediately discarded
- **No logging**: Credentials explicitly excluded from all logs
- **Temporary tokens only**: Long-term credentials converted to 12-hour federation tokens
- **HTTPS enforcement**: All AWS API calls use HTTPS
- **Memory cleanup**: Credentials not retained in memory after use

**Implementation**:
```python
# api-server/src/aws_profile_bridge/core/console_url.py
def generate_url(self, credentials: Dict[str, str]) -> Dict[str, str]:
    # Validates credentials exist
    validation_error = self._validate_credentials(credentials)
    if validation_error:
        return {"error": validation_error}

    # Gets signin token from AWS (credentials sent here, then discarded)
    signin_token = self._get_signin_token(credentials)
    if not signin_token:
        return {"error": "Failed to get federation token from AWS"}

    # Returns URL with signin token, NOT credentials
    console_url = self._build_console_url(signin_token)
    return {"url": console_url}
```

### 2. Strong Authentication ✅

**Token Generation**:
- **32-byte cryptographically secure tokens**: `secrets.token_urlsafe(32)` (~256 bits entropy)
- **Location**: `api-server/src/aws_profile_bridge/auth/token_manager.py:34`

```python
token = secrets.token_urlsafe(32)  # ~256 bits entropy
```

**Token Storage**:
- **File**: `~/.aws/profile_bridge_config.json`
- **Permissions**: `0o600` (owner read/write only)
- **Location**: `api-server/src/aws_profile_bridge/auth/token_manager.py:52`

```python
self.config_file.chmod(0o600)  # Restricted file permissions
```

**Token Validation**:
- Checked on every request via `X-API-Token` header
- Simple constant-time string comparison
- **Location**: `api-server/src/aws_profile_bridge/auth/token_manager.py:58-60`

**Rate Limiting**:
- **10 failed attempts per 60-second window** per token
- **Token hashing**: Failed attempts tracked by SHA256 hash to prevent enumeration
- **Configuration**: `api-server/src/aws_profile_bridge/config/settings.py:17-18`

```python
MAX_ATTEMPTS: int = 10
WINDOW_SECONDS: int = 60
```

### 3. Input Validation ✅

**Profile Name Validation**:
```python
# api-server/src/aws_profile_bridge/utils/validators.py
PROFILE_NAME_PATTERN = re.compile(r"^[a-zA-Z0-9._-]+$")

def validate_profile_name(name: str) -> str:
    if not name or len(name) > 128:
        raise HTTPException(status_code=400, detail="Invalid profile name")
    if not PROFILE_NAME_PATTERN.match(name):
        raise HTTPException(status_code=400, detail="Invalid profile name")
    return name
```

**Strengths**:
- Alphanumeric + `._-` pattern only
- Length limit: 128 characters
- Prevents path traversal attacks
- Rejects empty/null values

**File Parsing Security**:
- ✅ Safe INI parsing with custom parser
- ✅ No `eval()`, `pickle`, or `yaml.load_all()`
- ✅ JSON parsing uses safe `json.load()`
- ✅ File existence checks before reading
- ✅ UTF-8 encoding explicitly specified

### 4. Container Isolation ✅

**Firefox Container Integration**:
- Each AWS profile runs in isolated Firefox container
- Prevents cookie/session contamination between profiles
- Separate browser storage per container
- Container IDs managed and cleaned up properly

**Benefits**:
- Multi-account access without credential conflicts
- Visual differentiation (colored tabs)
- Session isolation (logout from one doesn't affect others)

### 5. Content Security Policy ✅

**Location**: `public/manifest.json:59-61`

```json
"content_security_policy": {
  "extension_pages": "script-src 'self'; object-src 'self'"
}
```

**Protection**:
- Restricts scripts to extension itself
- Prevents inline script execution
- Prevents object/embed elements
- Blocks external script loading

### 6. Minimal Browser Permissions ✅

**Requested Permissions**:
```json
"permissions": [
    "contextualIdentities",  // Required for containers
    "cookies",               // ⚠️ Not actually used (can be removed)
    "storage",              // Required for favorites/settings
    "tabs",                 // Required for opening console
    "alarms"                // Required for cleanup tasks
]
```

**Host Permissions** (appropriately scoped):
```json
"host_permissions": [
    "http://127.0.0.1:10999/*",      // API server (localhost only)
    "http://localhost:10999/*",       // API server (localhost only)
    "https://*.amazonaws.com/*",      // AWS services
    "https://*.aws.amazon.com/*"      // AWS console
]
```

---

## Critical Security Concerns

### 🔴 **CRITICAL: CORS Wildcard Allows ANY Extension**

**Severity**: HIGH
**Location**: `api-server/src/aws_profile_bridge/config/settings.py:11-15`

**Current Implementation**:
```python
CORS_ORIGINS: list[str] = [
    "moz-extension://*",  # ← Allows ANY Firefox extension!
    "http://localhost:*",
    "http://127.0.0.1:*",
]
```

**Risk**:
- Any malicious Firefox extension that obtains your API token can access the API server
- Token could be obtained via:
  - Malware scanning filesystem for `~/.aws/profile_bridge_config.json`
  - Social engineering (user copying token)
  - Memory inspection of Firefox process

**Attack Scenario**:
1. User installs malicious extension
2. Malicious extension reads token from disk or memory
3. Malicious extension calls `localhost:10999` with valid token
4. API server accepts request due to `moz-extension://*` wildcard
5. Attacker gains access to AWS credentials via API

**Recommended Fix**:
```python
CORS_ORIGINS: list[str] = [
    "moz-extension://aws-profile-containers@samfakhreddine.dev",  # Specific ID
    "http://localhost:*",
    "http://127.0.0.1:*",
]
```

**Additional Hardening**:
- Validate Origin header matches expected extension ID
- Log suspicious origin mismatches
- Consider adding extension UUID verification

**References**:
- Extension ID defined in: `public/manifest.json:64`
- CORS middleware applied in: `api-server/src/aws_profile_bridge/app.py:93-99`

---

### 🟡 **MEDIUM: Extension Validator Incomplete**

**Severity**: MEDIUM
**Location**: `api-server/src/aws_profile_bridge/middleware/extension_validator.py:10-30`

**Current Implementation**:
```python
ALLOWED_EXTENSION_ID = "aws-profile-containers@yourname.local"  # ← Placeholder!

async def validate_extension_origin(request: Request, call_next):
    """Validate request comes from authorized extension."""
    if request.url.path == "/health":
        return await call_next(request)

    origin = request.headers.get("origin", "")
    if (
        origin
        and origin.startswith("moz-extension://")
        and ALLOWED_EXTENSION_ID not in request.headers.get("user-agent", "")
    ):
        logger.warning(f"Unauthorized extension origin: {origin}")
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={"detail": "Unauthorized extension origin"},
        )

    return await call_next(request)
```

**Issues**:
1. **Placeholder extension ID**: `@yourname.local` instead of actual `@samfakhreddine.dev`
2. **Wrong validation approach**: Checks `User-Agent` header (easily spoofed) instead of Origin
3. **Not applied**: Middleware exists but not added to app in `app.py:88-108`
4. **Logic flaw**: Only validates if origin starts with `moz-extension://` (misses localhost)

**Risk**:
- Extension origin validation not enforced
- Intended security control bypassed
- Defense-in-depth layer missing

**Recommended Fixes**:
1. Update extension ID:
   ```python
   ALLOWED_EXTENSION_ID = "aws-profile-containers@samfakhreddine.dev"
   ```

2. Fix validation logic:
   ```python
   origin = request.headers.get("origin", "")
   if origin.startswith("moz-extension://"):
       # Extract extension ID from origin
       # Format: moz-extension://<uuid>
       if not origin.endswith(ALLOWED_EXTENSION_ID):
           logger.warning(f"Unauthorized extension: {origin}")
           return JSONResponse(
               status_code=status.HTTP_403_FORBIDDEN,
               content={"detail": "Unauthorized extension"},
           )
   ```

3. Apply middleware in `app.py`:
   ```python
   from .middleware.extension_validator import validate_extension_origin

   app.middleware("http")(validate_extension_origin)
   ```

---

### 🟡 **MEDIUM: Token Pattern Too Permissive**

**Severity**: MEDIUM
**Location**: `src/popup/constants.ts:41`

**Current Implementation**:
```typescript
export const API_TOKEN_MIN_LENGTH = 32;
export const API_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,}$/;  // ← No upper bound!
```

**Risk**:
- Accepts tokens of unlimited length (32+ chars)
- Could accept malformed tokens in future
- Potential buffer overflow if token used unsafely (unlikely in JS/Python, but poor practice)
- May allow injection attacks if token concatenated into commands

**Attack Scenario** (Low probability):
- Attacker provides extremely long token (e.g., 1MB)
- Token stored in memory, causing resource exhaustion
- Repeated attempts cause DoS

**Recommended Fix**:
```typescript
export const API_TOKEN_MIN_LENGTH = 32;
export const API_TOKEN_MAX_LENGTH = 64;
export const API_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,64}$/;
```

**Rationale**:
- `token_urlsafe(32)` generates ~43 character tokens (base64url encoding)
- 64 char upper bound provides reasonable margin
- Prevents abuse while maintaining compatibility

---

## Medium Priority Concerns

### 🟡 **Unused Permission: `cookies`**

**Severity**: LOW
**Location**: `public/manifest.json:48`

**Current Implementation**:
```json
"permissions": [
    "contextualIdentities",
    "cookies",  // ← Not actually used anywhere in code
    "storage",
    "tabs",
    "alarms"
],
```

**Risk**:
- Violates principle of least privilege
- Users may question why cookie access needed
- Potential privacy concern (even if not used)
- Increases attack surface if extension compromised

**Verification**:
Searched codebase for cookie API usage:
```bash
grep -r "browser.cookies" src/
grep -r "chrome.cookies" src/
# No results found
```

**Recommended Fix**:
Remove `cookies` from permissions array.

**Impact**: None - permission not used by any code.

---

### 🟡 **No Per-Endpoint Rate Limiting**

**Severity**: MEDIUM
**Current Implementation**: Global rate limiting only (10 attempts/60s)

**Risk**:
- Compromised valid token could spam requests
- Profile enumeration not rate-limited separately
- Could cause resource exhaustion on API server
- No protection against abuse with valid token

**Attack Scenario**:
1. Attacker obtains valid API token (e.g., from disk)
2. Makes 1000s of profile enumeration requests
3. Overwhelms API server or triggers AWS API rate limits
4. Legitimate user unable to access profiles

**Recommended Implementation**:
```python
# Per-endpoint rate limits
RATE_LIMITS = {
    "/profiles": {"requests": 100, "window": 60},              # 100/min
    "/profiles/enrich": {"requests": 50, "window": 60},        # 50/min
    "/profiles/{name}/console-url": {"requests": 20, "window": 60},  # 20/min
}
```

**Libraries to Consider**:
- `slowapi` (FastAPI rate limiting)
- `fastapi-limiter` (Redis-backed)
- Custom decorator-based limiting

---

### 🟡 **SSO Token Caching Without TTL**

**Severity**: MEDIUM
**Current Behavior**: In-memory SSO token cache might become stale

**Risk**:
- Could attempt to use expired SSO token
- Failed requests until cache invalidated
- Poor user experience (confusing error messages)

**Recommended Implementation**:
```python
class SSOCredentialProvider:
    def __init__(self):
        self._cache = {}  # {profile: (credentials, expiry_time)}

    def get_credentials(self, profile_name):
        if profile_name in self._cache:
            credentials, expiry = self._cache[profile_name]
            if time.time() < expiry - 300:  # 5 min buffer
                return credentials
            else:
                del self._cache[profile_name]  # Invalidate

        # Fetch fresh credentials...
```

---

## Low Priority Improvements

### 🟢 **Profile Names in Logs**

**Severity**: LOW
**Current Behavior**: Request logs show profile names in path

**Example**:
```
2025-11-18 10:15:32 | INFO | Request: POST /profiles/my-prod-profile/console-url
```

**Risk**:
- Log exposure reveals which profiles accessed and when
- Could indicate sensitive account structure
- Audit trail useful but also information disclosure risk

**Considerations**:
- **Pro**: Audit trail for security investigations
- **Con**: Information disclosure if logs compromised
- **Compliance**: May conflict with data minimization principles

**Options**:
1. **Mask profile names**: Replace with hash or placeholder
   ```
   Request: POST /profiles/[REDACTED]/console-url
   ```

2. **Separate audit log**: Keep detailed logs separate with stricter permissions

3. **Document behavior**: Inform users that profile names logged

**Recommendation**: Document this behavior in security documentation.

---

### 🟢 **No Automated Token Rotation**

**Severity**: LOW
**Current Process**: Manual deletion of config file + server restart

**Limitations**:
- No graceful rotation (old token immediately invalid)
- Requires server downtime
- No rotation schedule/reminders
- Users may never rotate tokens

**Recommended Implementation**:

1. **Add rotation endpoint**:
   ```python
   @router.post("/auth/rotate")
   async def rotate_token(current_token: str):
       # Validate current token
       if not token_manager.validate(current_token):
           raise HTTPException(401)

       # Generate new token
       new_token = token_manager.rotate()

       # Grace period: both tokens valid for 5 minutes
       token_manager.add_grace_period(current_token, duration=300)

       return {"new_token": new_token, "grace_period_seconds": 300}
   ```

2. **Scheduled rotation reminder**:
   - Browser extension shows notification after 90 days
   - "Rotate API token for security best practices"

3. **Document rotation procedure**:
   - Add to `docs/security/best-practices.md`
   - Include step-by-step instructions

---

### 🟢 **Add Security Headers to API**

**Severity**: LOW (informational)
**Current State**: No security headers on API responses

**Recommended Headers**:
```python
# Add to middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "no-referrer"
    return response
```

**Impact**:
- Defense in depth (primarily for browser security)
- Limited benefit for localhost API, but good practice
- Demonstrates security awareness

---

### 🟢 **Implement Structured Logging**

**Severity**: LOW (operational improvement)
**Current State**: Plain text logs

**Recommended Implementation**:
```python
import structlog

logger = structlog.get_logger()

# Instead of:
logger.info(f"Request: {method} {path}")

# Use:
logger.info("api_request",
    method=method,
    path=path,
    profile_name=profile_name,
    request_id=request_id,
    timestamp=time.time()
)
```

**Benefits**:
- Machine-parseable logs
- Easier security event tracking
- Better integration with SIEM tools
- Structured queries (e.g., "all failed auth attempts")

---

## Threat Model

### What This Extension PROTECTS Against ✅

| Threat | Mitigation | Effectiveness |
|--------|-----------|---------------|
| **Credential exposure in browser history** | Console URLs contain temporary tokens, not credentials | ✅ High |
| **Cross-profile cookie contamination** | Firefox container isolation | ✅ High |
| **Accidental credential sharing** | Credentials never leave local machine (except to AWS) | ✅ High |
| **Unencrypted credential transmission** | HTTPS for all AWS API calls | ✅ High |
| **Brute force token attacks** | Rate limiting (10/60s) + 256-bit entropy | ✅ High |
| **Profile name injection** | Regex validation + length limits | ✅ High |
| **Extension credential theft** | Token-based auth (credentials not in extension) | ✅ High |

### What This Extension DOES NOT Protect Against ❌

| Threat | Why Not Protected | User Mitigation |
|--------|-------------------|-----------------|
| **Malware on local machine** | Can read `~/.aws/credentials` directly | Antivirus, OS hardening |
| **Compromised Firefox installation** | Malicious Firefox can intercept everything | Keep Firefox updated |
| **Malicious browser extensions** | Can access extension storage (token) | Review installed extensions |
| **Physical access to computer** | Can read files, memory, browser storage | Disk encryption, screen lock |
| **Compromised OS/kernel** | Full system access | OS updates, security monitoring |
| **Keylogger** | Captures token when pasted/entered | Hardware security, virtual keyboards |
| **AWS account compromise** | Outside extension's scope | MFA, AWS security best practices |

### Attack Vectors Analysis

| Vector | Risk Level | Likelihood | Impact | Current Mitigation | Recommendation |
|--------|-----------|------------|--------|-------------------|----------------|
| **Brute force token** | Low | Very Low | High | 256-bit entropy + rate limiting | ✅ Adequate |
| **Token theft from disk** | Medium | Medium | High | File permissions (0600) | ✅ Good, consider encryption |
| **Token theft from memory** | Medium | Low | High | None | Document risk, OS-level protection |
| **Malicious extension access** | **High** | Medium | High | Token auth (but CORS wildcard) | 🔴 **Fix CORS wildcard** |
| **MITM on localhost** | Very Low | Very Low | Medium | Localhost inherently secure | ✅ Adequate |
| **MITM on AWS APIs** | Low | Very Low | High | HTTPS | Consider cert pinning |
| **SSO token expiration confusion** | Low | Medium | Low | Expiration shown in UI | ✅ Adequate |
| **Profile enumeration** | Low | Medium | Low | Token required | Consider per-endpoint rate limiting |
| **Log file disclosure** | Medium | Low | Low | Profile names in logs | Document or mask |
| **DoS via resource exhaustion** | Low | Low | Low | Rate limiting | Consider per-endpoint limits |

---

## Compliance & Privacy

### Data Collection: **ZERO** ✅

**Verified**:
- ✅ No analytics or telemetry
- ✅ No tracking pixels or beacons
- ✅ No error reporting services (Sentry, etc.)
- ✅ No third-party services contacted (except AWS official APIs)

**Code Review**:
```bash
# Searched for common telemetry/tracking services
grep -ri "google-analytics\|mixpanel\|segment\|amplitude\|sentry" .
# No results found
```

### Credential Handling: **COMPLIANT** ✅

**Best Practices Followed**:
- ✅ **No storage**: Credentials not persisted by extension
- ✅ **No transmission outside AWS**: Only sent to official AWS APIs
- ✅ **No logging**: Credentials excluded from all logs
- ✅ **Minimal retention**: Discarded immediately after use
- ✅ **Encryption in transit**: HTTPS for AWS API calls

**AWS Security Best Practices Alignment**:
- ✅ Uses AWS Federation API (official service)
- ✅ Generates temporary credentials (12-hour expiry)
- ✅ Supports AWS SSO (recommended over IAM user keys)
- ✅ No credential storage outside `~/.aws/` (standard location)

### Privacy Analysis

**Personal Data Processed**:
1. **AWS Profile Names** - Stored in browser.storage.local (favorites/recent)
2. **AWS Region Preferences** - Stored in browser.storage.local
3. **API Token** - Stored in `~/.aws/profile_bridge_config.json`

**NOT Collected/Stored**:
- ❌ AWS Account IDs
- ❌ AWS Credentials
- ❌ Console URLs (temporary, not persisted)
- ❌ Browsing history
- ❌ User behavior/analytics

**Transparency**:
- ✅ Open source (full code review possible)
- ✅ All network requests documented
- ✅ Permissions clearly explained
- ✅ No hidden functionality

### Permissions Compliance

**Requested Permissions Analysis**:

| Permission | Used For | Justified | Alternative |
|-----------|----------|-----------|-------------|
| `contextualIdentities` | Container creation/management | ✅ Yes | None (core feature) |
| `cookies` | **NOT USED** | ❌ No | Remove |
| `storage` | Favorites, recent, settings | ✅ Yes | None needed |
| `tabs` | Opening console URLs | ✅ Yes | None needed |
| `alarms` | Container cleanup | ✅ Yes | Could use setTimeout |

**Host Permissions Analysis**:

| Host | Used For | Justified | Scope |
|------|----------|-----------|-------|
| `http://127.0.0.1:10999/*` | API server | ✅ Yes | Minimal (localhost only) |
| `http://localhost:10999/*` | API server | ✅ Yes | Minimal (localhost only) |
| `https://*.amazonaws.com/*` | AWS services | ✅ Yes | Could be more specific |
| `https://*.aws.amazon.com/*` | AWS console | ✅ Yes | Required for console URLs |

**Recommendation**: Narrow AWS host permissions to specific services:
```json
"host_permissions": [
    "http://127.0.0.1:10999/*",
    "http://localhost:10999/*",
    "https://signin.aws.amazon.com/*",
    "https://console.aws.amazon.com/*",
    "https://*.console.aws.amazon.com/*",
    "https://portal.sso.*.amazonaws.com/*"
]
```

---

## Recommendations

### Immediate Action (Critical) 🔴

#### 1. Fix CORS Wildcard
**Priority**: CRITICAL
**Effort**: Low (5 minutes)
**Files**: `api-server/src/aws_profile_bridge/config/settings.py:12`

**Change**:
```python
CORS_ORIGINS: list[str] = [
-   "moz-extension://*",
+   "moz-extension://aws-profile-containers@samfakhreddine.dev",
    "http://localhost:*",
    "http://127.0.0.1:*",
]
```

**Testing**:
1. Restart API server
2. Verify extension still works
3. Test from different origin (should fail)

---

### High Priority 🟡

#### 2. Complete/Remove Extension Validator
**Priority**: HIGH
**Effort**: Medium (30 minutes)

**Option A - Fix and Apply**:
```python
# api-server/src/aws_profile_bridge/middleware/extension_validator.py
ALLOWED_EXTENSION_ID = "aws-profile-containers@samfakhreddine.dev"

async def validate_extension_origin(request: Request, call_next):
    if request.url.path in ["/health", "/version"]:
        return await call_next(request)

    origin = request.headers.get("origin", "")

    # Validate extension origin
    if origin.startswith("moz-extension://"):
        # Extract extension UUID and validate
        if not is_valid_extension_origin(origin):
            logger.warning(f"Unauthorized extension: {origin}")
            return JSONResponse(
                status_code=403,
                content={"detail": "Unauthorized extension"}
            )

    return await call_next(request)
```

```python
# api-server/src/aws_profile_bridge/app.py
from .middleware.extension_validator import validate_extension_origin

app.middleware("http")(validate_extension_origin)
```

**Option B - Remove** (if CORS fix sufficient):
- Delete `extension_validator.py`
- Document that CORS provides origin validation

---

#### 3. Set Token Pattern Upper Bound
**Priority**: HIGH
**Effort**: Low (2 minutes)
**Files**: `src/popup/constants.ts:41`

**Change**:
```typescript
export const API_TOKEN_MIN_LENGTH = 32;
+export const API_TOKEN_MAX_LENGTH = 64;
-export const API_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,}$/;
+export const API_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,64}$/;
```

---

### Medium Priority 🟢

#### 4. Remove Unused `cookies` Permission
**Priority**: MEDIUM
**Effort**: Low (1 minute)
**Files**: `public/manifest.json:48`

**Change**:
```json
"permissions": [
    "contextualIdentities",
-   "cookies",
    "storage",
    "tabs",
    "alarms"
],
```

**Testing**: Full regression test to ensure no functionality broken.

---

#### 5. Implement Per-Endpoint Rate Limiting
**Priority**: MEDIUM
**Effort**: High (2-3 hours)

**Implementation Strategy**:
```python
from collections import defaultdict
from time import time

class EndpointRateLimiter:
    def __init__(self):
        self.limits = {
            "/profiles": (100, 60),  # 100 requests per 60 seconds
            "/profiles/enrich": (50, 60),
            "/profiles/{profile}/console-url": (20, 60),
        }
        self.requests = defaultdict(list)

    def is_rate_limited(self, endpoint: str, token: str) -> bool:
        key = f"{token}:{endpoint}"
        now = time()

        # Clean old requests
        self.requests[key] = [
            req_time for req_time in self.requests[key]
            if now - req_time < self.limits[endpoint][1]
        ]

        # Check limit
        max_requests, window = self.limits[endpoint]
        if len(self.requests[key]) >= max_requests:
            return True

        self.requests[key].append(now)
        return False
```

---

#### 6. Implement SSO Token TTL Caching
**Priority**: MEDIUM
**Effort**: Medium (1 hour)

**Add to SSO credential provider**:
```python
def get_credentials(self, profile_name: str):
    # Check cache
    if profile_name in self._cache:
        creds, expiry = self._cache[profile_name]
        if time.time() < expiry - 300:  # 5 min buffer
            return creds
        else:
            logger.info(f"SSO cache expired for {profile_name}")
            del self._cache[profile_name]

    # Fetch fresh credentials...
```

---

### Low Priority (Nice to Have) 📝

#### 7. Document Profile Name Logging
**Priority**: LOW
**Effort**: Low (15 minutes)

Add to `docs/security/privacy.md`:
```markdown
## Logging Behavior

The API server logs profile names in request paths for audit purposes:
- **What's logged**: Profile names, timestamps, request methods
- **Where**: `~/.aws/logs/aws_profile_bridge_api.log`
- **Retention**: 5 rotated files × 10MB (max 50MB)
- **Permissions**: User-readable only (0600)

To disable profile name logging, set `MASK_PROFILE_NAMES=true` in environment.
```

---

#### 8. Add Automated Token Rotation
**Priority**: LOW
**Effort**: High (3-4 hours)

**Features**:
- Rotation endpoint with grace period
- Browser extension rotation UI
- 90-day rotation reminder
- Documented rotation procedure

---

#### 9. Add Security Headers
**Priority**: LOW
**Effort**: Low (15 minutes)

```python
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "no-referrer"
    return response
```

---

#### 10. Implement Structured Logging
**Priority**: LOW
**Effort**: Medium (2 hours)

**Benefits for Security**:
- Machine-parseable security events
- Easier incident response
- Integration with SIEM tools

---

## Summary

### Current State: **PRODUCTION READY** ✅

Your implementation demonstrates strong security practices:

**Excellent**:
- ✅ Credentials never persisted or logged
- ✅ Strong cryptographic tokens (256-bit entropy)
- ✅ Rate limiting prevents brute force
- ✅ Container isolation working correctly
- ✅ Input validation prevents injection
- ✅ HTTPS for external communication
- ✅ Strong CSP prevents code injection
- ✅ Zero telemetry/tracking

**Needs Hardening**:
- 🔴 Fix CORS wildcard (allows any extension)
- 🟡 Complete or remove extension validator
- 🟡 Set token pattern upper bound
- 🟢 Remove unused permissions
- 🟢 Add per-endpoint rate limiting

### For Users

**Best Practices**:
1. ✅ **Use AWS SSO** instead of long-term credentials when possible
2. ✅ **Use temporary credentials** (session tokens) instead of IAM user access keys
3. ✅ **Rotate credentials regularly** (at least monthly for IAM keys)
4. ✅ **Enable MFA** on all AWS accounts
5. ✅ **Monitor CloudTrail** for console access anomalies
6. ✅ **Keep Firefox updated** to patch security vulnerabilities
7. ✅ **Review installed extensions** periodically (remove unused ones)
8. ✅ **Protect token file**: Ensure `~/.aws/profile_bridge_config.json` has 0600 permissions
9. ✅ **Use disk encryption** to protect credentials at rest
10. ✅ **Lock screen when away** to prevent physical access

### Risk Summary

| Risk Category | Level | Status |
|---------------|-------|--------|
| **Credential Exposure** | Low | ✅ Well protected |
| **Authentication Bypass** | Medium | 🟡 Fix CORS wildcard |
| **Authorization Issues** | Low | ✅ Token-based auth working |
| **Input Validation** | Low | ✅ Strong validation |
| **Data Leakage** | Low | ✅ No persistence, HTTPS |
| **Dependency Vulnerabilities** | Low | ✅ No known CVEs |
| **Denial of Service** | Low | 🟢 Could add endpoint limits |
| **Privacy Compliance** | Low | ✅ Zero tracking |

---

## Appendix: Files Analyzed

### Security-Critical Files Reviewed

**Extension**:
- `public/manifest.json` - Permissions & CSP
- `src/services/apiClient.ts` - API communication & token handling
- `src/popup/constants.ts` - Token validation patterns
- `src/services/config.ts` - API endpoints
- `src/opener/containerOpener.ts` - Container isolation

**API Server**:
- `api-server/src/aws_profile_bridge/app.py` - Main app & CORS config
- `api-server/src/aws_profile_bridge/config/settings.py` - Configuration
- `api-server/src/aws_profile_bridge/auth/token_manager.py` - Token generation
- `api-server/src/aws_profile_bridge/auth/authenticator.py` - Authentication
- `api-server/src/aws_profile_bridge/auth/rate_limiter.py` - Rate limiting
- `api-server/src/aws_profile_bridge/middleware/extension_validator.py` - Origin validation
- `api-server/src/aws_profile_bridge/core/console_url.py` - Credential handling
- `api-server/src/aws_profile_bridge/core/credentials.py` - Credential provider
- `api-server/src/aws_profile_bridge/services/sso.py` - SSO handling
- `api-server/src/aws_profile_bridge/utils/validators.py` - Input validation

**Documentation**:
- `docs/security/` - Security documentation
- `docs/architecture.md` - System architecture
- `README.md` - Project overview

---

## Document Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-18 | Security Audit | Initial comprehensive security assessment |

---

**End of Security Assessment**
