#!/usr/bin/env node
/**
 * Image Optimization Script
 *
 * Optimizes the extension icon by:
 * 1. Resizing to appropriate size (128px max needed)
 * 2. Compressing with high quality settings
 * 3. Reducing file size significantly
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const INPUT_IMAGE = path.join(__dirname, '../public/aws-console-containers.png');
const OUTPUT_IMAGE = path.join(__dirname, '../public/aws-console-containers-optimized.png');

async function optimizeImage() {
    try {
        // Get original file size
        const originalStats = fs.statSync(INPUT_IMAGE);
        const originalSize = originalStats.size;
        
        // Skip optimization if file is already under 100KB
        if (originalSize < 100 * 1024) {
            console.log('✅ Extension icon is already under 100KB, skipping optimization');
            return;
        }

        console.log('📦 Optimizing extension icon...');
        console.log(`   Original size: ${(originalSize / 1024).toFixed(2)} KB`);

        // Resize and optimize
        // Since manifest.json needs max 128px, we'll make it 256px for retina displays
        // but still compress it heavily
        await sharp(INPUT_IMAGE)
            .resize(256, 256, {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .png({
                quality: 90,
                compressionLevel: 9,
                palette: true // Use palette-based PNG for smaller size
            })
            .toFile(OUTPUT_IMAGE);

        // Get optimized file size
        const optimizedStats = fs.statSync(OUTPUT_IMAGE);
        const optimizedSize = optimizedStats.size;
        const reduction = ((originalSize - optimizedSize) / originalSize * 100).toFixed(2);

        console.log(`   Optimized size: ${(optimizedSize / 1024).toFixed(2)} KB`);
        console.log(`   ✅ Reduced by ${reduction}% (saved ${((originalSize - optimizedSize) / 1024).toFixed(2)} KB)`);

        // Replace original with optimized
        fs.renameSync(OUTPUT_IMAGE, INPUT_IMAGE);
        console.log(`   📁 Replaced original with optimized version`);

        if (optimizedSize < 100 * 1024) { // Less than 100KB
            console.log(`   🎉 Success! File is now under 100KB`);
        } else {
            console.log(`   ⚠️  Warning: File is still over 100KB`);
        }

    } catch (error) {
        console.error('❌ Error optimizing image:', error);
        process.exit(1);
    }
}

optimizeImage();
