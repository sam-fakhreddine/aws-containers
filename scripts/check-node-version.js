#!/usr/bin/env node
/**
 * Check Node.js version compatibility
 * Required: ^22.14.0 || >= 24.10.0
 *
 * Uses semver library for proper version parsing and comparison,
 * handling pre-release and build metadata correctly.
 */

const semver = require('semver');
const { version } = process;
const range = '^22.14.0 || >=24.10.0';

if (!semver.satisfies(version, range)) {
    console.error(`
\x1b[31mError: Node.js version incompatible\x1b[0m

This project requires: ${range}
You currently have: ${version}

To upgrade Node.js:
  1. Using nvm (recommended):
     nvm install 24.10.0
     nvm use 24.10.0

  2. Download from https://nodejs.org/
`);
    process.exit(1);
}

console.log(`✓ Node.js ${version} - Compatible`);
