# Troubleshooting Guide

Common issues and solutions for AWS Profile Containers.

## Installation Issues

### "Setup Required" Error

**Problem:** Extension shows "Setup Required" when opened

**Cause:** Native messaging host not properly installed or not connecting

**Solutions:**

1. **Restart Firefox completely**
   ```bash
   # Close all Firefox windows, then reopen
   ```

2. **Verify native messaging host is installed:**
   ```bash
   ls -la ~/.local/bin/aws_profile_bridge*
   ```
   Should show either `aws_profile_bridge` (executable) or `aws_profile_bridge.py` (Python script)

3. **Check manifest exists:**
   ```bash
   # Linux
   cat ~/.mozilla/api-server-hosts/aws_profile_bridge.json

   # macOS
   cat ~/Library/Application\ Support/Mozilla/NativeMessagingHosts/aws_profile_bridge.json
   ```

4. **Verify manifest points to correct path:**
   The manifest should contain the correct path to the executable/script

5. **Check executable permissions:**
   ```bash
   chmod +x ~/.local/bin/aws_profile_bridge
   ```

6. **Reinstall:**
   ```bash
   cd /path/to/aws-containers
   ./install.sh
   ```

### Permission Denied

**Problem:** Native messaging host can't execute

**Solution:**
```bash
chmod +x ~/.local/bin/aws_profile_bridge
# Or for Python script:
chmod +x ~/.local/bin/aws_profile_bridge.py
```

### Python Not Found

**Problem:** Install script says Python not found (when using Python script)

**Solutions:**

1. **Use standalone executable (recommended):**
   ```bash
   ./build-native-host.sh
   ./install.sh
   ```

2. **Or install Python 3.8+:**
   ```bash
   # Ubuntu/Debian
   sudo apt install python3

   # macOS
   brew install python3
   ```

### boto3 Import Error

**Problem:** Error importing boto3 in Python script

**Solutions:**

1. **Install Python dependencies:**
   ```bash
   pip3 install -r api-server/requirements.txt
   ```

2. **Or use standalone executable (recommended):**
   ```bash
   ./build-native-host.sh
   ./install.sh
   ```

## Profile Issues

### No Profiles Showing

**Problem:** Extension loads but shows no profiles

**Causes & Solutions:**

1. **No credentials configured:**
   ```bash
   # Check if credentials file exists
   ls -la ~/.aws/credentials
   ls -la ~/.aws/config

   # If not, configure AWS CLI
   aws configure
   ```

2. **Incorrect file format:**
   Verify `~/.aws/credentials` has correct format:
   ```ini
   [profile-name]
   aws_access_key_id = AKIA...
   aws_secret_access_key = ...
   ```

3. **File permissions:**
   ```bash
   chmod 600 ~/.aws/credentials
   chmod 600 ~/.aws/config
   ```

### Profile Not Opening

**Problem:** Click profile, nothing happens

**Solutions:**

1. **Check browser console:**
   - Press F12
   - Look for errors in console
   - Report errors in GitHub issue

2. **Verify credentials exist:**
   ```bash
   grep -A 3 "\[profile-name\]" ~/.aws/credentials
   ```

3. **Check network connectivity:**
   Extension needs to call AWS Federation API

4. **Try different profile:**
   Determine if issue is specific to one profile

### Credentials Showing as Expired

**Problem:** Profile shows "Expired" status

**Solutions:**

**For credential-based profiles:**
1. Refresh credentials using your credential management tool
2. Update `~/.aws/credentials` with new credentials
3. Reload extension popup

**For SSO profiles:**
1. Re-authenticate with AWS SSO:
   ```bash
   aws sso login --profile <profile-name>
   ```
2. Reload extension popup

### SSO Profile Not Working

**Problem:** SSO profile shows as expired or can't open console

**Solutions:**

1. **Verify you've logged in:**
   ```bash
   aws sso login --profile <profile-name>
   ```

2. **Check SSO configuration:**
   ```bash
   cat ~/.aws/config
   ```
   Should have:
   ```ini
   [profile sso-name]
   sso_start_url = ...
   sso_region = ...
   sso_account_id = ...
   sso_role_name = ...
   ```

3. **Check SSO cache:**
   ```bash
   ls -la ~/.aws/sso/cache/
   ```
   Should contain cached token files

4. **Verify AWS CLI is installed:**
   ```bash
   aws --version
   ```

## Container Issues

### Container Not Created

**Problem:** Profile opens but not in isolated container

**Solutions:**

1. **Verify Firefox version:**
   Firefox 60+ required for containers

2. **Check extension permissions:**
   Extension needs `contextualIdentities` permission

3. **Restart Firefox**

4. **Reinstall extension**

### Wrong Container Used

**Problem:** Profile opens in unexpected container

**Solutions:**

1. **Clear all containers:**
   - Open extension
   - Click "Containers" tab
   - Click "Clear All Containers"

2. **Restart Firefox**

3. **Try opening profile again**

### Can't Clear Containers

**Problem:** "Clear Containers" button doesn't work

**Solutions:**

1. **Close all tabs using those containers first**

2. **Try clearing via Firefox settings:**
   - Settings → Cookies and Site Data
   - Manage Containers
   - Remove AWS profile containers manually

## Console Access Issues

### Console URL Generation Fails

**Problem:** Can't generate AWS console federation URL

