# Security & Privacy

## Overview

AWS Profile Containers is a Firefox extension that reads your local AWS credentials and opens AWS Console sessions in isolated Firefox containers. **This extension handles sensitive credentials - please review this document carefully.**

## What This Extension Does

### Data Access
1. **Reads** `~/.aws/credentials` file on your local machine
2. **Reads** `~/.aws/config` file for SSO profile configuration
3. **Reads** `~/.aws/sso/cache/` directory for cached SSO tokens
4. **Reads** AWS access keys, secret keys, and session tokens from profiles
5. **Never stores** credentials in browser storage or any persistent location
6. **Never transmits** credentials to any server except AWS's official APIs (Federation and SSO)

### Data Flow

#### Credential-Based Profiles
```
┌─────────────────────────────────────────────────────────────────┐
│ 1. User clicks profile in extension popup                      │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Extension → Native Python bridge (local process)            │
│    Sends: Profile name only                                     │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Python bridge reads ~/.aws/credentials                      │
│    Extracts: aws_access_key_id, aws_secret_access_key,         │
│              aws_session_token for the selected profile         │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Python bridge → AWS Federation API (HTTPS)                  │
│    URL: https://signin.aws.amazon.com/federation                │
│    Sends: Credentials to generate a signin token               │
│    Receives: Temporary signin token (12 hour expiry)           │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. Python bridge → Extension                                   │
│    Sends: Federated console URL (contains signin token)        │
│    Does NOT send: Original credentials                         │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. Extension opens URL in Firefox container                    │
│    AWS Console authenticates using signin token                │
└─────────────────────────────────────────────────────────────────┘
```

#### AWS IAM Identity Center (SSO) Profiles
```
┌─────────────────────────────────────────────────────────────────┐
│ 1. User clicks SSO profile in extension popup                  │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Extension → Native Python bridge (local process)            │
│    Sends: Profile name only                                     │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Python bridge reads ~/.aws/config                           │
│    Extracts: sso_start_url, sso_region, sso_account_id,        │
│              sso_role_name for the selected profile             │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Python bridge reads ~/.aws/sso/cache/                       │
│    Finds cached SSO token matching start_url                   │
│    Extracts: accessToken (previously obtained via aws sso login)│
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. Python bridge → AWS SSO API (HTTPS)                         │
│    URL: https://portal.sso.{region}.amazonaws.com              │
│    Sends: SSO token to get temporary role credentials          │
│    Receives: Temporary AWS credentials for the role            │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. Python bridge → AWS Federation API (HTTPS)                  │
│    (Same as step 4 in credential-based flow)                   │
│    Converts temporary credentials to console signin token      │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. Python bridge → Extension                                   │
│    Sends: Federated console URL (contains signin token)        │
│    Does NOT send: SSO token or temporary credentials           │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 8. Extension opens URL in Firefox container                    │
│    AWS Console authenticates using signin token                │
└─────────────────────────────────────────────────────────────────┘
```

## What Gets Stored

### In Browser Local Storage (browser.storage.local)
- **Profile favorites**: List of profile names you've starred
- **Recent profiles**: Last 10 profile names you opened
- **Selected region**: Your AWS region preference (e.g., "us-east-1")
- **Container IDs**: Firefox container identifiers for cleanup

**None of these contain credentials.**

### Not Stored Anywhere
- ❌ AWS Access Keys
- ❌ AWS Secret Keys
- ❌ Session Tokens
- ❌ Console URLs (they contain temporary signin tokens)
- ❌ Any credentials from ~/.aws/credentials

## Security Model

### Threat Model

**What this extension protects against:**
- ✅ Credential exposure through browser history
- ✅ Cross-profile cookie contamination
- ✅ Accidental credential sharing (each profile in isolated container)

**What this extension does NOT protect against:**
- ❌ Malware on your local machine (can read ~/.aws/credentials directly)
- ❌ Compromised Firefox installation
- ❌ Browser extensions with native messaging permission
- ❌ Physical access to your computer

### Native Messaging Bridge

The Python bridge (`aws_profile_bridge.py`) runs as a **local process** with:
- Access to your filesystem (reads ~/.aws/credentials)
- Network access (calls AWS Federation API)
- No elevated privileges required
- Communication limited to this extension only

