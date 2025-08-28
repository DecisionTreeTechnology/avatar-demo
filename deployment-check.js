#!/usr/bin/env node

/**
 * Deployment Readiness Check
 * Verifies that the app is ready for production deployment
 */

import fs from 'fs';
import path from 'path';

console.log('🚀 Avatar Demo - Deployment Readiness Check\n');

// Check for essential files
const essentialFiles = [
  'src/App.tsx',
  'src/utils/iosAudioManager.ts',
  'src/components/ChatBar.tsx',
  'src/hooks/useAzureTTS.ts',
  'src/hooks/useEnhancedAzureTTS.ts',
  'package.json',
  'vite.config.js',
  'index.html'
];

console.log('📁 Checking essential files...');
let filesOk = true;
essentialFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - MISSING`);
    filesOk = false;
  }
});

// Check for debug artifacts that should be removed
const debugPatterns = [
  { file: 'src/App.tsx', pattern: /console\.log.*\[App\]/, description: 'Verbose App debug logging' },
  { file: 'src/components/ChatBar.tsx', pattern: /console\.log.*\[ChatBar\]/, description: 'Verbose ChatBar debug logging' },
  { file: 'src/utils/iosAudioManager.ts', pattern: /console\.log.*\[AudioContext\]/, description: 'Verbose AudioContext debug logging' }
];

console.log('\n🧹 Checking for debug artifacts...');
let debugClean = true;
debugPatterns.forEach(({ file, pattern, description }) => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    if (pattern.test(content)) {
      console.log(`  ⚠️  ${file} - ${description} found`);
      debugClean = false;
    } else {
      console.log(`  ✅ ${file} - Clean`);
    }
  }
});

// Check package.json dependencies
console.log('\n📦 Checking key dependencies...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const keyDeps = ['react', 'typescript', 'vite', '@babylonjs/core'];
keyDeps.forEach(dep => {
  if (packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep]) {
    console.log(`  ✅ ${dep}`);
  } else {
    console.log(`  ⚠️  ${dep} - Not found`);
  }
});

// Check build configuration
console.log('\n⚙️  Checking build configuration...');
const viteConfigExists = fs.existsSync('vite.config.js');
const tsconfigExists = fs.existsSync('tsconfig.json');

console.log(`  ${viteConfigExists ? '✅' : '❌'} vite.config.js`);
console.log(`  ${tsconfigExists ? '✅' : '❌'} tsconfig.json`);

// Summary
console.log('\n📊 Summary:');
console.log(`  Files: ${filesOk ? '✅ All essential files present' : '❌ Missing files'}`);
console.log(`  Debug: ${debugClean ? '✅ Clean - no verbose debug logging' : '⚠️  Debug artifacts found'}`);
console.log(`  Config: ${viteConfigExists && tsconfigExists ? '✅ Build configuration ready' : '❌ Configuration issues'}`);

const allGood = filesOk && debugClean && viteConfigExists && tsconfigExists;
console.log(`\n${allGood ? '🎉 READY FOR DEPLOYMENT!' : '⚠️  Issues found - review before deployment'}`);

if (allGood) {
  console.log('\n📋 Next steps:');
  console.log('  1. Build: npm run build');
  console.log('  2. Preview: npm run preview');
  console.log('  3. Deploy to your hosting platform');
}

process.exit(allGood ? 0 : 1);
