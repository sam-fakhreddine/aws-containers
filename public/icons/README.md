# Extension Icons

This directory contains all icon assets for the AWS Profile Containers extension.

## Source Files

- **Source PNG**: `../../aws-console-containers.png` (1024x1024)
- **Source SVG**: `../../aws-console-containers.svg` (vector)

## Generated Icons

All PNG icons are generated from the source 1024x1024 PNG:

- `icon-16.png` - Toolbar icon (standard DPI)
- `icon-32.png` - Toolbar icon (high DPI)
- `icon-48.png` - Extension manager, toolbar
- `icon-96.png` - Extension manager (high DPI)
- `icon-128.png` - Extension manager, Chrome Web Store

## SVG Icon

- `icon.svg` - Scalable version (copied from source)

## Regenerating Icons

If you update the source images, regenerate all sizes:

```bash
cd /path/to/aws-containers
sips -z 16 16 aws-console-containers.png --out public/icons/icon-16.png
sips -z 32 32 aws-console-containers.png --out public/icons/icon-32.png
sips -z 48 48 aws-console-containers.png --out public/icons/icon-48.png
sips -z 96 96 aws-console-containers.png --out public/icons/icon-96.png
sips -z 128 128 aws-console-containers.png --out public/icons/icon-128.png
cp aws-console-containers.svg public/icons/icon.svg
```

## Usage in Manifest

The manifest.json references these icons for different contexts:

- **browser_action**: 16px, 32px, 48px (toolbar button)
- **sidebar_action**: 16px, 32px (sidebar)
- **icons**: 16px, 32px, 48px, 96px, 128px (extension manager, about:addons)
