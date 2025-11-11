# Fixing "Python.framework is damaged" Error on macOS

## Problem

When clicking the extension icon in Firefox on macOS, you may see this error:

```
"Python.framework" is damaged and can't be opened. You should move it to the Trash.
```

## Root Cause

This error can occur for two different reasons:

### Cause 1: PyInstaller Build Error (Most Common)

The PyInstaller executable was built incorrectly with **relative imports** that don't work in standalone executables. You'll see this error when testing:

```
ImportError: attempted relative import with no known parent package
```

**Fix**: Rebuild with the latest code (includes `__main__.py` fix)

### Cause 2: macOS Gatekeeper Security

The PyInstaller bundle's Python.framework is:
1. **Unsigned or quarantined** - macOS Gatekeeper flags it as "damaged"
2. **Missing code signature** or has quarantine attributes from download/build

This is a macOS security feature that protects against malicious code, but can flag legitimate applications that aren't properly signed.

**Fix**: Apply ad-hoc code signing and remove quarantine attributes

## Quick Fix (Recommended)

### Step 1: Pull Latest Code and Rebuild

The issue is fixed in the latest code with a new `__main__.py` entry point:

```bash
# Pull latest changes
git pull

# Rebuild the native host on your Mac
./scripts/build/build-native-host.sh

# Reinstall
./install.sh

# Restart Firefox
```

This rebuilds with:
- ✅ Absolute imports instead of relative imports (`__main__.py`)
- ✅ Automatic code signing and quarantine removal
- ✅ Proper PyInstaller configuration

### Step 2: Verify It Works

Run the debug script to confirm:

```bash
./scripts/debug-macos-issue.sh
```

Look for:
- ✅ No `ImportError` when testing the binary
- ✅ Code signature shows `Signature=adhoc`
- ✅ No quarantine attributes

### Alternative: Use Security Fix Script (If Already Built)

If you already built the binary and just need to fix security issues:

```bash
./scripts/fix-macos-security.sh
```

This script will:
- Remove quarantine attributes from all native host binaries
- Apply ad-hoc code signatures
- Clear security-related extended attributes
- Verify the fixes worked

**Note**: This only fixes Gatekeeper issues, not the PyInstaller import error. For import errors, rebuild with latest code.

**Then restart Firefox completely** for changes to take effect.

## Manual Fix

If you prefer to fix it manually:

### Step 1: Remove Quarantine Attribute

```bash
# For installed binary
xattr -dr com.apple.quarantine ~/.local/bin/aws_profile_bridge

# Or for repository binaries
xattr -dr com.apple.quarantine bin/darwin-*/aws_profile_bridge
```

### Step 2: Apply Ad-Hoc Code Signature

```bash
# For installed binary
codesign --force --deep --sign - ~/.local/bin/aws_profile_bridge

# Or for repository binaries
codesign --force --deep --sign - bin/darwin-*/aws_profile_bridge
```

### Step 3: Verify the Fix

```bash
# Check for quarantine
xattr ~/.local/bin/aws_profile_bridge  # Should show nothing or no quarantine

# Check signature
codesign -dvv ~/.local/bin/aws_profile_bridge
```

### Step 4: Restart Firefox

Completely quit and restart Firefox for the changes to take effect.

## Permanent Fix (For Rebuilds)

The build script now automatically handles this! When you rebuild:

```bash
./scripts/build/build-native-host.sh
```

It will automatically:
1. Build the executable with PyInstaller
2. Remove quarantine attributes
3. Apply ad-hoc code signing
4. Verify the signature

Then reinstall:

```bash
./install.sh
```

The install script will also apply security fixes during installation.

## Alternative: Use Python Script Directly

If you continue having issues with the PyInstaller binary, you can use the Python script directly (requires Python 3.8+ on the system):

### Step 1: Update Native Messaging Manifest

Edit: `~/Library/Application Support/Mozilla/NativeMessagingHosts/aws_profile_bridge.json`

Change the `path` to point to the Python script:

