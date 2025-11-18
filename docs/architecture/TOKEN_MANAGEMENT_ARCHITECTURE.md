# Token Management Architecture

**Date**: 2025-11-18
**Decision**: Backend-Generated, CLI-Managed Tokens
**Status**: IMPLEMENTED

---

## Architecture Decision

### **Where Should Token Management Live?**

✅ **Backend (API Server) generates and stores**
✅ **CLI provides management commands**
✅ **Extension retrieves and caches**

---

## Rationale

### Why Backend Generates Tokens?

1. **Single Source of Truth**
   - API server is the authority on authentication
   - Server validates all requests against its stored token
   - Extension cannot "self-authorize" - creates security hole

2. **Security Best Practices**
   - Python's `secrets.token_urlsafe()` is cryptographically secure
   - Server can enforce file permissions (0600 on config file)
   - Token never leaves localhost except in HTTPS requests
   - Consistent with industry standards (AWS, Docker, GitHub CLI)

3. **Multi-Client Support**
   - Same token can be used by:
     - Browser extension
     - Future CLI client
     - API testing tools
     - Multiple browser profiles
   - Token accessible from terminal for debugging

4. **Persistence & Reliability**
   - Stored in `~/.aws/profile_bridge_config.json`
   - Survives browser cache clears
   - Survives extension reinstalls
   - Can be backed up with AWS config files

---

## Why NOT Extension-Generated?

### Problems with Extension Generating Tokens

❌ **Synchronization Problem**
```
Extension generates: token_123
API Server expects: ???

How does server know what token to expect?
- Extension would need to send token to server
- Server would need to trust extension (circular trust)
- Opens security hole (any extension can set token)
```

❌ **Authority Problem**
```
Who is the authority on authentication?
- If extension: Server must trust extension (bad)
- If server: Extension cannot generate (correct)
```

❌ **Persistence Problem**
```
User clears browser data → Token lost
User reinstalls extension → Token lost
User switches browsers → Token lost
Solution: Store token somewhere... → Back to file storage
```

❌ **Multi-Client Problem**
```
Extension 1: token_abc
Extension 2 (different browser): token_xyz
Server: Which token is valid?
```

---

## Industry Patterns

### How Others Do It

| Service | Token Source | Storage | Management |
|---------|-------------|---------|------------|
| **AWS CLI** | AWS Console | `~/.aws/credentials` | `aws configure` |
| **GitHub CLI** | GitHub.com | `~/.config/gh/hosts.yml` | `gh auth login` |
| **Docker** | Docker Hub | `~/.docker/config.json` | `docker login` |
| **Stripe CLI** | Stripe Dashboard | `~/.config/stripe/config.toml` | `stripe login` |
| **Terraform** | Terraform Cloud | `~/.terraform.d/credentials.tfrc.json` | `terraform login` |

**Pattern**: Service generates → Local file stores → CLI manages → Client consumes

---

## Our Architecture

### Token Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│ 1. GENERATION (API Server Startup)                          │
├─────────────────────────────────────────────────────────────┤
│ • Server checks ~/.aws/profile_bridge_config.json           │
│ • If missing: Generate new token with TokenManager          │
│ • Token: awspc_{43_random}_{6_checksum} (56 chars)         │
│ • Save with 0600 permissions                                │
│ • Log: "Generated new API token with format: awspc_..."     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. MANAGEMENT (CLI Commands)                                │
├─────────────────────────────────────────────────────────────┤
│ • aws-profile-bridge-api token show    → Display token      │
│ • aws-profile-bridge-api token copy    → Copy to clipboard  │
│ • aws-profile-bridge-api token rotate  → Generate new       │
│ • aws-profile-bridge-api token qr      → Show QR code       │
│ • aws-profile-bridge-api setup         → Interactive wizard │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. RETRIEVAL (Extension Settings)                           │
├─────────────────────────────────────────────────────────────┤
│ • User copies token from CLI or file                        │
│ • Pastes into extension settings page                       │
│ • Extension validates format + checksum                     │
│ • Stores in browser.storage.local (extension-private)       │
│ • Caches in memory for performance                          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. USAGE (API Requests)                                     │
├─────────────────────────────────────────────────────────────┤
│ • Extension sends: X-API-Token: awspc_...                   │
│ • Server validates format (pattern + checksum)              │
│ • Server validates value (matches stored token)             │
│ • Rate limiting applied (10 failures per 60s)               │
└─────────────────────────────────────────────────────────────┘
```

---

## UX Improvements

### Before (Manual Copy-Paste)

```bash
# Step 1: Start server
$ aws-profile-bridge-api
# Server generates token, user sees in logs...

