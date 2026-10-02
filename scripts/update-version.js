/**
 * Update version.json with current build timestamp
 * This ensures cache busting even if file content hash doesn't change
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';

const versionPath = 'version.json';

// Create default version file if it doesn't exist
if (!existsSync(versionPath)) {
  const defaultVersion = {
    version: "1.26",
    buildNumber: 0,
    buildDate: new Date().toISOString()
  };
  writeFileSync(versionPath, JSON.stringify(defaultVersion, null, 2));
  console.log('✅ Created default version.json');
}

const version = JSON.parse(readFileSync(versionPath, 'utf-8'));

// Increment build number
version.buildNumber = (version.buildNumber || 0) + 1;

// Update build date
version.buildDate = new Date().toISOString();

// Write back
writeFileSync(versionPath, JSON.stringify(version, null, 2));

console.log(`✅ Version updated: v${version.version} build ${version.buildNumber}`);
console.log(`   Build date: ${version.buildDate}`);
