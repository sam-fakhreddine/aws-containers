# Firefox Add-ons Submission Materials

## Extension Information

**Name**: AWS Profile Containers

**Summary** (250 characters max):
```
Open AWS profiles from credentials file in separate Firefox containers with automatic console federation. Secure, local-only credential handling with SSO support.
```

**Category**: Productivity

**Tags**: aws, containers, credentials, profiles, developer-tools, devops, security, isolation

## Full Description

```
Seamlessly manage multiple AWS accounts with automatic console federation and Firefox container isolation.

KEY FEATURES

🔐 Automatic AWS Console Federation
• One-click access to AWS Console with your credentials
• No manual login required
• Supports both IAM users and SSO profiles

🔒 Isolated Containers
• Each AWS profile opens in its own Firefox container
• Complete session isolation between accounts
• No cookie conflicts or accidental cross-account actions

📁 Auto-Detection
• Reads profiles from ~/.aws/credentials and ~/.aws/config
• Full AWS IAM Identity Center (SSO) support
• Automatic profile discovery

⭐ Smart Organization
• Favorite your most-used profiles
• Recent profiles tracking
• Quick search and filtering

🌍 Region Selection
• Choose your preferred AWS region
• Direct console access to any region

SECURITY FIRST

✅ Credentials read locally only
✅ Only communicates with official AWS APIs
✅ No data collection or telemetry
✅ Open source and auditable
❌ Never stores credentials in browser
❌ Never transmits credentials to third parties

REQUIREMENTS

• Local API server (included, easy setup)
• AWS credentials file (~/.aws/credentials)
• Python 3.12+ (for API server)

HOW IT WORKS

1. Install the extension and API server
2. Click a profile in the extension popup
3. Opens AWS Console in an isolated container
4. Switch between accounts instantly

PERFECT FOR

• DevOps engineers managing multiple AWS accounts
• Developers working across environments
• Security teams needing account isolation
• Anyone tired of logging in and out of AWS

OPEN SOURCE

Full source code available on GitHub. Review, audit, and contribute!

Repository: https://github.com/sam-fakhreddine/aws-console-containers
Documentation: https://github.com/sam-fakhreddine/aws-console-containers/blob/main/docs/index.md
```

## Support Information

**Homepage**: https://github.com/sam-fakhreddine/aws-console-containers

**Support Site**: https://github.com/sam-fakhreddine/aws-console-containers/issues

**Support Email**: aws-containers@samfakhreddine.dev

## Privacy & Legal

**Privacy Policy**: https://github.com/sam-fakhreddine/aws-console-containers/blob/main/docs/security/privacy.md

**License**: MIT License
https://github.com/sam-fakhreddine/aws-console-containers/blob/main/LICENSE

## Notes for Reviewers

### Companion API Server Required

This extension requires a companion API server to function properly. The server:

- Runs locally on localhost:10999
- Provides secure access to ~/.aws/credentials file
- Never transmits credentials except to official AWS APIs
- Implements token-based authentication
- Full source code included in repository

**Why is this needed?**
Firefox extensions cannot directly read local files for security reasons. The API server provides a secure, auditable bridge between the extension and AWS credentials stored locally.

**Installation Instructions**: 
https://github.com/sam-fakhreddine/aws-console-containers/blob/main/docs/getting-started/install-root.md

### Target Audience

This extension is designed for:
- Software developers
- DevOps engineers
- Cloud architects
- AWS administrators
- Anyone managing multiple AWS accounts

### Security Considerations

1. **No Remote Code**: All code is bundled, no eval() or remote scripts
2. **Minimal Permissions**: Only requests necessary permissions
3. **Local Only**: API server binds to localhost only
4. **No Telemetry**: Zero data collection or tracking
5. **Open Source**: Fully auditable codebase

### Testing the Extension

To test the extension:

1. Install the API server:
   ```bash
   git clone https://github.com/sam-fakhreddine/aws-console-containers
   cd aws-console-containers
   ./scripts/manage.sh install
   ```

2. Load the extension in Firefox
3. Configure AWS credentials in ~/.aws/credentials
4. Click a profile to open AWS Console

Test credentials can be configured following AWS documentation:
https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html

## Screenshot Descriptions

### Screenshot 1: Extension Popup
Shows the main popup interface with:
- List of AWS profiles from credentials file
- Search/filter functionality
- Favorites section
- Recent profiles
- Region selector

### Screenshot 2: Settings Page
Shows the settings interface with:
- API server configuration
- Token management
- Container cleanup options
- Region preferences

### Screenshot 3: Multiple Containers
Shows Firefox with multiple tabs open:
- Each tab in a different container
- Different AWS accounts visible
- Container indicators in tab bar
- Demonstrates isolation

### Screenshot 4: Profile Selection
Shows the profile selection flow:
- Clicking a profile
- Container creation
- AWS Console opening
- Automatic federation
