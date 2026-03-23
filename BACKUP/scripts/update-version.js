/**
 * Update version.json with current build timestamp
 * This ensures cache busting even if file content hash doesn't change
 */

import { readFileSync, writeFileSync } from 'fs';

const versionPath = 'version.json';
const version = JSON.parse(readFileSync(versionPath, 'utf-8'));

// Increment build number
version.buildNumber = (version.buildNumber || 0) + 1;

// Update build date
version.buildDate = new Date().toISOString();

// Write back
writeFileSync(versionPath, JSON.stringify(version, null, 2));

console.log(`✅ Version updated: v${version.version} build ${version.buildNumber}`);
console.log(`   Build date: ${version.buildDate}`);