# Step 2: Find token in file
$ cat ~/.aws/profile_bridge_config.json
{
  "api_token": "awspc_K8mN2pQ5rT9vX3zA7bC4dE6fG1hJ8kL0mN2pQ5rT_3hYh9E"
}

# Step 3: Manually copy the token

# Step 4: Open browser extension settings

# Step 5: Paste token, click Save
```

**Pain Points**:
- 5 manual steps
- Requires knowledge of config file location
- Error-prone (copy wrong part, include quotes, etc.)

### After (CLI Commands)

```bash
# Quick copy (2 steps)
$ aws-profile-bridge-api token copy
✅ Token copied to clipboard!

# Then paste in extension
```

**Or interactive setup:**

```bash
$ aws-profile-bridge-api setup

====================================================
AWS Profile Bridge - Setup Wizard
====================================================

📝 Generating API token...

✅ Token generated successfully!

awspc_K8mN2pQ5rT9vX3zA7bC4dE6fG1hJ8kL0mN2pQ5rT_3hYh9E

✅ Token copied to clipboard!

====================================================
Next Steps:
====================================================

1. Start the API server:
   $ aws-profile-bridge-api

2. Configure the browser extension:
   • Open extension settings
   • Paste the token above
   • Click 'Save'

3. You're ready to go! 🚀
====================================================
```

**Benefits**:
- 2 steps instead of 5
- Automatic clipboard copy
- Clear next steps
- Professional UX

---

## Security Considerations

### Token Storage

**File**: `~/.aws/profile_bridge_config.json`
**Permissions**: `0600` (owner read/write only)
**Format**:
```json
{
  "api_token": "awspc_K8mN2pQ5rT9vX3zA7bC4dE6fG1hJ8kL0mN2pQ5rT_3hYh9E"
}
```

### Token Transmission

```
Extension → API Server: X-API-Token: awspc_...
Protocol: HTTP (localhost only - secure by design)
Network: 127.0.0.1:10999 (never leaves machine)
```

### Token Validation

**Client-side (Extension)**:
1. Format validation: `/^awspc_[A-Za-z0-9]{43}_[A-Za-z0-9]{6}$/`
2. Checksum validation: CRC32 of random part
3. **Result**: Invalid tokens rejected in <1ms (no API call)

**Server-side (API Server)**:
1. Format validation (same as client)
2. Checksum validation (same as client)
3. Value validation (matches stored token)
4. Rate limiting (10 failures per 60s)
5. **Result**: Triple validation for security

---

## CLI Commands Reference

### Show Current Token

```bash
$ aws-profile-bridge-api token show

✅ Current API Token:

awspc_K8mN2pQ5rT9vX3zA7bC4dE6fG1hJ8kL0mN2pQ5rT_3hYh9E

✓ Format: New (awspc_...)
✓ Checksum: Valid

Stored in: /home/user/.aws/profile_bridge_config.json

Next steps:
1. Copy the token above
2. Open your browser extension settings
3. Paste the token and click 'Save'
```

### Copy to Clipboard

```bash
$ aws-profile-bridge-api token copy

✅ Token copied to clipboard!

Next steps:
1. Open your browser extension settings
2. Paste (Ctrl+V / Cmd+V) the token
3. Click 'Save'
```

### Rotate Token

```bash
$ aws-profile-bridge-api token rotate

Current token: awspc_K8mN...3hYh9E

✅ New token generated!

awspc_MHBPq24pOLOHZVmHhOnA2ZSVgWDvpKtFazm0Bnd556A_2xZa3F

✅ Token copied to clipboard!

⚠️  IMPORTANT: Update your browser extension with the new token!

Steps:
1. Open browser extension settings
2. Paste the new token
3. Click 'Save'

⚠️  The old token is now invalid.
```

### Show QR Code

```bash
$ aws-profile-bridge-api token qr

✅ Scan this QR code with your mobile device:

█████████████████████████████████
█████████████████████████████████
███ ▄▄▄▄▄ █▀█ █▄▄▀▄█ ▄▄▄▄▄ ███
███ █   █ █▀▀▀█ ▀█▄█ █   █ ███
███ █▄▄▄█ █▀ █▀▀ ▄ █ █▄▄▄█ ███
█████████████████████████████████

Token: awspc_K8mN...3hYh9E
```

### Interactive Setup

```bash
$ aws-profile-bridge-api setup

# Interactive wizard walks through setup
```

---

## Future Enhancements

### Potential Improvements

1. **Auto-refresh in Extension**
   - Extension could watch config file changes
   - Auto-reload token when rotated
   - Requires native messaging or file watcher

2. **Web-based Setup UI**
   - Server hosts setup page at `http://localhost:10999/setup`
   - User opens in browser, token auto-filled in extension
   - One-click setup

3. **Token Expiration**
   - Add expiration date to tokens
   - Automatic rotation after N days
   - Warning when token expires soon

4. **Multiple Tokens**
   - Support multiple tokens for different purposes
   - Read-only vs read-write tokens
   - Per-profile tokens

5. **OAuth-style Flow**
   - Extension opens server auth page
   - User approves
   - Token automatically transferred
   - No manual copy-paste

---

## Comparison: Extension vs Backend Generation

### Extension-Generated (Rejected)

```typescript
// Extension generates token
const token = crypto.getRandomValues(new Uint8Array(32));
const tokenString = btoa(String.fromCharCode(...token));

// Now what?
// 1. How does server know this token?
// 2. Extension must send to server... but server trusts extension?
// 3. Circular trust problem
// 4. Any extension can send any token to server
// 5. Security hole: malicious extension sets weak token
```

**Problem**: Who validates the validator?

### Backend-Generated (Implemented)

```python
# Server generates token
token = TokenManager.generate_token()
# awspc_K8mN2pQ5rT9vX3zA7bC4dE6fG1hJ8kL0mN2pQ5rT_3hYh9E

# Server stores token
config.save({"api_token": token})

# Extension retrieves token (user copies)
# Extension sends token in requests
# Server validates: token == stored_token

# Clear authority: Server is the authenticator
```

**Solution**: Server is the authority, extension is the client.

---

## Decision Matrix

| Criterion | Extension Generates | Backend Generates | Winner |
|-----------|-------------------|------------------|--------|
| **Security** | Low (circular trust) | High (server authority) | ✅ Backend |
| **UX** | Good (auto-setup) | Good (with CLI) | ✅ Tie |
| **Reliability** | Low (lost on cache clear) | High (file persists) | ✅ Backend |
| **Multi-client** | No (token per extension) | Yes (one token for all) | ✅ Backend |
| **Authority** | Unclear (who validates?) | Clear (server validates) | ✅ Backend |
| **Industry Standard** | No precedent | AWS, Docker, GitHub | ✅ Backend |
| **Debugging** | Hard (token in browser) | Easy (token in file) | ✅ Backend |
| **Rotation** | Complex (sync issue) | Simple (generate new) | ✅ Backend |

**Winner**: Backend-generated with CLI management

---

## Conclusion

**Backend (API server) should generate and manage tokens** because:

1. ✅ Server is the authority on authentication (solves "who validates" problem)
2. ✅ Follows industry standards (AWS, Docker, GitHub CLI pattern)
3. ✅ Supports multiple clients (extension, CLI, testing tools)
4. ✅ Persists across browser cache clears
5. ✅ Simple rotation (generate new, invalidate old)
6. ✅ Debugging-friendly (token in plain file)
7. ✅ Better UX with CLI commands (token copy, setup wizard)

**Extension retrieves and caches** because:

1. ✅ Extension is the client, not the authority
2. ✅ Caching improves performance
3. ✅ Validation before API calls (checksum)
4. ✅ Clear separation of concerns

---

## Implementation Status

- ✅ Backend token generation (TokenManager)
- ✅ Backend token validation (TokenManager.validate_format)
- ✅ Extension token validation (apiClient.validateTokenFormat)
- ✅ Extension token caching (browser.storage.local)
- ✅ CLI commands (token show/copy/rotate/qr/setup)
- ⏳ pyproject.toml entry points (pending)
- ⏳ Documentation updates (pending)

---

**Last Updated**: 2025-11-18
**Status**: Architecture Decided & Implemented
**Next Steps**: Add CLI entry points, update documentation
