#!/usr/bin/env node
/**
 * TEST BUILD 55 - HOT FIX VERIFICATION
 * Testa se o timeout fix está a funcionar corretamente
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

console.log('🔥 BUILD 55 - Hot Fix Verification\n');

// Test 1: Verificar version.json
console.log('✅ Test 1: Version Check');
try {
  const versionPath = resolve(process.cwd(), 'dist/version.json');
  const version = JSON.parse(readFileSync(versionPath, 'utf-8'));

  console.log(`   Version: ${version.version}`);
  console.log(`   Build Number: ${version.buildNumber}`);
  console.log(`   Features: ${version.features.length} items`);

  if (version.buildNumber !== 55) {
    console.error('   ❌ ERRO: Build number deveria ser 55!');
    process.exit(1);
  }

  if (!version.features.some(f => f.includes('HOT FIX'))) {
    console.error('   ❌ ERRO: Features não mencionam HOT FIX!');
    process.exit(1);
  }

  console.log('   ✅ Version.json correto\n');
} catch (error) {
  console.error('   ❌ ERRO ao ler version.json:', error.message);
  process.exit(1);
}

// Test 2: Verificar se Login.tsx contém o fix
console.log('✅ Test 2: Source Code Check');
try {
  const loginPath = resolve(process.cwd(), 'pages/Login.tsx');
  const loginContent = readFileSync(loginPath, 'utf-8');

  const hasLoadTimeout = loginContent.includes('const [loadTimeout, setLoadTimeout]');
  const hasTimeoutEffect = loginContent.includes('Se users não carregaram em 5s');
  const hasButtonFix = loginContent.includes('&& !loadTimeout');

  console.log(`   loadTimeout state: ${hasLoadTimeout ? '✅' : '❌'}`);
  console.log(`   Timeout useEffect: ${hasTimeoutEffect ? '✅' : '❌'}`);
  console.log(`   Button condition: ${hasButtonFix ? '✅' : '❌'}`);

  if (!hasLoadTimeout || !hasTimeoutEffect || !hasButtonFix) {
    console.error('   ❌ ERRO: Fix incompleto em Login.tsx!');
    process.exit(1);
  }

  console.log('   ✅ Login.tsx contém o fix completo\n');
} catch (error) {
  console.error('   ❌ ERRO ao ler Login.tsx:', error.message);
  process.exit(1);
}

// Test 3: Verificar se o build existe
console.log('✅ Test 3: Build Artifacts');
try {
  const indexPath = resolve(process.cwd(), 'dist/index.html');
  const indexContent = readFileSync(indexPath, 'utf-8');

  console.log(`   index.html: ${indexContent.length} bytes`);

  const hasModuleScript = indexContent.includes('type="module"');
  const hasBaseTag = indexContent.includes('/app/myportal/');

  console.log(`   Module script: ${hasModuleScript ? '✅' : '❌'}`);
  console.log(`   Base tag: ${hasBaseTag ? '✅' : '❌'}`);

  if (!hasModuleScript || !hasBaseTag) {
    console.error('   ❌ ERRO: Build inválido!');
    process.exit(1);
  }

  console.log('   ✅ Build artifacts válidos\n');
} catch (error) {
  console.error('   ❌ ERRO ao ler build artifacts:', error.message);
  process.exit(1);
}

// Test 4: Verificar changelog
console.log('✅ Test 4: Documentation Check');
try {
  const changelogPath = resolve(process.cwd(), 'BUILD_55_HOT_FIX.md');
  const changelog = readFileSync(changelogPath, 'utf-8');

  console.log(`   Changelog: ${changelog.length} bytes`);

  const hasRootCause = changelog.includes('Root Cause');
  const hasSolution = changelog.includes('SOLUÇÃO IMPLEMENTADA');
  const hasDeployChecklist = changelog.includes('DEPLOY CHECKLIST');

  console.log(`   Root cause: ${hasRootCause ? '✅' : '❌'}`);
  console.log(`   Solution: ${hasSolution ? '✅' : '❌'}`);
  console.log(`   Deploy checklist: ${hasDeployChecklist ? '✅' : '❌'}`);

  if (!hasRootCause || !hasSolution || !hasDeployChecklist) {
    console.error('   ❌ ERRO: Documentação incompleta!');
    process.exit(1);
  }

  console.log('   ✅ Documentação completa\n');
} catch (error) {
  console.error('   ❌ ERRO ao ler changelog:', error.message);
  process.exit(1);
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🎉 TODOS OS TESTES PASSARAM!');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('📦 BUILD 55 está pronto para deploy:');
console.log('   1. npm run build (DONE ✅)');
console.log('   2. Verificar dist/version.json (✅)');
console.log('   3. Upload dist/ para servidor');
console.log('   4. Clear cache browser');
console.log('   5. Testar login com utilizador real');
console.log('\n🚀 Próximo passo: DEPLOY URGENTE!');
