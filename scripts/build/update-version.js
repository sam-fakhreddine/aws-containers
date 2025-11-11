#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Script is now in scripts/build/, so go up 2 levels to project root
const projectRoot = path.join(__dirname, '../..');

// Read package.json version
const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
const version = packageJson.version;

// Update manifest.json version
const manifestPath = path.join(projectRoot, 'dist/manifest.json');
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.version = version;
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 4));
  console.log(`Updated manifest.json version to ${version}`);
} else {
  console.log('manifest.json not found, skipping version update');
}