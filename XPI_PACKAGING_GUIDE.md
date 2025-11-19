# Firefox Extension XPI Packaging Guide

Quick reference for building and packaging the Firefox extension into an XPI file.

## Quick Start

### Build Everything
```bash
npm run build
```

This runs the complete build pipeline:
1. Optimizes images
2. Updates version in manifest
3. Transpiles TypeScript/React code
4. **Creates XPI package** ← NEW!

### Build XPI Only
```bash
npm run build:xpi
```

Creates the XPI from an existing `dist/` directory.

## Output

Your packaged extension will be located at:
```
web-ext-artifacts/aws_profile_containers-{version}.xpi
```

Example: `web-ext-artifacts/aws_profile_containers-0.1.0.xpi`

## What is an XPI File?

An XPI (Cross-Platform Install) file is Firefox's extension package format. It's essentially a ZIP archive containing:
- `manifest.json` - Extension metadata and permissions
- JavaScript code (background scripts, content scripts)
- HTML files (popup, options page)
- CSS stylesheets
- Icons and other assets

## Installation & Testing

### Test Locally (Temporary)
1. Open Firefox
2. Go to `about:debugging#/runtime/this-firefox`
3. Click **"Load Temporary Add-on"**
4. Select your `.xpi` file
5. Extension loads for the current session only

### Install Permanently (Unsigned - Developer Edition/Nightly)
1. Open Firefox Developer Edition or Nightly
2. Double-click the `.xpi` file
3. Confirm installation

### Distribute to Users
1. **Submit to AMO** (Recommended):
   - Go to [addons.mozilla.org/developers](https://addons.mozilla.org/developers/)
   - Upload your `.xpi` file
   - Mozilla will review and sign it
   - Users can install from the addon store

2. **Self-distribution** (Requires signing):
   - Get an API key from AMO
   - Use `web-ext sign` to sign the XPI
   - Distribute the signed XPI

## Build Scripts

### Custom XPI Packager (New!)
Location: `scripts/build/package-xpi.js`

**Features:**
- ✅ Validates manifest.json structure
- ✅ Uses native ZIP for cross-platform compatibility
- ✅ Excludes development files (.map, .log)
- ✅ Automatic version from package.json
- ✅ File size reporting
- ✅ Content verification

### vs. web-ext build
Both create XPI files, but our custom script:
- Provides more detailed output
- Better error messages
- Smaller file size (excludes more dev files)
- Consistent naming convention
- No external dependencies beyond Node.js

You can still use `web-ext` if preferred:
```bash
npm run build:package
```

## Version Management

The extension version is managed in `package.json`:
```json
{
  "version": "0.1.0"
}
```

This version is automatically synced to `dist/manifest.json` during build.

**To release a new version:**
1. Update version in `package.json`
2. Run `npm run build`
3. The XPI will have the new version number

## Troubleshooting

### "dist directory not found"
**Solution:** Run `npm run build:transpile` first
```bash
npm run build:transpile
npm run build:xpi
```

### "manifest.json not found"
**Solution:** Check webpack config copies manifest to dist
```bash
# Verify webpack config
cat config/webpack/webpack.prod.js | grep manifest
```

### "zip: command not found"
**Solution:** Install zip utility

**Ubuntu/Debian:**
```bash
sudo apt-get install zip
```

**macOS:**
Pre-installed (no action needed)

**Windows:**
Use WSL or install via Chocolatey:
```bash
choco install zip
```

### XPI file is too large
**Solution:** Check for source maps or unminified code
```bash
# Analyze bundle size
npm run build:analyze

# Check XPI contents
unzip -l web-ext-artifacts/aws_profile_containers-*.xpi
```

## File Structure

```
project/
├── dist/                          # Build output (transpiled code)
│   ├── manifest.json             # Extension manifest
│   ├── popup.html                # Popup UI
│   ├── settings.html             # Settings page
│   ├── icons/                    # Optimized icons
│   └── js/                       # Transpiled JavaScript
│
├── web-ext-artifacts/            # XPI packages (gitignored)
│   └── aws_profile_containers-0.1.0.xpi
│
└── scripts/build/
    ├── package-xpi.js            # XPI packaging script
    └── README.md                 # Detailed documentation
```

## CI/CD Integration

Add to your GitHub Actions workflow:

```yaml
- name: Build Extension
  run: npm run build

- name: Upload XPI Artifact
  uses: actions/upload-artifact@v3
  with:
    name: firefox-extension
    path: web-ext-artifacts/*.xpi
```

## Further Reading

- [Firefox Extension Distribution](https://extensionworkshop.com/documentation/publish/)
- [web-ext Documentation](https://extensionworkshop.com/documentation/develop/web-ext-command-reference/)
- [Manifest.json Structure](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json)
- [Signing Extensions](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/)
