# Build Scripts

This directory contains build automation scripts for the Firefox extension.

## Scripts

### package-xpi.js

Creates a production-ready XPI (Firefox Extension) package from the `dist/` directory.

**Features:**
- ✅ Validates dist directory and manifest.json
- ✅ Creates properly formatted XPI file (ZIP archive)
- ✅ Excludes unnecessary files (.map, .log, etc.)
- ✅ Automatic versioning from package.json
- ✅ File size reporting
- ✅ Content verification

**Usage:**

```bash
# Run directly
npm run build:xpi

# Or as part of the full build
npm run build
```

**Output:**

The XPI file will be created in `web-ext-artifacts/` with the naming format:
```
aws_profile_containers-{version}.xpi
```

Example: `aws_profile_containers-0.1.0.xpi`

**Requirements:**
- The `dist/` directory must exist (run `npm run build:transpile` first)
- A valid `manifest.json` must be present in `dist/`
- The `zip` command must be available on your system

**What Gets Packaged:**

All files from the `dist/` directory except:
- .git directories
- .DS_Store, Thumbs.db
- *.log files
- *.map files
- .env files

### update-version.js

Updates the version number in `dist/manifest.json` to match the version in `package.json`.

**Usage:**
```bash
npm run build:update-version
```

This script is automatically run as part of the build process.

## Build Pipeline

The complete build pipeline runs these steps in order:

1. **build:optimize-images** - Optimizes icon images
2. **build:update-version** - Syncs version to manifest.json
3. **build:transpile** - Compiles TypeScript/JSX to JavaScript
4. **build:xpi** - Creates the XPI package

Run the full pipeline with:
```bash
npm run build
```

## Testing the XPI

After building, you can test the XPI file:

### Option 1: about:debugging (Recommended for testing)
1. Open Firefox
2. Navigate to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Select the `.xpi` file from `web-ext-artifacts/`

### Option 2: Direct Installation
Double-click the `.xpi` file (Firefox will prompt for installation)

### Option 3: AMO Submission
Upload the `.xpi` file to [addons.mozilla.org](https://addons.mozilla.org/developers/) for distribution.

## Troubleshooting

**Error: "dist directory not found"**
- Run `npm run build:transpile` first to create the dist directory

**Error: "manifest.json not found"**
- Ensure your webpack config copies manifest.json to dist/
- Check `config/webpack/webpack.prod.js`

**Error: "zip command not found"**
- Install zip utility:
  - Ubuntu/Debian: `sudo apt-get install zip`
  - macOS: Pre-installed
  - Windows: Use WSL or install via chocolatey

**XPI file is too large**
- Check if source maps are being included (should be excluded)
- Review webpack production config for minification settings
- Run `npm run build:analyze` to inspect bundle size