**Solutions:**

1. **Verify credentials are valid:**
   ```bash
   # Test with AWS CLI
   AWS_PROFILE=profile-name aws sts get-caller-identity
   ```

2. **Check network access to AWS:**
   ```bash
   curl -I https://signin.aws.amazon.com
   ```

3. **Check native messaging host logs:**
   Look for errors in browser console (F12)

### Console Opens with Error

**Problem:** Console opens but shows AWS error

**Solutions:**

1. **Verify credentials have console access:**
   Some IAM roles/policies may restrict console access

2. **Check session token validity:**
   Temporary credentials may have expired

3. **Try refreshing credentials**

## macOS-Specific Issues

### "Unidentified Developer" Warning

**Problem:** macOS blocks unsigned executable

**Solutions:**

1. **Remove quarantine flag:**
   ```bash
   xattr -d com.apple.quarantine ~/.local/bin/aws_profile_bridge
   ```

2. **Allow in System Settings:**
   - System Settings → Privacy & Security
   - Click "Allow Anyway" next to blocked executable

3. **Right-click method:**
   - Right-click executable in Finder
   - Select "Open"
   - Click "Open" in dialog

### Gatekeeper Blocks Execution

**Problem:** macOS prevents running unsigned binary

**Solution:** See "Unidentified Developer" solutions above

## Extension Issues

### Extension Won't Load in Firefox

**Problem:** Can't load extension in about:debugging

**Solutions:**

1. **Verify manifest.json exists:**
   ```bash
   ls -la /path/to/aws-containers/dist/manifest.json
   ```

2. **Rebuild extension:**
   ```bash
   cd /path/to/aws-containers
   npm install
   npm run build
   ```

3. **Check for build errors in terminal**

### Extension Crashes

**Problem:** Extension stops working or crashes Firefox

**Solutions:**

1. **Check browser console for errors** (F12)

2. **Disable other extensions temporarily** to identify conflicts

3. **Restart Firefox in safe mode:**
   - Help → Troubleshooting Mode
   - Test extension

4. **Report issue on GitHub** with console errors

## Performance Issues

### Extension Slow to Open

**Problem:** Extension popup takes long to open

**Causes & Solutions:**

1. **Many profiles:**
   - Large credential files take time to parse
   - Use search to filter instead of scrolling

2. **Network latency:**
   - Extension checks SSO token status
   - May be slow with poor connectivity

### High Memory Usage

**Problem:** Firefox uses excessive memory

**Solutions:**

1. **Clear unused containers:**
   - Containers accumulate over time
   - Periodic cleanup recommended

2. **Close unused tabs:**
   - Each container tab uses memory

## Debugging

### Enable Debug Mode

For detailed troubleshooting:

1. **Browser console:**
   - F12 to open developer tools
   - Console tab shows extension logs

2. **Extension debugging:**
   - about:debugging
   - Click "Inspect" next to extension
   - View background page console

3. **Test native messaging:**
   ```bash
   cd /path/to/aws-containers
   ./test-api-server.sh
   ```

### Collect Debug Information

When reporting issues, include:

1. **Firefox version:**
   ```
   Help → About Firefox
   ```

2. **Extension version:**
   ```
   about:debugging → Extension version
   ```

3. **Operating system:**
   ```bash
   uname -a
   ```

4. **Console errors:**
   Copy from browser console (F12)

5. **Native messaging test results:**
   ```bash
   ./test-api-server.sh
   ```

## Getting Help

### Self-Help Resources

1. [User Guide](usage.md)
2. [Installation Guide](../getting-started/installation.md)
3. [Security Documentation](../security/overview.md)
4. [GitHub Issues](https://github.com/sam-fakhreddine/aws-containers/issues)

### Reporting Bugs

When reporting issues:

1. **Search existing issues first**

2. **Include:**
   - Detailed description of problem
   - Steps to reproduce
   - Expected vs actual behavior
   - Debug information (see above)
   - Console errors/logs

3. **Submit on GitHub:**
   https://github.com/sam-fakhreddine/aws-containers/issues

### Feature Requests

For feature requests:

1. **Check existing issues/roadmap**
2. **Describe the use case**
3. **Explain expected behavior**
4. **Submit on GitHub**

## Common Questions

### Q: Why does the extension need native messaging?

**A:** Firefox extensions can't directly read files. Native messaging allows secure access to `~/.aws/credentials`.

### Q: Is my data secure?

**A:** Yes. See [Security Documentation](../security/overview.md). Credentials are never stored, only sent to official AWS APIs.

### Q: Can I use this with Chrome?

**A:** No. Chrome has different extension APIs and container implementation. Firefox-specific feature.

### Q: Why are some profiles not showing?

**A:** Check file format in `~/.aws/credentials` and `~/.aws/config`. SSO profiles must be in config file.

### Q: How do I update the extension?

**A:** Rebuild and reload:
```bash
git pull
npm run build
# In Firefox: about:debugging → Reload extension
```

### Q: Can I use custom AWS endpoints?

**A:** Not currently supported. Extension uses standard AWS endpoints only.

## Still Need Help?

If this guide doesn't solve your issue:

1. Check [GitHub Issues](https://github.com/sam-fakhreddine/aws-containers/issues)
2. Open a new issue with debug information
3. Include steps you've already tried

We're here to help! 🚀
