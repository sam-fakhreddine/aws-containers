# Privacy Policy

AWS Profile Containers Extension - Privacy Policy

## Data Collection

**We collect ZERO personal data.**

- ❌ No analytics
- ❌ No telemetry
- ❌ No usage tracking
- ❌ No error reporting
- ❌ No user identification
- ❌ No network beaconing

## What is Stored Locally

The extension stores only non-sensitive metadata in Firefox local storage:

### Profile Names
- Names of favorited profiles
- Names of recently opened profiles (last 10)
- **No credentials stored, only names**

### Preferences
- Selected AWS region (e.g., "us-east-1")
- Container IDs for cleanup

### What is NOT Stored
- ❌ AWS Access Keys
- ❌ AWS Secret Keys
- ❌ Session Tokens
- ❌ Console URLs
- ❌ Any credential data
- ❌ Personal information
- ❌ Usage statistics

## Data Transmission

### To AWS Only

The extension transmits data **only** to official AWS services:

**AWS Federation API:**
- URL: `https://signin.aws.amazon.com/federation`
- Data sent: AWS credentials (to generate signin token)
- Purpose: Generate temporary console access token

**AWS SSO API:**
- URL: `https://portal.sso.{region}.amazonaws.com`
- Data sent: SSO token (to generate role credentials)
- Purpose: Retrieve temporary credentials for SSO profiles

### No Third Parties

- ❌ No external servers
- ❌ No analytics services
- ❌ No ad networks
- ❌ No data brokers
- ❌ No cloud services

## Credentials Handling

### How Credentials are Used

1. **Read from local filesystem** (`~/.aws/credentials`, `~/.aws/config`)
2. **Used once** to call AWS API
3. **Immediately discarded** after use
4. **Never stored** in browser storage
5. **Never transmitted** except to AWS

### Credential Lifetime

- Read on-demand when you click a profile
- Sent to AWS API to generate temporary token
- Discarded after API response
- Not cached or persisted

## Browser Permissions

The extension requests minimal permissions:

```json
{
  "permissions": [
    "contextualIdentities",  // Create Firefox containers
    "cookies",               // Container isolation
    "tabs",                  // Open tabs in containers
    "storage",               // Store favorites/recent (names only)
    "nativeMessaging"        // Access local credential files
  ]
}
```

### Why These Permissions?

- **contextualIdentities**: Create isolated containers for each AWS profile
- **cookies**: Required for container isolation to work
- **tabs**: Open AWS Console in containers
- **storage**: Remember your favorites and recent profiles
- **nativeMessaging**: Read `~/.aws/credentials` (Firefox extensions can't read files directly)

## Third-Party Services

**The only third party is AWS:**

- AWS Federation API (official AWS service)
- AWS SSO API (official AWS service)

Both are required for the extension to function.

## Firefox Sync

If you use Firefox Sync:
- Extension settings (favorites, recent, region) may sync across devices
- Credentials are **never synced**
- Only non-sensitive metadata syncs

## Children's Privacy

This extension is not directed at children and we do not knowingly collect information from children under 13.

## Changes to Privacy Policy

We will update this policy if our privacy practices change. Check the GitHub repository for updates.

## Your Rights

You have the right to:

- **Access your data**: All data is in Firefox local storage (inspect via browser dev tools)
- **Delete your data**: Clear browser storage or uninstall extension
- **Opt out**: Don't use the extension

## Open Source

This extension is open source. You can:
- Review all source code
- Audit data handling
- Verify privacy claims
- Build from source

Repository: https://github.com/sam-fakhreddine/aws-containers

## Contact

For privacy questions:
- Open an issue on GitHub: https://github.com/sam-fakhreddine/aws-containers/issues
- Email: aws-containers@samfakhreddine.dev

## Legal Disclaimer

This extension is provided "as is" without warranty. Use at your own risk.

Last updated: 2024-11-11
