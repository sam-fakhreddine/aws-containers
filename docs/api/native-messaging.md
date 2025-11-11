# Native Messaging API

Documentation for the native messaging protocol between the Firefox extension and the native host.

## Protocol Overview

Communication uses the native messaging protocol:

**Message Format:**
```
[4-byte length][JSON message]
```

- Length: 32-bit unsigned integer (native byte order)
- Message: UTF-8 encoded JSON

## Messages from Extension to Host

### Get Profiles

Request list of AWS profiles.

**Request:**
```json
{
  "action": "getProfiles"
}
```

**Response:**
```json
{
  "profiles": [
    {
      "name": "profile-name",
      "type": "credential",
      "color": "red",
      "icon": "fingerprint",
      "expired": false,
      "expiresAt": "2024-11-10T15:30:00Z",
      "timeRemaining": "2h 15m"
    },
    {
      "name": "sso-profile",
      "type": "sso",
      "color": "green",
      "icon": "briefcase",
      "expired": false,
      "expiresAt": "2024-11-10T18:00:00Z"
    }
  ]
}
```

### Open Profile

Generate console URL for a profile.

**Request:**
```json
{
  "action": "openProfile",
  "profileName": "my-profile",
  "region": "us-east-1"
}
```

**Response:**
```json
{
  "url": "https://signin.aws.amazon.com/federation?Action=login&SigninToken=...&Destination=..."
}
```

**Error Response:**
```json
{
  "error": "Profile not found: my-profile"
}
```

## Profile Object

```typescript
interface Profile {
  name: string;           // Profile name
  type: "credential" | "sso";  // Profile type
  color: string;          // Container color
  icon: string;           // Container icon
  expired: boolean;       // Is expired?
  expiresAt?: string;     // ISO 8601 timestamp
  timeRemaining?: string; // Human readable
}
```

## Error Handling

Errors returned as JSON:

```json
{
  "error": "Error message here"
}
```

Common errors:
- "Profile not found"
- "Credentials expired"
- "Failed to generate console URL"
- "SSO token not found"

## Security

- Extension and host communicate via stdin/stdout only
- No network server
- Limited to single extension (by manifest)
- Process isolation

See [Security Overview](../security/overview.md) for details.
