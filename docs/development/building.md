# Building from Source

Complete guide to building AWS Profile Containers from source.

## Prerequisites

### Required
- Node.js 16+
- npm or yarn
- Git

### Optional
- Python 3.8+ (for building native host from source)
- PyInstaller (installed via pip)

## Quick Build

```bash
# Clone repository
git clone https://github.com/sam-fakhreddine/aws-containers.git
cd aws-containers

# Install Node dependencies
npm install

# Build extension
npm run build

# Output: dist/ directory
```

## Building the Extension

### Development Build

```bash
# Build once
npm run build

# Watch mode (rebuilds on changes)
npm run dev
```

### Production Build

```bash
npm run build
```

This runs:
1. TypeScript compilation (webpack)
2. SCSS compilation
3. Asset copying
4. Manifest generation

### Output

Build creates `dist/` directory:
```
dist/
├── manifest.json
├── popup.html
├── popup.js
├── backgroundPage.js
├── opener.js
├── styles.css
└── icons/
```

## Building the Native Host

### Using Pre-Built Executable

Download from [GitHub Releases](https://github.com/sam-fakhreddine/aws-containers/releases):
- `aws_profile_bridge-linux`
- `aws_profile_bridge-macos-intel`
- `aws_profile_bridge-macos-arm64`

Place in appropriate `bin/` directory.

### Building from Source

```bash
# Build standalone executable
./build-native-host.sh
```

This script:
1. Creates Python virtual environment
2. Installs PyInstaller and dependencies
3. Builds standalone executable
4. Places in `bin/<platform>/`

**Output:**
- Linux: `bin/linux/aws_profile_bridge` (~15-20MB)
- macOS Intel: `bin/darwin-x86_64/aws_profile_bridge`
- macOS ARM64: `bin/darwin-arm64/aws_profile_bridge`

### Manual Build

```bash
# Install dependencies
pip install -r native-messaging/requirements.txt
pip install pyinstaller

# Build
cd native-messaging
pyinstaller --onefile \
  --name aws_profile_bridge \
  --add-data "src:src" \
  src/aws_profile_bridge/aws_profile_bridge.py

# Output: dist/aws_profile_bridge
```

## Installing After Build

```bash
# Install native host and configure manifests
./install.sh
```

This:
- Copies executable to `~/.local/bin/`
- Creates native messaging manifest
- Configures Firefox integration

## Loading in Firefox

1. Open Firefox
2. Navigate to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Select `dist/manifest.json`

## Verification

```bash
# Test native messaging
./test-native-messaging.sh

# Should output profile list
```

## Platform-Specific Notes

### Linux

No special considerations.

### macOS

Remove quarantine flag after building:
```bash
xattr -d com.apple.quarantine bin/darwin-*/aws_profile_bridge
```

### Windows

Not currently supported. See [Installation Guide](../getting-started/installation.md).

## Troubleshooting

See [Troubleshooting Guide](../user-guide/troubleshooting.md) for build issues.

## Next Steps

- [Contributing Guide](contributing.md)
- [Testing Guide](testing.md)
- [Architecture](architecture.md)
