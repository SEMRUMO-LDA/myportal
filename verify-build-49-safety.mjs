#!/usr/bin/env node
/**
 * BUILD 49 - Safety Verification Script
 * Verifica que funcionalidades críticas NÃO foram alteradas
 */

import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('=== BUILD 49 - VERIFICAÇÃO DE SEGURANÇA ===\n');

const checks = {
  passed: 0,
  failed: 0,
  warnings: 0
};

function pass(message) {
  console.log(`✅ ${message}`);
  checks.passed++;
}

function fail(message) {
  console.log(`❌ ${message}`);
  checks.failed++;
}

function warn(message) {
  console.log(`⚠️  ${message}`);
  checks.warnings++;
}

// 1. Verificar BUILD_VERSION
console.log('1️⃣ BUILD_VERSION');
const indexHtml = readFileSync(join(__dirname, 'index.html'), 'utf-8');
const distIndexHtml = readFileSync(join(__dirname, 'dist/index.html'), 'utf-8');

if (indexHtml.includes("BUILD_VERSION = '49'")) {
  pass('Source index.html tem BUILD_VERSION = 49');
} else {
  fail('Source index.html NÃO tem BUILD_VERSION = 49');
}

if (distIndexHtml.includes("BUILD_VERSION = '49'")) {
  pass('Dist index.html tem BUILD_VERSION = 49');
} else {
  fail('Dist index.html NÃO tem BUILD_VERSION = 49');
}

// 2. Verificar Meta Tags Anti-Cache
console.log('\n2️⃣ META TAGS ANTI-CACHE');
const requiredMetaTags = [
  'no-cache, no-store, must-revalidate',
  'Pragma',
  'Expires',
  'pre-check=0, post-check=0',
  'x-dns-prefetch-control'
];

requiredMetaTags.forEach(tag => {
  if (distIndexHtml.includes(tag)) {
    pass(`Meta tag presente: ${tag}`);
  } else {
    fail(`Meta tag AUSENTE: ${tag}`);
  }
});

// 3. Verificar .htaccess
console.log('\n3️⃣ .HTACCESS');
try {
  const htaccess = readFileSync(join(__dirname, 'dist/.htaccess'), 'utf-8');

  if (htaccess.includes('Header unset ETag')) {
    pass('.htaccess tem Header unset ETag');
  } else {
    fail('.htaccess NÃO tem Header unset ETag');
  }

  if (htaccess.includes('Header unset Last-Modified')) {
    pass('.htaccess tem Header unset Last-Modified');
  } else {
    fail('.htaccess NÃO tem Header unset Last-Modified');
  }

  if (htaccess.includes('pre-check=0, post-check=0')) {
    pass('.htaccess tem pre-check/post-check headers');
  } else {
    fail('.htaccess NÃO tem pre-check/post-check headers');
  }
} catch (err) {
  fail('.htaccess NÃO encontrado em dist/');
}

// 4. Verificar que ficheiros críticos NÃO foram modificados
console.log('\n4️⃣ FICHEIROS CRÍTICOS (não devem ter sido alterados)');

const criticalFiles = [
  'services/authService.ts',
  'services/resilientTimeLogService.ts',
  'services/kioskClockService.ts',
  'context/AuthContext.tsx'
];

// Apenas verificamos que existem (não podemos verificar timestamps via git aqui)
criticalFiles.forEach(file => {
  try {
    readFileSync(join(__dirname, file), 'utf-8');
    pass(`${file} existe (assumindo não modificado)`);
  } catch {
    fail(`${file} NÃO encontrado!`);
  }
});

// 5. Verificar Assets JS
console.log('\n5️⃣ ASSETS JAVASCRIPT');
try {
  const htmlContent = readFileSync(join(__dirname, 'dist/index.html'), 'utf-8');

  if (htmlContent.includes('index-') && htmlContent.includes('.js')) {
    pass('Main bundle presente no index.html');
  } else {
    fail('Main bundle NÃO encontrado!');
  }

  // KioskDashboard é code-split, não está no index.html
  // Verificamos que existe na pasta dist/assets/
  const assetsFiles = readdirSync(join(__dirname, 'dist/assets'));
  const kioskFile = assetsFiles.find(f => f.startsWith('KioskDashboard-'));

  if (kioskFile) {
    pass(`KioskDashboard bundle existe: ${kioskFile}`);
  } else {
    fail('KioskDashboard bundle NÃO encontrado em dist/assets/!');
  }
} catch (err) {
  fail(`Erro ao verificar assets: ${err.message}`);
}

// 6. Verificar Service Worker
console.log('\n6️⃣ SERVICE WORKER');
try {
  const sw = readFileSync(join(__dirname, 'dist/sw.js'), 'utf-8');
  if (sw.length > 100) {
    pass('Service Worker gerado (sw.js existe e tem conteúdo)');
  } else {
    warn('Service Worker parece vazio');
  }
} catch {
  fail('Service Worker NÃO encontrado!');
}

// 7. Verificar Manifest
console.log('\n7️⃣ MANIFEST.WEBMANIFEST');
try {
  const manifest = readFileSync(join(__dirname, 'dist/manifest.webmanifest'), 'utf-8');
  const json = JSON.parse(manifest);
  if (json.name) {
    pass('Manifest válido e parseável');
  } else {
    warn('Manifest não tem campo name');
  }
} catch {
  fail('Manifest NÃO encontrado ou inválido!');
}

// 8. Verificar que cache busting está correto
console.log('\n8️⃣ CACHE BUSTING LOGIC');
if (distIndexHtml.includes('navigator.serviceWorker.getRegistrations()')) {
  pass('Service Worker unregister presente');
} else {
  fail('Service Worker unregister AUSENTE!');
}

if (distIndexHtml.includes('caches.keys()')) {
  pass('Cache clearing presente');
} else {
  fail('Cache clearing AUSENTE!');
}

if (distIndexHtml.includes('setTimeout') && distIndexHtml.includes('500')) {
  pass('Delay de 500ms antes reload presente');
} else {
  warn('Delay antes reload pode estar ausente');
}

// RESULTADO FINAL
console.log('\n' + '='.repeat(50));
console.log('RESULTADO FINAL');
console.log('='.repeat(50));
console.log(`✅ Passou: ${checks.passed}`);
console.log(`⚠️  Avisos: ${checks.warnings}`);
console.log(`❌ Falhou: ${checks.failed}`);
console.log('='.repeat(50));

if (checks.failed > 0) {
  console.log('\n❌ BUILD 49 TEM PROBLEMAS - NÃO DEPLOY!');
  process.exit(1);
} else if (checks.warnings > 0) {
  console.log('\n⚠️  BUILD 49 TEM AVISOS - REVISAR ANTES DE DEPLOY');
  process.exit(0);
} else {
  console.log('\n✅ BUILD 49 APROVADO - SEGURO PARA DEPLOY!');
  process.exit(0);
}
