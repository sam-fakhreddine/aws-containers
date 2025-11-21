# Firefox Extension Submission Checklist

## Pre-Submission Requirements

### ✅ Extension Package
- [x] Built extension package exists: `web-ext-artifacts/aws_profile_containers-0.1.0.zip`
- [x] Manifest version: 0.1.0
- [x] Extension ID: `aws-profile-containers@samfakhreddine.dev`

### ✅ Required Documentation
- [x] README.md with clear description
- [x] LICENSE file (MIT)
- [x] Privacy Policy (docs/security/privacy.md)
- [x] Security documentation

### ⚠️ Submission Materials Needed

#### 1. Extension Listing Information
- **Name**: AWS Profile Containers
- **Summary** (250 chars max): Open AWS profiles from credentials file in separate Firefox containers with automatic console federation.
- **Description** (see below)
- **Category**: Productivity
- **Tags**: aws, containers, credentials, profiles, developer-tools

#### 2. Screenshots Required
- [ ] **CRITICAL**: Need 3-5 screenshots (1280x800 or 640x400)
  - Screenshot 1: Popup showing profile list
  - Screenshot 2: Settings page
  - Screenshot 3: Multiple containers open with AWS Console
  - Screenshot 4: Favorites/Recent profiles view

#### 3. Promotional Graphics (Optional but Recommended)
- [ ] Icon: 128x128 (already have: public/icons/icon-128.png)
- [ ] Promotional tile: 440x280 (optional)

#### 4. Support Information
- **Homepage**: https://github.com/sam-fakhreddine/aws-console-containers
- **Support URL**: https://github.com/sam-fakhreddine/aws-console-containers/issues
- **Support Email**: [NEED TO ADD]

#### 5. Privacy & Permissions
- [x] Privacy Policy URL: Link to docs/security/privacy.md on GitHub
- [x] Permissions justified in manifest
- [x] No data collection/telemetry

#### 6. Technical Requirements
- [x] Manifest v2 (Firefox standard)
- [x] No eval() or remote code execution
- [x] Content Security Policy defined
- [x] All permissions justified

## Submission Description

### Short Description (250 characters)
```
Open AWS profiles from credentials file in separate Firefox containers with automatic console federation. Secure, local-only credential handling with SSO support.
```

### Full Description
```markdown
# AWS Profile Containers

Seamlessly manage multiple AWS accounts with automatic console federation and Firefox container isolation.

## Key Features

🔐 **Automatic AWS Console Federation**
- One-click access to AWS Console with your credentials
- No manual login required
- Supports both IAM users and SSO profiles

🔒 **Isolated Containers**
- Each AWS profile opens in its own Firefox container
- Complete session isolation between accounts
- No cookie conflicts or accidental cross-account actions

📁 **Auto-Detection**
- Reads profiles from ~/.aws/credentials and ~/.aws/config
- Full AWS IAM Identity Center (SSO) support
- Automatic profile discovery

⭐ **Smart Organization**
- Favorite your most-used profiles
- Recent profiles tracking
- Quick search and filtering

🌍 **Region Selection**
- Choose your preferred AWS region
- Direct console access to any region

## Security First

- ✅ Credentials read locally only
- ✅ Only communicates with official AWS APIs
- ✅ No data collection or telemetry
- ✅ Open source and auditable
- ❌ Never stores credentials in browser
- ❌ Never transmits credentials to third parties

## Requirements

- Local API server (included, easy setup)
- AWS credentials file (~/.aws/credentials)
- Python 3.12+ (for API server)

## How It Works

1. Install the extension and API server
2. Click a profile in the extension popup
3. Opens AWS Console in an isolated container
4. Switch between accounts instantly

Perfect for:
- DevOps engineers managing multiple AWS accounts
- Developers working across environments
- Security teams needing account isolation
- Anyone tired of logging in and out of AWS

## Open Source

Full source code available on GitHub. Review, audit, and contribute!

Repository: https://github.com/sam-fakhreddine/aws-console-containers
```

## Pre-Submission Testing

### Manual Testing Checklist
- [ ] Install from built package in clean Firefox profile
- [ ] Verify all permissions work correctly
- [ ] Test profile opening in containers
- [ ] Test SSO profile support
- [ ] Test favorites and recent profiles
- [ ] Test settings page
- [ ] Test region selection
- [ ] Verify no console errors
- [ ] Test on macOS
- [ ] Test on Linux

### Automated Testing
- [x] Unit tests passing
- [x] E2E tests passing
- [x] No linting errors
- [x] Build succeeds

## Submission Steps

1. **Create Firefox Add-ons Account**
   - Go to https://addons.mozilla.org/developers/
   - Sign in or create account

2. **Submit Extension**
   - Click "Submit a New Add-on"
   - Upload: `web-ext-artifacts/aws_profile_containers-0.1.0.zip`
   - Select "On this site" (self-hosted initially)

3. **Fill Out Listing**
   - Copy description from above
   - Upload screenshots (NEED TO CREATE)
   - Add support URLs
   - Set category and tags

4. **Review & Submit**
   - Review all information
   - Submit for review
   - Wait for Mozilla review (typically 1-7 days)

## Post-Submission

- [ ] Monitor review status
- [ ] Respond to reviewer questions promptly
- [ ] Update documentation with AMO link once approved
- [ ] Announce release

## Notes

### Why API Server is Required
The extension requires a local API server because:
- Firefox extensions cannot directly read local files
- Credentials must stay on local machine
- API server provides secure bridge to ~/.aws/credentials

This is clearly documented in installation guide and will be explained in submission notes.

### Reviewer Notes to Include
```
This extension requires a companion API server to function. The server:
- Runs locally on localhost:10999
- Provides secure access to ~/.aws/credentials
- Never transmits credentials except to official AWS APIs
- Full source code included in repository

Installation instructions: https://github.com/sam-fakhreddine/aws-console-containers/blob/main/docs/getting-started/install-root.md

The extension is designed for developers and DevOps engineers who manage multiple AWS accounts.
```

## Critical Missing Items

1. **SCREENSHOTS** - Must create before submission
2. **Support Email** - Add to package.json and documentation
3. **Test in Clean Firefox Profile** - Verify fresh install works

## Timeline

- **Day 1**: Create screenshots, add support email
- **Day 2**: Final testing in clean profile
- **Day 3**: Submit to Mozilla
- **Days 4-10**: Review period
- **Day 11+**: Approved and published
