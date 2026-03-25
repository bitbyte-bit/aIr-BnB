#!/usr/bin/env node

/**
 * PWA Icon Generator Script
 * 
 * This script generates all required PWA icons from the logo.png file.
 * 
 * Prerequisites:
 *   npm install sharp
 * 
 * Usage:
 *   node scripts/generate-icons.js
 * 
 * The script will read public/assets/logo.png and generate:
 *   - icon-16.png (16x16)
 *   - icon-32.png (32x32)
 *   - icon-72.png (72x72)
 *   - icon-96.png (96x96)
 *   - icon-128.png (128x128)
 *   - icon-144.png (144x144)
 *   - icon-152.png (152x152)
 *   - icon-192.png (192x192)
 *   - icon-384.png (384x384)
 *   - icon-512.png (512x512)
 *   - badge-72.png (72x72)
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SOURCE_LOGO = path.join(__dirname, '../public/assets/logo.png');
const OUTPUT_DIR = path.join(__dirname, '../public');

const ICON_SIZES = [
  { name: 'icon-16.png', size: 16 },
  { name: 'icon-32.png', size: 32 },
  { name: 'icon-72.png', size: 72 },
  { name: 'icon-96.png', size: 96 },
  { name: 'icon-128.png', size: 128 },
  { name: 'icon-144.png', size: 144 },
  { name: 'icon-152.png', size: 152 },
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-384.png', size: 384 },
  { name: 'icon-512.png', size: 512 },
  { name: 'badge-72.png', size: 72 },
];

async function generateIcons() {
  console.log('🎨 PWA Icon Generator');
  console.log('=====================\n');

  // Check if source logo exists
  if (!fs.existsSync(SOURCE_LOGO)) {
    console.error(`❌ Error: Source logo not found at ${SOURCE_LOGO}`);
    console.error('   Please ensure public/assets/logo.png exists');
    process.exit(1);
  }

  console.log(`✓ Found source logo: ${SOURCE_LOGO}`);
  console.log(`✓ Output directory: ${OUTPUT_DIR}\n`);

  // Generate each icon size
  for (const icon of ICON_SIZES) {
    const outputPath = path.join(OUTPUT_DIR, icon.name);
    
    try {
      await sharp(SOURCE_LOGO)
        .resize(icon.size, icon.size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png()
        .toFile(outputPath);
      
      console.log(`✓ Generated ${icon.name} (${icon.size}x${icon.size})`);
    } catch (error) {
      console.error(`❌ Failed to generate ${icon.name}:`, error.message);
    }
  }

  console.log('\n✅ Icon generation complete!');
  console.log('\nNext steps:');
  console.log('1. Verify the generated icons look correct');
  console.log('2. Test the PWA manifest at /manifest.json');
  console.log('3. Test push notifications with the new badge icon');
}

// Run the script
generateIcons().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
