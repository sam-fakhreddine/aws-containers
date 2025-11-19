#!/usr/bin/env node

/**
 * Firefox Extension XPI Packaging Script
 *
 * Creates a production-ready XPI file from the dist directory.
 * XPI files are standard ZIP archives with a .xpi extension.
 *
 * Usage: node scripts/build/package-xpi.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const projectRoot = path.join(__dirname, '../..');
const distDir = path.join(projectRoot, 'dist');
const artifactsDir = path.join(projectRoot, 'web-ext-artifacts');
const packageJson = require(path.join(projectRoot, 'package.json'));

// Files and directories to exclude from the XPI
const EXCLUDE_PATTERNS = [
  '.git',
  '.github',
  'node_modules',
  '.DS_Store',
  'Thumbs.db',
  '*.log',
  '*.map',
  '.env',
  '.env.*',
];

/**
 * Ensures a directory exists, creates it if it doesn't
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`✓ Created directory: ${path.relative(projectRoot, dirPath)}`);
  }
}

/**
 * Validates that the dist directory exists and contains required files
 */
function validateDistDirectory() {
  console.log('Validating dist directory...');

  if (!fs.existsSync(distDir)) {
    console.error('✗ Error: dist directory not found.');
    console.error('  Run "npm run build:transpile" first to create the dist directory.');
    process.exit(1);
  }

  const manifestPath = path.join(distDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.error('✗ Error: manifest.json not found in dist directory.');
    console.error('  The dist directory must contain a valid manifest.json file.');
    process.exit(1);
  }

  // Validate manifest.json structure
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (!manifest.version) {
      console.error('✗ Error: manifest.json is missing a version field.');
      process.exit(1);
    }
    console.log(`✓ Found valid manifest.json (version: ${manifest.version})`);
  } catch (error) {
    console.error('✗ Error: manifest.json is not valid JSON.');
    console.error(error.message);
    process.exit(1);
  }
}

/**
 * Gets the extension name from package.json, sanitized for use in filename
 */
function getExtensionName() {
  return packageJson.name.replace(/[^a-z0-9-]/gi, '_');
}

/**
 * Gets the version from package.json
 */
function getVersion() {
  return packageJson.version;
}

/**
 * Creates the XPI filename
 */
function getXpiFilename() {
  const name = getExtensionName();
  const version = getVersion();
  return `${name}-${version}.xpi`;
}

/**
 * Creates a zip archive (XPI file) from the dist directory
 */
function createXpiArchive() {
  const xpiFilename = getXpiFilename();
  const xpiPath = path.join(artifactsDir, xpiFilename);

  console.log('\nCreating XPI archive...');
  console.log(`  Source: ${path.relative(projectRoot, distDir)}`);
  console.log(`  Output: ${path.relative(projectRoot, xpiPath)}`);

  // Remove existing XPI if it exists
  if (fs.existsSync(xpiPath)) {
    fs.unlinkSync(xpiPath);
    console.log('✓ Removed existing XPI file');
  }

  try {
    // Use native zip command for better compatibility and control
    // -r: recursive
    // -q: quiet mode
    // -FS: filesync (update existing entries and add new ones)
    const zipCommand = `cd "${distDir}" && zip -r -q "${xpiPath}" . -x ${EXCLUDE_PATTERNS.map(p => `"${p}"`).join(' ')}`;

    execSync(zipCommand, { stdio: 'pipe' });

    // Verify the XPI was created
    if (!fs.existsSync(xpiPath)) {
      throw new Error('XPI file was not created');
    }

    // Get file size for display
    const stats = fs.statSync(xpiPath);
    const fileSizeInKB = (stats.size / 1024).toFixed(2);

    console.log(`✓ Successfully created XPI archive`);
    console.log(`  File: ${xpiFilename}`);
    console.log(`  Size: ${fileSizeInKB} KB`);

    return xpiPath;
  } catch (error) {
    console.error('✗ Error creating XPI archive:');
    console.error(error.message);
    process.exit(1);
  }
}

/**
 * Lists the contents of the XPI for verification
 */
function listXpiContents(xpiPath) {
  console.log('\nXPI Contents:');
  try {
    const output = execSync(`unzip -l "${xpiPath}"`, { encoding: 'utf8' });
    const lines = output.split('\n');

    // Show only file names, not the full listing
    const files = lines
      .filter(line => line.trim() && !line.includes('Archive:') && !line.includes('Length') && !line.includes('----'))
      .map(line => {
        const parts = line.trim().split(/\s+/);
        return parts[parts.length - 1]; // Get the filename (last column)
      })
      .filter(f => f && f !== 'Name'); // Remove header

    console.log(`  Total files: ${files.length}`);
    console.log('  Key files:');

    // Show important files
    const importantFiles = ['manifest.json', 'popup.html', 'settings.html'];
    importantFiles.forEach(file => {
      if (files.includes(file)) {
        console.log(`    ✓ ${file}`);
      }
    });

    // Show directory structure summary
    const dirs = [...new Set(files.map(f => f.split('/')[0]).filter(d => d))];
    console.log(`  Directories: ${dirs.join(', ')}`);

  } catch (error) {
    // Non-critical error, continue
    console.log('  (Could not list contents)');
  }
}

/**
 * Main execution function
 */
function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Firefox Extension XPI Packager');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Extension: ${packageJson.name}`);
  console.log(`  Version: ${getVersion()}`);
  console.log('═══════════════════════════════════════════════════════\n');

  // Step 1: Validate dist directory
  validateDistDirectory();

  // Step 2: Ensure artifacts directory exists
  ensureDir(artifactsDir);

  // Step 3: Create XPI archive
  const xpiPath = createXpiArchive();

  // Step 4: List contents for verification
  listXpiContents(xpiPath);

  // Success!
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  ✓ XPI PACKAGING COMPLETE');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`\nYour extension is ready at:`);
  console.log(`  ${path.relative(projectRoot, xpiPath)}`);
  console.log('\nYou can now:');
  console.log('  1. Test locally: Open about:debugging in Firefox');
  console.log('  2. Upload to AMO: https://addons.mozilla.org/developers/');
  console.log('  3. Distribute directly: Share the .xpi file\n');
}

// Run the script
try {
  main();
} catch (error) {
  console.error('\n✗ Fatal error:', error.message);
  process.exit(1);
}