```json
{
  "name": "aws_profile_bridge",
  "description": "AWS Profile Bridge for reading credentials file",
  "path": "/absolute/path/to/aws-containers/native-messaging/src/aws_profile_bridge/aws_profile_bridge.py",
  "type": "stdio",
  "allowed_extensions": [
    "aws-profile-containers@yourname.local"
  ]
}
```

### Step 2: Make Script Executable

```bash
chmod +x native-messaging/src/aws_profile_bridge/aws_profile_bridge.py
```

### Step 3: Install Python Dependencies

```bash
cd native-messaging
pip3 install -r requirements.txt
```

This approach avoids PyInstaller entirely and won't trigger Gatekeeper issues.

## Understanding macOS Security

### What is Gatekeeper?

Gatekeeper is macOS's security feature that:
- Verifies apps are from identified developers
- Checks for malware before running apps
- Enforces code signing requirements

### What are Quarantine Attributes?

When you download or build files, macOS may add a "quarantine" flag:
- `com.apple.quarantine` - Marks file as from untrusted source
- Gatekeeper checks quarantined files more strictly
- Can be removed with `xattr -d com.apple.quarantine`

### What is Ad-Hoc Code Signing?

Ad-hoc signing (`codesign --sign -`):
- Creates a signature without a developer certificate
- Tells macOS "I vouch for this binary"
- Sufficient for local development and personal use
- **Not sufficient** for distribution to other users

For production distribution, you need a proper Apple Developer certificate.

## Troubleshooting

### Still Getting the Error?

1. **Restart Firefox completely**
   - Quit Firefox (not just close windows)
   - Wait 5 seconds
   - Start Firefox again

2. **Check the native host is properly signed**
   ```bash
   codesign -dvv ~/.local/bin/aws_profile_bridge
   ```
   Should show: `Signature=adhoc`

3. **Check for remaining extended attributes**
   ```bash
   xattr -l ~/.local/bin/aws_profile_bridge
   ```
   Should show nothing or no security-related attributes

4. **Check Firefox's console for native messaging errors**
   - Open about:debugging#/runtime/this-firefox
   - Click "Inspect" on the extension
   - Look for native messaging connection errors

5. **Try the Python script approach** (see above)

### Getting "Operation not permitted" Error?

If you get permission errors when removing quarantine:
```bash
sudo xattr -dr com.apple.quarantine ~/.local/bin/aws_profile_bridge
```

### Getting "No such attribute" Error?

This is actually good! It means there's no quarantine attribute. The error is likely something else. Check:
- Is the file executable? `ls -la ~/.local/bin/aws_profile_bridge`
- Does the path in the manifest match? `cat ~/Library/Application\ Support/Mozilla/NativeMessagingHosts/aws_profile_bridge.json`
- Is Python available? `which python3`

## Prevention for Future Builds

Always build on the same platform you'll run on:
- **Build on macOS** if deploying to macOS
- **Build on your Mac** to avoid quarantine flags from downloads
- **Build after updating** the repo with `git pull` (updated build scripts include fixes)

## Additional Resources

- [Apple Code Signing Guide](https://developer.apple.com/library/archive/documentation/Security/Conceptual/CodeSigningGuide/Introduction/Introduction.html)
- [Firefox Native Messaging Documentation](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Native_messaging)
- [PyInstaller macOS Code Signing](https://pyinstaller.org/en/stable/usage.html#macos-specific-options)

## Getting Help

If you're still stuck:

1. Check the native messaging manifest path:
   ```bash
   cat ~/Library/Application\ Support/Mozilla/NativeMessagingHosts/aws_profile_bridge.json
   ```

2. Try running the native host directly:
   ```bash
   ~/.local/bin/aws_profile_bridge
   # Should wait for JSON input on stdin
   # Press Ctrl+C to exit
   ```

3. Check Firefox's Browser Console (Tools > Browser Tools > Browser Console) for native messaging errors

4. Open an issue on GitHub with:
   - macOS version (`sw_vers`)
   - Architecture (`uname -m`)
   - Error messages from Firefox console
   - Output of `codesign -dvv ~/.local/bin/aws_profile_bridge`
