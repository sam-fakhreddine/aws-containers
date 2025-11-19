# Security Policy

## Supported Versions

We release patches for security vulnerabilities. The following versions are currently supported:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1   | :x:                |

## Reporting a Vulnerability

The AWS Profile Containers team takes security bugs seriously. We appreciate your efforts to responsibly disclose your findings, and will make every effort to acknowledge your contributions.

### How to Report a Security Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via one of the following methods:

1. **Email**: Send an email to the maintainer with details about the vulnerability. You can find contact information in the repository's commit history or GitHub profile.

2. **GitHub Private Vulnerability Reporting**: Use GitHub's private vulnerability reporting feature if available for this repository.

### What to Include in Your Report

To help us better understand the nature and scope of the potential issue, please include as much of the following information as possible:

- Type of issue (e.g., buffer overflow, SQL injection, cross-site scripting, etc.)
- Full paths of source file(s) related to the manifestation of the issue
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

### What to Expect

After you submit a vulnerability report, you can expect:

- **Acknowledgment**: We will acknowledge receipt of your vulnerability report within 72 hours.
- **Communication**: We will send you regular updates about our progress.
- **Validation**: We will confirm the vulnerability and determine its impact.
- **Fix**: We will work on a fix and release it as soon as possible.
- **Credit**: We will credit you in our release notes (unless you prefer to remain anonymous).

### Response Timeline

- **Initial Response**: Within 72 hours
- **Status Update**: Within 7 days
- **Fix Timeline**: Varies by severity (critical issues addressed immediately)

## Security Best Practices for Users

### Extension Security

1. **Download Only from Official Sources**: Only install this extension from the official Mozilla Add-ons store or build it yourself from source.

2. **Keep Updated**: Always use the latest version of the extension to benefit from security patches.

3. **Review Permissions**: The extension requests minimal permissions. Review them before installation.

### API Server Security

1. **Token Authentication**: Always use strong, randomly generated tokens for API server authentication.

2. **Local Network Only**: Run the API server on localhost (127.0.0.1) unless you have a specific need and understand the security implications.

3. **AWS Credentials**: Never commit AWS credentials to version control. Use AWS IAM roles and temporary credentials when possible.

4. **Environment Variables**: Store sensitive configuration in environment variables, not in code.

### AWS Security

1. **Least Privilege**: Apply the principle of least privilege to IAM roles and policies.

2. **MFA**: Enable multi-factor authentication on all AWS accounts.

3. **Credential Rotation**: Regularly rotate AWS access keys and session tokens.

4. **Audit**: Review AWS CloudTrail logs regularly for suspicious activity.

## Known Security Considerations

### Browser Extension Limitations

- The extension has access to browser history and active tabs to generate console URLs
- All data processing happens locally; no data is sent to third-party servers
- Session tokens are stored in browser extension storage (encrypted by the browser)

### API Server Security Model

- Authentication uses bearer tokens
- Runs on localhost by default (127.0.0.1)
- Uses HTTPS for production deployments
- Implements CORS restrictions

## Security Disclosure Policy

When we receive a security bug report, we will:

1. Confirm the problem and determine the affected versions
2. Audit code to find any similar problems
3. Prepare fixes for all supported versions
4. Release patches as soon as possible

## Past Security Advisories

### CVE-2024-43788 (vite)

- **Date**: 2024-11-15
- **Severity**: Medium
- **Status**: Resolved
- **Description**: XSS vulnerability in vite dev server
- **Resolution**: Upgraded to vite@5.4.11
- **Reference**: [VULNERABILITY_CVE-2024-43788.md](./docs/security/VULNERABILITY_CVE-2024-43788.md)

## Security Resources

- [Project Security Documentation](./docs/security/security-root.md)
- [Privacy Policy](./docs/security/privacy.md)
- [Security Best Practices](./docs/security/security-best-practices.md)

## Bug Bounty Program

We do not currently have a bug bounty program. However, we deeply appreciate security researchers who responsibly disclose vulnerabilities to us.

## Attribution

We appreciate the following security researchers for their responsible disclosure:

- (No public disclosures yet)

## Contact

For security-related questions that are not vulnerabilities, you can:

- Open a GitHub discussion
- Refer to our [SUPPORT.md](./SUPPORT.md) file for other contact methods

---

**Thank you for helping keep AWS Profile Containers and our users safe!**
