# Security Best Practices

Recommended security practices for using AWS Profile Containers.

## Credential Management

### Use Temporary Credentials

**Prefer session tokens over long-term keys:**

```ini
# Good: Temporary credentials with session token
[profile-name]
aws_access_key_id = ASIA...
aws_secret_access_key = ...
aws_session_token = IQoJb3...
# Expires 2024-11-10 15:30:00 UTC
```

**Benefits:**
- Automatic expiration
- Limited blast radius if compromised
- Aligns with AWS best practices

### Use AWS SSO

**Prefer AWS IAM Identity Center (SSO):**

```ini
[profile sso-dev]
sso_start_url = https://portal.awsapps.com/start
sso_region = us-east-1
sso_account_id = 123456789012
sso_role_name = DeveloperAccess
```

**Benefits:**
- No long-term credentials
- Centralized access management
- Built-in MFA support
- Automatic credential rotation
- Audit trail via AWS SSO

### Rotate Credentials Regularly

**For credential-based profiles:**
- Refresh daily (or more often)
- Use credential management tools
- Automate rotation when possible

**For SSO profiles:**
- Configure appropriate session duration
- Re-login when token expires
- Don't extend session duration unnecessarily

### Monitor Expiration

**Add expiration comments:**

```ini
[my-profile]
aws_access_key_id = ...
aws_secret_access_key = ...
aws_session_token = ...
# Expires 2024-11-10 15:30:00 UTC
```

**Benefits:**
- Extension shows time remaining
- Visual warning when expiring
- Prevents using expired credentials

## Access Control

### Use Least Privilege

**Principle:** Grant minimum necessary permissions

**Examples:**

```ini
# Production: Read-only access
[company-prod-readonly]
# Use role with ViewOnlyAccess

# Development: Full access
[company-dev-admin]
# Use role with PowerUserAccess

# Specific service: Limited access
[company-s3-manager]
# Use role with S3-specific permissions
```

### Separate Environments

**Use different profiles for different environments:**

- `company-prod-*` - Production (red containers)
- `company-staging-*` - Staging (yellow containers)
- `company-dev-*` - Development (green containers)

**Benefits:**
- Clear visual distinction
- Reduces accidental changes
- Isolated containers prevent mistakes

### Enable MFA

**On all AWS accounts:**
- Root account (always)
- IAM users (when used)
- AssumeRole policies (when possible)

**Note:** Extension works with MFA-protected accounts via temporary credentials.

## Local System Security

### Protect Credential Files

**File permissions:**

```bash
# Restrict access to credentials
chmod 600 ~/.aws/credentials
chmod 600 ~/.aws/config

# Verify
ls -la ~/.aws/
```

**Ownership:**
```bash
# Ensure you own the files
chown $USER:$USER ~/.aws/credentials
chown $USER:$USER ~/.aws/config
```

### Use Disk Encryption

**Encrypt your disk:**
- macOS: FileVault
- Linux: LUKS / dm-crypt
- Windows: BitLocker

**Why:** Protects credentials if laptop is stolen.

### Keep Software Updated

**Update regularly:**
- Firefox browser
- Operating system
- Extension (rebuild from latest source)
- AWS CLI (for SSO)

### Review Installed Extensions

**Audit your Firefox extensions:**
- Remove unnecessary extensions
- Check permissions of all extensions
- Be cautious with extensions requesting native messaging

## Network Security

### Use Trusted Networks

**Prefer:**
- Trusted corporate networks
- Home network (with WPA3)
- VPN when on public WiFi

**Avoid:**
- Public WiFi without VPN
- Untrusted networks
- Shared/hotel networks

**Why:** While extension uses HTTPS, local network may be monitored.

### Verify HTTPS

**Extension only uses HTTPS:**
- AWS Federation API: `https://signin.aws.amazon.com`
- AWS SSO API: `https://portal.sso.*.amazonaws.com`

**No plain text transmission.**

## AWS Account Security

### Monitor CloudTrail

**Track console access:**

```bash
# Example CloudTrail query
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=ConsoleLogin
```

