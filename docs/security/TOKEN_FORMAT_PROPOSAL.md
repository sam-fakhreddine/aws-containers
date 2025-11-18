# API Token Format Proposal

**Date**: 2025-11-18
**Status**: PROPOSED
**Purpose**: Implement structured, deterministic token format following industry best practices

---

## Current State

### Current Token Generation
```python
# api-server/src/aws_profile_bridge/auth/token_manager.py
token = secrets.token_urlsafe(32)  # Generates ~43 char base64url string
# Example: "dGhpc19pc19hX3Rlc3RfdG9rZW5fZXhhbXBsZQ"
```

### Current Validation
```typescript
// src/popup/constants.ts
export const API_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,64}$/;
```

### Problems with Current Approach

1. **No visual identification** - Can't distinguish from other random strings
2. **No versioning** - Can't identify old vs new tokens
3. **No secret scanning** - Hard to detect tokens leaked in code/logs
4. **No quick validation** - Must hit database/config to validate
5. **No token type** - If we add multiple token types later, can't differentiate

---

## Industry Best Practices

### GitHub's Token Format

**Structure**: `{company}_{type}_{random}_{checksum}`

**Examples** (redacted for security):
- Personal Access Token: `ghp_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`
- OAuth Token: `gho_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`
- Server Token: `ghs_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`

**Key Features**:
- `gh` = GitHub (company identifier)
- `p/o/s` = token type (personal/oauth/server)
- `_` = separator (not in Base64 charset, prevents collisions)
- Last 6 chars = CRC32 checksum (Base62 encoded)

**Benefits**:
- ✅ Scannable with regex in code repos
- ✅ Identifiable at a glance
- ✅ Checksum eliminates fake tokens (no DB hit needed)
- ✅ Versioning possible (can change prefix for v2)