**Location:** `~/.local/bin/aws_profile_bridge.py`

### Network Requests

The extension makes requests to **official AWS endpoints only**:

**For all profiles:**
```
POST https://signin.aws.amazon.com/federation?Action=getSigninToken
```
This is AWS's official federation endpoint for console access.

**For SSO profiles only:**
```
GET https://portal.sso.{region}.amazonaws.com/federation/credentials
```
This is AWS's official SSO endpoint for retrieving temporary role credentials.

**No other servers are contacted.** All requests are made over HTTPS to AWS-owned domains.

### Browser Permissions Required

```json
{
  "permissions": [
    "contextualIdentities",  // Create/manage Firefox containers
    "storage"                // Store favorites/recent profiles
  ],
  "host_permissions": [
    "http://127.0.0.1:10999/*",    // Local API server only
    "http://localhost:10999/*",     // Local API server only
    "https://*.amazonaws.com/*",    // AWS Console domains only
    "https://*.aws.amazon.com/*"    // AWS Console domains only
  ],
  "optional_permissions": [
    "tabs"                   // Requested when opening AWS Console
  ]
}
```

**Security Improvements:**
- ✅ **Host-specific permissions**: Only AWS domains and localhost
- ✅ **Runtime permission requests**: Tabs permission requested when needed
- ✅ **Removed cookies permission**: Not actually required for container isolation
- ✅ **Principle of least privilege**: Minimal default permissions

**📖 For detailed permission security analysis, see [PERMISSIONS_SECURITY.md](PERMISSIONS_SECURITY.md)**

## Privacy

### Data Collection
**We collect ZERO data.** This extension:
- Does not phone home
- Does not have analytics
- Does not track usage
- Does not send telemetry
- Does not share data with third parties

### Third Party Services
The **only** external service contacted is:
- **AWS Federation API** (signin.aws.amazon.com)
- Purpose: Generate temporary console signin tokens
- Official AWS service
- Required for console access

## Code Transparency

### Audit the Code

All sensitive operations are in these files:

1. **Native Bridge** (`api-server/aws_profile_bridge.py`)
   - Lines 176-194: Read credentials from file
   - Lines 126-174: Generate console URL (calls AWS API)

2. **Extension** (`src/popup/awsProfiles.tsx`)
   - Lines 146-195: Handle profile opening
   - Lines 14-49: Container management (no credentials involved)

### Verify Installation

```bash
# Check native messaging manifest
cat ~/Library/Application\ Support/Mozilla/NativeMessagingHosts/aws_profile_bridge.json

# Check Python bridge
cat ~/.local/bin/aws_profile_bridge.py

# Verify it only runs when you use the extension
ps aux | grep aws_profile_bridge
```

## Best Practices

### For Users

1. **Review the code** before installing
2. **Use temporary credentials** (session tokens) when possible
3. **Don't use long-term credentials** (AWS IAM user keys) with this extension
4. **Rotate credentials regularly**
5. **Monitor AWS CloudTrail** for unexpected console access
6. **Use MFA** on your AWS accounts

### For Developers

1. **Never log credentials** (we don't)
2. **Use HTTPS only** (we do - AWS Federation API)
3. **Minimal permissions** (we request only what's needed)
4. **No external dependencies** for credential handling
5. **Clear error messages** without exposing credentials

## Credential Lifetime

| Type | Where Used | Duration |
|------|------------|----------|
| Access Key + Secret | Sent to AWS Federation API | One-time use per profile open |
| Session Token | Sent to AWS Federation API | One-time use per profile open |
| Signin Token | Embedded in console URL | 12 hours (AWS limit) |
| Console Session | AWS Console in browser | Until you sign out or token expires |

**Credentials are never cached or persisted by this extension.**

## Reporting Security Issues

If you find a security vulnerability:

1. **DO NOT** open a public GitHub issue
2. Email: [your-security-email@example.com]
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We will respond within 48 hours.

## License & Liability

This software is provided "as is" without warranty. Use at your own risk. See LICENSE file for details.

## Alternatives

If you're concerned about security, consider these alternatives:
- **AWS SSO** - No long-term credentials
- **AWS CLI profiles** with MFA
- **Manual console login** - No extension needed
- **AWS Vault** - Encrypted credential storage
