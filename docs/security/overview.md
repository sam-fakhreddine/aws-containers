# Security Overview

Complete security documentation for AWS Profile Containers. This extension handles sensitive AWS credentials - please read carefully.

## What This Extension Does

### Data Access

The extension:
- ✅ **Reads** `~/.aws/credentials` and `~/.aws/config` from local filesystem
- ✅ **Calls** AWS Federation API and AWS SSO API (official AWS services)
- ❌ **Never stores** credentials in browser storage
- ❌ **Never transmits** credentials except to official AWS endpoints

### Data Flow

```
User clicks profile
    ↓
Extension → Native host: Profile name only
    ↓
Native host reads ~/.aws/credentials
    ↓
Native host → AWS Federation API: Credentials (HTTPS)
    ↓
AWS API → Native host: Temporary signin token (12h expiry)
    ↓
Native host → Extension: Federated console URL
    ↓
Extension opens URL in Firefox container
```

**Key point:** Credentials never leave your machine except to call official AWS APIs over HTTPS.

## Security Model

### What We Protect Against

✅ **Credential exposure through browser history**
- Console URLs contain temporary tokens, not your credentials
- Tokens expire after 12 hours

✅ **Cross-profile cookie contamination**
- Each profile in isolated Firefox container
- Cookies never shared between profiles

✅ **Accidental credential sharing**
- Container isolation prevents mistakes
- Visual color coding helps identify accounts

### What We Don't Protect Against

❌ **Malware on your local machine**
- Can read `~/.aws/credentials` directly
- Same access as any local process

❌ **Compromised Firefox installation**
- Malicious Firefox could intercept credentials
- Keep Firefox updated

❌ **Other browser extensions with native messaging permission**
- Could potentially communicate with native host
- Review all installed extensions

❌ **Physical access to your computer**
- Credentials stored in plain text files
- Use disk encryption

## Network Requests

The extension makes requests **only** to official AWS endpoints:

### AWS Federation API (All Profiles)
```
POST https://signin.aws.amazon.com/federation?Action=getSigninToken
```
- Official AWS service for console federation
- Converts credentials to temporary signin token
- Documented at: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_enable-console-custom-url.html

### AWS SSO API (SSO Profiles Only)
```
GET https://portal.sso.{region}.amazonaws.com/federation/credentials
```
- Official AWS SSO service
- Retrieves temporary role credentials
- Requires valid SSO token from `aws sso login`

**No other servers are contacted.** No telemetry, no analytics, no phone home.

## What Gets Stored

### In Browser Local Storage

Only non-sensitive metadata:
- **Profile names** you've favorited
- **Profile names** in recent list (last 10)
- **Region preference** (e.g., "us-east-1")
- **Container IDs** (for cleanup)

### What's NOT Stored

❌ AWS Access Keys
❌ AWS Secret Keys
❌ Session Tokens
❌ SSO Tokens
❌ Console URLs (contain temporary tokens)
❌ Any credential data

## Browser Permissions

Minimal permissions requested:

```json
{
  "permissions": [
    "contextualIdentities",  // Create/manage containers
    "cookies",               // Container isolation
    "tabs",                  // Open tabs
    "storage",               // Store favorites/recent
    "nativeMessaging"        // Read credentials
  ]
}
```

**Why native messaging?** Firefox extensions cannot directly read files. This is the only way to access `~/.aws/credentials` while maintaining security.

## Native Messaging Bridge

### What It Is

A local executable that:
- Runs only when extension needs it
- Communicates via stdin/stdout
- Limited to this extension only (by manifest)
- No network server, no listening port

### Security Features

**Process isolation:**
- Runs as your user (no elevated privileges)
- Can only access files you can access
- Terminated after each request

**Communication:**
- Standard input/output only
- JSON message format
- Validated input
- No remote access

**Code transparency:**
- Open source Python code (readable)
- Or standalone executable built with PyInstaller
- Can audit before installation

### Locations

- **Executable:** `~/.local/bin/aws_profile_bridge`
- **Manifest (Linux):** `~/.mozilla/api-server-hosts/aws_profile_bridge.json`
- **Manifest (macOS):** `~/Library/Application Support/Mozilla/NativeMessagingHosts/aws_profile_bridge.json`

## Credential Lifetime

| Type | Duration | Storage |
|------|----------|---------|
| Access Key + Secret | One-time use per profile open | Never stored |
| Session Token | One-time use per profile open | Never stored |
| SSO Token | Until expiry (configured in SSO) | AWS CLI cache only |
| Signin Token (from AWS) | 12 hours | Embedded in URL, not stored |
| Console Session | Until sign out or token expires | Browser session |

**Credentials are read, used once, and discarded.**

## Code Transparency

### Audit the Code

All credential handling is visible:

**Native Bridge:**
- Source: `api-server/src/aws_profile_bridge/`
- Key files:
  - `file_parsers.py` - Reads AWS files
  - `credential_provider.py` - Orchestrates credential retrieval
  - `console_url_generator.py` - Calls AWS Federation API