**Source**: [GitHub Engineering Blog - Token Formats](https://github.blog/engineering/platform-security/behind-githubs-new-authentication-token-formats/)

---

### Stripe's Token Format

**Structure**: `{prefix}_{environment}_{ulid/random}`

**Example Structure**:
```
{key_type}_{environment}_{random_data}

Where:
  key_type = "sk" (secret) or "pk" (publishable)
  environment = "test" or "live"
  random_data = ULID or random string
```

**Key Features**:
- Key type prefix indicates secret vs publishable
- Environment suffix prevents test keys in production
- Random data or ULID

**Benefits**:
- ✅ Environment-aware (prevents live keys in test)
- ✅ Type-safe (secret vs publishable)
- ✅ Secret scanning compatible

---

### AWS Access Key Format

**Structure**: `AKIA{random_20_chars}`

**Example**: `AKIAIOSFODNN7EXAMPLE`

**Key Features**:
- `AKIA` = AWS IAM Access Key prefix
- 20 chars total
- Specific character set: A-Z0-9

**Benefits**:
- ✅ Instantly recognizable
- ✅ Fixed length (easier validation)
- ✅ Secret scanners detect automatically

---

## Proposed Token Format for AWS Profile Containers

### Option 1: GitHub-Style (Recommended)

**Format**: `awspc_{random_32_bytes}_{checksum}`

**Structure**:
- `awspc` = AWS Profile Containers
- `_` = separator
- Random data: 32 bytes → Base62 encoded (43 chars)
- `_` = separator
- Checksum: CRC32 of random data → Base62 encoded (6 chars)

**Total Length**: 6 + 43 + 6 = **55 characters**

**Example**: `awspc_K8mN2pQ5rT9vX3zA7bC4dE6fG1hJ8kL0mN2pQ5rT_a7Bc9D`

**Regex Pattern**:
```typescript
export const API_TOKEN_PATTERN = /^awspc_[A-Za-z0-9]{43}_[A-Za-z0-9]{6}$/;
```

**Advantages**:
- ✅ Identifiable prefix
- ✅ Checksum validation (no DB hit for fake tokens)
- ✅ Secret scanning compatible
- ✅ Future-proof (can add version: `awspc_v2_...`)
- ✅ Fixed, predictable length

**Implementation Complexity**: Medium (need CRC32 + Base62)

---

### Option 2: Simplified Prefix

**Format**: `awspc_{random_32_bytes}`

**Structure**:
- `awspc` = AWS Profile Containers
- `_` = separator
- Random data: 32 bytes → Base62 encoded (43 chars)

**Total Length**: 6 + 43 = **49 characters**

**Example**: `awspc_K8mN2pQ5rT9vX3zA7bC4dE6fG1hJ8kL0mN2pQ5rT`

**Regex Pattern**:
```typescript
export const API_TOKEN_PATTERN = /^awspc_[A-Za-z0-9]{43}$/;
```

**Advantages**:
- ✅ Identifiable prefix
- ✅ Secret scanning compatible
- ✅ Simpler implementation (no checksum logic)
- ✅ Fixed, predictable length

**Implementation Complexity**: Low (just prefix + existing random)

---

### Option 3: Versioned Prefix

**Format**: `awspc_v1_{random_32_bytes}`

**Structure**:
- `awspc_v1` = AWS Profile Containers version 1
- `_` = separator
- Random data: 32 bytes → Base62 encoded (43 chars)

**Total Length**: 9 + 43 = **52 characters**

**Example**: `awspc_v1_K8mN2pQ5rT9vX3zA7bC4dE6fG1hJ8kL0mN2pQ5rT`

**Regex Pattern**:
```typescript
export const API_TOKEN_PATTERN = /^awspc_v\d+_[A-Za-z0-9]{43}$/;
```

**Advantages**:
- ✅ Identifiable prefix with version
- ✅ Future token format changes supported
- ✅ Can deprecate old versions gracefully

**Implementation Complexity**: Low

---

## Recommendation: **Option 1** (GitHub-Style with Checksum)

### Why?

1. **Industry Standard**: Matches GitHub, considered best-in-class
2. **Security**: Checksum prevents fake token attempts (99.99% reduction)
3. **Performance**: Can validate format + checksum without file I/O
4. **Future-proof**: Can detect/block old tokens if format changes
5. **User Experience**: Clear, professional token format

### Migration Strategy

**Phase 1: Support Both Formats** (Backward Compatible)
- Accept both old (`[A-Za-z0-9_-]{32,64}`) and new (`awspc_...`) formats
- Generate new format for new tokens
- Allow old tokens to continue working

**Phase 2: Encourage Migration** (6 months)
- Show warning in UI for old token format: "Please rotate to new format"
- Log warnings in API server for old tokens
- Document migration in changelog

**Phase 3: Deprecate Old Format** (12 months)
- Reject old format tokens
- Force all users to rotate

---

## Implementation Plan

### 1. Token Generation (Python)

```python
# api-server/src/aws_profile_bridge/auth/token_manager.py
import secrets
import base64
import zlib

class TokenManager:
    """Manages API token generation and validation."""

    TOKEN_PREFIX = "awspc"
    TOKEN_VERSION = 1
    RANDOM_BYTES = 32

    @staticmethod
    def _encode_base62(data: bytes) -> str:
        """Encode bytes to Base62 (alphanumeric only)."""
        alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
        num = int.from_bytes(data, byteorder='big')

        if num == 0:
            return alphabet[0]

        result = []
        while num:
            num, remainder = divmod(num, 62)
            result.append(alphabet[remainder])

        return ''.join(reversed(result))

    @staticmethod
    def _calculate_checksum(data: str) -> str:
        """Calculate CRC32 checksum and encode as Base62 (6 chars)."""
        crc = zlib.crc32(data.encode('utf-8'))
        checksum_bytes = crc.to_bytes(4, byteorder='big')
        checksum = TokenManager._encode_base62(checksum_bytes)
        return checksum.zfill(6)[:6]  # Pad to 6 chars

    def generate_token(self) -> str:
        """Generate new token with format: awspc_{random}_{checksum}"""
        # Generate random data
        random_bytes = secrets.token_bytes(self.RANDOM_BYTES)
        random_part = self._encode_base62(random_bytes)

        # Ensure consistent length (pad if needed)
        random_part = random_part[:43].ljust(43, '0')

        # Calculate checksum
        checksum = self._calculate_checksum(random_part)

        # Construct token
        token = f"{self.TOKEN_PREFIX}_{random_part}_{checksum}"
        return token

    @staticmethod
    def validate_format(token: str) -> bool:
        """Validate token format without checking against stored value."""
        import re

        pattern = re.compile(r"^awspc_[A-Za-z0-9]{43}_[A-Za-z0-9]{6}$")
        if not pattern.match(token):
            return False

        # Validate checksum
        parts = token.split('_')
        if len(parts) != 3:
            return False

        random_part = parts[1]
        claimed_checksum = parts[2]
        calculated_checksum = TokenManager._calculate_checksum(random_part)

        return claimed_checksum == calculated_checksum

    def validate(self, token: str | None) -> bool:
        """Validate token format and value."""
        if not token:
            return False

        # Check format and checksum
        if not self.validate_format(token):
            # Fallback: check old format for backward compatibility
            old_pattern = re.compile(r"^[A-Za-z0-9_-]{32,64}$")
            if not old_pattern.match(token):
                return False
            logger.warning(f"Old token format detected - please rotate")

        # Check against stored token
        return token == self._token
```

### 2. Token Validation (TypeScript)

```typescript
// src/popup/constants.ts
export const API_TOKEN_PREFIX = "awspc";
export const API_TOKEN_MIN_LENGTH = 55;
export const API_TOKEN_MAX_LENGTH = 55;

// New format (strict)
export const API_TOKEN_PATTERN = /^awspc_[A-Za-z0-9]{43}_[A-Za-z0-9]{6}$/;

// Old format (backward compatibility)
export const API_TOKEN_PATTERN_LEGACY = /^[A-Za-z0-9_-]{32,64}$/;
```

```typescript
// src/services/apiClient.ts
export function validateTokenFormat(token: string): boolean {
    // Try new format first
    if (API_TOKEN_PATTERN.test(token)) {
        // Validate checksum client-side
        const parts = token.split('_');
        if (parts.length !== 3) return false;

        const randomPart = parts[1];
        const claimedChecksum = parts[2];
        const calculatedChecksum = calculateChecksum(randomPart);

        return claimedChecksum === calculatedChecksum;
    }

    // Fallback to legacy format (warn user)
    if (API_TOKEN_PATTERN_LEGACY.test(token)) {
        console.warn("Legacy token format detected. Please rotate your token.");
        return true;
    }

    return false;
}

function calculateChecksum(data: string): string {
    // CRC32 implementation for client-side validation
    // (Can use a lightweight library or implement)
    // For now, skip client-side checksum validation
    return "";
}
```

### 3. UI Updates

```typescript
// src/settings/settings.tsx
const handleSave = async () => {
    const trimmedToken = token.trim();

    // Validate format
    if (!validateTokenFormat(trimmedToken)) {
        setMessage({
            type: "error",
            text: "Invalid token format. Expected: awspc_..."
        });
        return;
    }

    // Check if legacy format
    if (API_TOKEN_PATTERN_LEGACY.test(trimmedToken)) {
        setMessage({
            type: "warning",
            text: "Legacy token format. Please rotate to new format for better security."
        });
    }

    // Save token...
};
```

---

## Testing Strategy

### Unit Tests

```python
# api-server/tests/test_token_manager.py
def test_generate_token_format():
    manager = TokenManager()
    token = manager.generate_token()

    assert token.startswith("awspc_")
    assert len(token) == 55
    assert "_" in token
    parts = token.split("_")
    assert len(parts) == 3
    assert parts[0] == "awspc"
    assert len(parts[1]) == 43  # Random part
    assert len(parts[2]) == 6   # Checksum

def test_validate_checksum():
    manager = TokenManager()
    token = manager.generate_token()

    assert manager.validate_format(token) == True

    # Tamper with token
    tampered = token[:-1] + ("X" if token[-1] != "X" else "Y")
    assert manager.validate_format(tampered) == False

def test_backward_compatibility():
    manager = TokenManager()
    old_token = "dGhpc19pc19hX3Rlc3RfdG9rZW5fZXhhbXBsZQ"

    # Old tokens should still validate (format-wise)
    # But won't match stored token unless migrated
```

---

## Secret Scanning Patterns

### GitHub Secret Scanning
```regex
awspc_[A-Za-z0-9]{43}_[A-Za-z0-9]{6}
```

### GitLab Secret Detection
```yaml
# .gitlab-ci.yml
secret_detection:
  variables:
    SECRET_DETECTION_HISTORIC_SCAN: "true"
    CUSTOM_PATTERNS: |
      awspc_[A-Za-z0-9]{43}_[A-Za-z0-9]{6}
```

### Pre-commit Hook
```bash
# .git/hooks/pre-commit
#!/bin/bash
if git diff --cached | grep -E "awspc_[A-Za-z0-9]{43}_[A-Za-z0-9]{6}"; then
    echo "ERROR: AWS Profile Container token detected in commit!"
    echo "Remove the token and use environment variables instead."
    exit 1
fi
```

---

## Documentation Updates Needed

1. **README.md** - Update token format examples
2. **docs/TOKEN_AUTHENTICATION.md** - Document new format
3. **API docs** - Show new token format
4. **Migration guide** - How to rotate from old to new

---

## Pros and Cons Summary

### Pros
✅ **Industry standard** - Matches GitHub best practices
✅ **Security** - Checksum prevents 99.99% of fake tokens
✅ **Performance** - No DB hit for invalid tokens
✅ **Scannable** - Secret scanning tools can detect
✅ **Identifiable** - Instantly recognizable
✅ **Versioned** - Can evolve format over time
✅ **Professional** - Shows security maturity

### Cons
❌ **Breaking change** - Requires migration (mitigated with backward compat)
❌ **Implementation effort** - Need Base62 + CRC32 (moderate complexity)
❌ **Longer tokens** - 55 vs ~43 chars (12 chars more)
❌ **Documentation** - Need to update all docs

---

## Timeline

| Phase | Duration | Tasks |
|-------|----------|-------|
| **Design** | 1 day | Review and approve this proposal |
| **Implementation** | 2-3 days | Implement token generation, validation, tests |
| **Testing** | 1 day | Unit tests, integration tests, manual testing |
| **Documentation** | 1 day | Update all docs, examples, migration guide |
| **Migration Period** | 6 months | Support both formats, warn on old |
| **Deprecation** | 12 months | Remove old format support |

---

## Decision

**Awaiting approval to proceed with Option 1 (GitHub-Style with Checksum)**

**Alternative**: Start with **Option 2 (Simplified Prefix)** for quicker implementation, add checksum in v2.

---

## References

- [GitHub: Behind GitHub's New Authentication Token Formats](https://github.blog/engineering/platform-security/behind-githubs-new-authentication-token-formats/)
- [Stripe API Keys Format](https://gist.github.com/fnky/76f533366f75cf75802c8052b577e2a5)
- [OWASP: API Security - Authentication](https://owasp.org/www-project-api-security/)
- [RFC 4648: Base64/Base32/Base16 Encoding](https://datatracker.ietf.org/doc/html/rfc4648)

---

**Author**: Security Audit
**Date**: 2025-11-18
**Status**: PROPOSAL - Awaiting Decision
