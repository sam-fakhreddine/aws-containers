# Native Messaging Test Extension

This is a standalone test extension for debugging native messaging issues.

## How to Load

1. Open Firefox
2. Go to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Navigate to `test-extension/` directory
5. Select `manifest.json`
6. The test page will open as a popup when you click the extension icon

## What It Does

- Tests direct connection to the native messaging host
- Shows all messages sent and received
- Displays detailed error messages
- Visualizes profiles in a grid

## Usage

1. Click the extension icon in the toolbar
2. Click "Connect" to establish connection
3. Click "Get Profiles" to fetch profiles
4. Watch the communication log for details
