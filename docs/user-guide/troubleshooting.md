# Troubleshooting Guide

Common issues and solutions for AWS Profile Containers.

## Installation Issues

### "API Server Not Running" Error

**Problem:** Extension shows "API Server Not Running" when opened

**Cause:** FastAPI server not running or not accessible

**Solutions:**

1. **Check if API server is running:**

   ```bash
   curl http://localhost:10999/health
   ```

   Should return: `{"status":"healthy","version":"2.0.0",...}`

2. **Check service status:**

   ```bash
   ./scripts/manage.sh status
   ```

3. **Start the API server:**

   ```bash
   ./scripts/manage.sh start
   ```

4. **View API server logs:**

   ```bash
   ./scripts/manage.sh logs
   ```

5. **Verify API token is configured:**
   - Click extension icon
   - Click ⚙️ (settings) in top right
   - Ensure token is saved
   - Click "Test Connection"

6. **Reinstall:**

   ```bash
   cd /path/to/aws-containers
   ./scripts/manage.sh install
   ```

### Port Already in Use

**Problem:** API server can't start because port 10999 is in use

**Solution:**

```bash
# Find process using port 10999
lsof -i :10999

# Kill the process
kill -9 <PID>

# Restart API server
./scripts/manage.sh restart
```

### Python Version Too Old

**Problem:** Install script says Python 3.12+ required

**Solutions:**

1. **Install Python 3.12+:**

   ```bash
   # Ubuntu/Debian
   sudo apt install python3.12

   # macOS
   brew install python@3.12
   ```

2. **Or use pyenv:**

   ```bash
   pyenv install 3.12
   pyenv global 3.12
   ```

### Invalid API Token

**Problem:** Extension shows "Invalid API token" error

**Solutions:**

1. **Get your API token:**

   ```bash
   cat ~/.aws/profile_bridge_config.json
   ```

2. **Configure in extension:**
   - Click extension icon
   - Click ⚙️ (settings)
   - Paste the `api_token` value
   - Click "Save Token"
   - Click "Test Connection"

3. **Regenerate token if needed:**

   ```bash
   # Reinstall to generate new token
   ./scripts/manage.sh install
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

3. **Check API server status:**

   ```bash
   ./scripts/manage.sh status
   ```

4. **Check API server logs:**

   ```bash
   ./scripts/manage.sh logs
   ```

5. **Check network connectivity:**
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

3. **Check API server logs:**

   ```bash
   tail -f ~/.aws/logs/aws_profile_bridge_api.log
   ```

4. **Check browser console:**
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

3. **API server logs:**

   ```bash
   ./scripts/manage.sh logs
   ```

4. **Test API server:**

   ```bash
   curl http://localhost:10999/health
   curl -H "X-API-Token: $(jq -r .api_token ~/.aws/profile_bridge_config.json)" \
     http://localhost:10999/api/v1/profiles
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

5. **API server logs:**

   ```bash
   tail -n 50 ~/.aws/logs/aws_profile_bridge_api.log
   ```

6. **API server health:**

   ```bash
   curl http://localhost:10999/health
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
   <https://github.com/sam-fakhreddine/aws-containers/issues>

### Feature Requests

For feature requests:

1. **Check existing issues/roadmap**
2. **Describe the use case**
3. **Explain expected behavior**
4. **Submit on GitHub**

## Common Questions

### Q: Why does the extension need an API server?

**A:** Firefox extensions can't directly read files. The HTTP API server provides secure access to `~/.aws/credentials` with token authentication.

### Q: Is my data secure?

**A:** Yes. See [Security Documentation](../security/overview.md). Credentials are never stored, only sent to official AWS APIs.

### Q: Can I use this with Chrome?

**A:** No. Chrome has different extension APIs and container implementation. Firefox-specific feature.

### Q: Why are some profiles not showing?

**A:** Check file format in `~/.aws/credentials` and `~/.aws/config`. SSO profiles must be in config file.

### Q: How do I update the extension?

**A:** Update and rebuild:

```bash
git pull
./scripts/manage.sh restart  # Update API server
yarn build                    # Rebuild extension
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
