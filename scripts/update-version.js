#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read package.json version
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
const version = packageJson.version;

// Update manifest.json version
const manifestPath = path.join(__dirname, '../dist/manifest.json');
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.version = version;
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 4));
  console.log(`Updated manifest.json version to ${version}`);
} else {
  console.log('manifest.json not found, skipping version update');
}