#!/usr/bin/env node
/**
 * Check Node.js version compatibility
 * Required: ^22.14.0 || >= 24.10.0
 */

const currentVersion = process.version.slice(1); // Remove 'v' prefix
const [major, minor, patch] = currentVersion.split('.').map(Number);

// Check if version meets requirements: ^22.14.0 || >= 24.10.0
let meetsRequirement = false;

if (major === 22 && minor >= 14) {
    meetsRequirement = true;
} else if (major === 24 && minor >= 10) {
    meetsRequirement = true;
} else if (major > 24) {
    meetsRequirement = true;
}

if (!meetsRequirement) {
    console.error('\x1b[31mError: Node.js version incompatible\x1b[0m');
    console.error('');
    console.error('This project requires:');
    console.error('  - Node.js 22.14.0 or later (22.x branch)');
    console.error('  - Node.js 24.10.0 or later (24.x+ branch)');
    console.error('');
    console.error(`You currently have: v${currentVersion}`);
    console.error('');
    console.error('To upgrade Node.js:');
    console.error('  1. Using nvm (recommended):');
    console.error('     nvm install 24.10.0');
    console.error('     nvm use 24.10.0');
    console.error('');
    console.error('  2. Download from https://nodejs.org/');
    console.error('');
    process.exit(1);
}

console.log(`✓ Node.js v${currentVersion} - Compatible`);
