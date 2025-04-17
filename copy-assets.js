/**
 * Script to copy logo assets to native platforms
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get the project root directory
const rootDir = process.cwd();

// Source files
const logoSource = path.join(rootDir, 'assets', 'logomed.png');
const splashSource = path.join(rootDir, 'assets', 'NoBgLogoMed.png');

// Make sure the source files exist
if (!fs.existsSync(logoSource)) {
 console.error(`Source file not found: ${logoSource}`);
 process.exit(1);
}

if (!fs.existsSync(splashSource)) {
 console.error(`Source file not found: ${splashSource}`);
 process.exit(1);
}

// Android directories
const androidResDir = path.join(rootDir, 'android', 'app', 'src', 'main', 'res');
const androidDrawableDir = path.join(androidResDir, 'drawable');

// Create directories if they don't exist
if (!fs.existsSync(androidDrawableDir)) {
 fs.mkdirSync(androidDrawableDir, { recursive: true });
}

// Copy files for Android
console.log('Copying logo files to Android...');
fs.copyFileSync(logoSource, path.join(androidDrawableDir, 'ic_launcher.png'));
fs.copyFileSync(splashSource, path.join(androidDrawableDir, 'splashscreen_logo.png'));

console.log('Assets successfully copied to native platforms.');
console.log('Please run "expo prebuild" to update the native projects.'); 