**Set up alerts for:**
- Console access from unexpected IPs
- Access during off-hours
- Failed login attempts
- Changes to IAM policies

### Use AWS Organizations

**Benefits:**
- Centralized account management
- Service Control Policies (SCPs)
- Consolidated billing
- Better with SSO

### Enable AWS Config

**Track resource changes:**
- Configuration history
- Compliance monitoring
- Change notifications

## Operational Security

### Close Unused Tabs

**Don't leave AWS Console tabs open:**
- Close when done working
- Reduces attack surface
- Prevents accidental actions

### Clear Old Containers

**Periodic cleanup:**
1. Open extension
2. Click "Containers" tab
3. Click "Clear All Containers"

**When:**
- After finishing with projects
- When profiles are removed
- Monthly cleanup

### Use Separate Browser Profiles

**For high-security scenarios:**
- Use dedicated Firefox profile for AWS access
- Separate from regular browsing
- Minimal extensions installed

### Log Out When Done

**End session properly:**
- Close AWS Console tabs
- Clear containers if needed
- Lock your computer when away

## Incident Response

### If Credentials Compromised

**Immediate actions:**

1. **Revoke credentials:**
   ```bash
   # For IAM user
   aws iam delete-access-key --access-key-id AKIA...

   # For assumed role
   # Credentials expire automatically
   ```

2. **Check CloudTrail:**
   - Review recent activity
   - Identify unauthorized actions

3. **Rotate all credentials:**
   - Change all related keys
   - Update credential files

4. **Review IAM policies:**
   - Check for unauthorized changes
   - Restore from backups if needed

### If Computer Compromised

**Actions:**

1. **Assume all credentials compromised**
2. **Revoke all AWS credentials immediately**
3. **Review CloudTrail for all accounts**
4. **Change AWS account passwords**
5. **Enable MFA if not already enabled**
6. **Clean/reimage computer**
7. **Generate new credentials on clean system**

## Compliance

### Document Your Usage

**For audited environments:**
- Document which profiles access which accounts
- Record who has access
- Log usage patterns
- Regular access reviews

### Separation of Duties

**Use different profiles for different roles:**
- Developer role (limited permissions)
- Administrator role (elevated permissions)
- Read-only role (auditing)

### Regular Reviews

**Periodic security reviews:**
- Quarterly credential audit
- Monthly access review
- Annual permission review
- Continuous monitoring

## Advanced Security

### Use AWS STS

**Generate temporary credentials:**

```bash
# Assume role for temporary credentials
aws sts assume-role \
  --role-arn arn:aws:iam::123456789012:role/MyRole \
  --role-session-name my-session
```

Store result in `~/.aws/credentials` with expiration comment.

### Use External ID

**For third-party access:**

```bash
# Assume role with external ID
aws sts assume-role \
  --role-arn arn:aws:iam::123456789012:role/MyRole \
  --role-session-name my-session \
  --external-id unique-external-id
```

### Use Condition Keys

**In IAM policies, restrict:**
- Source IP addresses
- Time of day
- MFA requirement
- Session duration

## Checklist

**Pre-installation:**
- [ ] Review source code
- [ ] Understand security model
- [ ] Check permissions requested
- [ ] Verify browser is updated

**Post-installation:**
- [ ] Set up temporary credentials
- [ ] Configure SSO (if using)
- [ ] Enable CloudTrail monitoring
- [ ] Set up alerts
- [ ] Document profiles

**Ongoing:**
- [ ] Rotate credentials regularly
- [ ] Monitor expiration
- [ ] Review CloudTrail logs
- [ ] Update software
- [ ] Audit extensions
- [ ] Clear old containers
- [ ] Review access monthly

## Resources

- [AWS Security Best Practices](https://aws.amazon.com/architecture/security-identity-compliance/)
- [AWS IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [AWS SSO Documentation](https://docs.aws.amazon.com/singlesignon/latest/userguide/what-is.html)
- [Firefox Security](https://support.mozilla.org/en-US/kb/firefox-security-and-privacy)

## Questions?

- [Security Overview](overview.md)
- [Privacy Policy](privacy.md)
- [Troubleshooting](../user-guide/troubleshooting.md)
