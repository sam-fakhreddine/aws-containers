#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Project root is 2 levels up from scripts/build/
const projectRoot = path.join(__dirname, '../..');
const publicDir = path.join(projectRoot, 'public');
const distDir = path.join(projectRoot, 'dist');

/**
 * Recursively copy directory contents
 */
function copyDirectory(src, dest) {
    // Create destination directory if it doesn't exist
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }

    // Read all files/folders in source
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            // Recursively copy subdirectory
            copyDirectory(srcPath, destPath);
        } else {
            // Copy file
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

console.log('Copying static files from public/ to dist/...');

// Clean dist directory (but keep it if it exists)
if (fs.existsSync(distDir)) {
    // Remove all contents
    const entries = fs.readdirSync(distDir);
    for (const entry of entries) {
        const entryPath = path.join(distDir, entry);
        if (fs.lstatSync(entryPath).isDirectory()) {
            fs.rmSync(entryPath, { recursive: true, force: true });
        } else {
            fs.unlinkSync(entryPath);
        }
    }
} else {
    fs.mkdirSync(distDir, { recursive: true });
}

// Copy all files from public to dist
copyDirectory(publicDir, distDir);

console.log('✓ Static files copied successfully');