**Extension:**
- Source: `src/`
- Key files:
  - `popup/awsProfiles.tsx` - UI and profile handling
  - `backgroundPage.ts` - Native messaging communication
  - `opener/containers.ts` - Container management

### Verify Installation

Check what's installed:

```bash
# Native messaging manifest
cat ~/.mozilla/api-server-hosts/aws_profile_bridge.json

# Executable
ls -la ~/.local/bin/aws_profile_bridge

# Extension
ls -la /path/to/aws-containers/dist/
```

Verify only runs when you use it:
```bash
# Should be empty when extension not in use
ps aux | grep aws_profile_bridge
```

## Privacy

### Zero Data Collection

We collect **ZERO data**:

- ❌ No analytics
- ❌ No telemetry
- ❌ No usage tracking
- ❌ No error reporting to external servers
- ❌ No phone home
- ❌ No third-party services (except AWS)

### Third-Party Services

**Only service contacted:**
- AWS Federation API (signin.aws.amazon.com)
- AWS SSO API (portal.sso.{region}.amazonaws.com)

Both are official AWS services required for functionality.

## Best Practices

### For Users

1. **Review code before installing**
   - Check the source code on GitHub
   - Audit credential handling

2. **Use temporary credentials**
   - Prefer session tokens with expiration
   - Avoid long-term IAM user keys

3. **Prefer SSO**
   - More secure than long-term credentials
   - Centralized access management
   - Automatic credential rotation

4. **Rotate credentials regularly**
   - Refresh temporary credentials often
   - Don't let credentials sit unused

5. **Monitor AWS CloudTrail**
   - Watch for unexpected console access
   - Set up alerts for production accounts

6. **Enable MFA**
   - On all AWS accounts
   - Additional security layer

7. **Use least privilege**
   - Only grant necessary permissions
   - Use read-only roles when possible

8. **Keep software updated**
   - Firefox
   - Extension
   - Operating system

### For Developers

1. **Never log credentials**
   - Not in console
   - Not in files
   - Not in error messages

2. **Use HTTPS only**
   - All AWS API calls use HTTPS
   - No plain text transmission

3. **Minimal permissions**
   - Request only necessary browser permissions
   - Follow principle of least privilege

4. **Clear error messages**
   - Help users without exposing credentials
   - Generic errors for security issues

5. **Security reviews**
   - Code review all credential handling
   - Test for security issues

## Threat Model

### Assumptions

**What we assume:**
- Your computer is not compromised
- Firefox is trustworthy
- AWS APIs are secure
- Network connection is secure (HTTPS)

**What we don't assume:**
- Other browser extensions are safe
- All processes on computer are trustworthy
- Filesystem is encrypted

### Attack Vectors

**Mitigated:**
- ✅ Credential exposure in browser history
- ✅ Cross-account session contamination
- ✅ Accidental credential sharing

**Partially mitigated:**
- ⚠️ Malicious browser extension (limited by Firefox permissions model)
- ⚠️ Compromised Firefox (assumes browser is trustworthy)

**Not mitigated:**
- ❌ Local malware (has same access as you)
- ❌ Physical access (credentials in plain text files)
- ❌ Compromised OS (can read all files)

### Defense in Depth

Layers of security:

1. **Container isolation** - Browser-level separation
2. **Temporary tokens** - Limited lifetime credentials
3. **No credential storage** - Credentials never persisted
4. **Minimal permissions** - Only necessary access
5. **Code transparency** - Open source for auditing

## Compliance Considerations

### Data Residency

- Credentials never leave your machine (except to AWS)
- No data transmission to third parties
- No cloud storage of credentials

### Audit Trail

- No built-in logging (by design)
- Use AWS CloudTrail for console access auditing
- Browser console shows extension activity (for debugging)

### Credential Management

- Compatible with standard AWS credential management
- Works with AWS Organizations
- Supports SSO/SAML integration via AWS CLI

## Reporting Security Issues

If you find a security vulnerability:

1. **DO NOT** open a public GitHub issue
2. Email security concerns to: [Create security email]
3. Include:
   - Vulnerability description
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We will respond within 48 hours.

## Security Updates

Stay informed:
- Watch GitHub repository for updates
- Subscribe to releases
- Check changelog for security fixes

## Alternatives

If concerned about security, consider:

- **AWS SSO** - No long-term credentials needed
- **AWS Vault** - Encrypted credential storage
- **Manual console login** - No extension needed
- **AWS CLI only** - Skip console access entirely

## Further Reading

- [Privacy Policy](privacy.md)
- [Best Practices](best-practices.md)
- [Installation Guide](../getting-started/installation.md)
- [Troubleshooting](../user-guide/troubleshooting.md)

## License & Liability

This software is provided "as is" without warranty. Use at your own risk.

See LICENSE file for full details.
