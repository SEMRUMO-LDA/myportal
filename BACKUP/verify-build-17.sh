#!/bin/bash

# ============================================================================
# VERIFICAÇÃO PRÉ-DEPLOY - BUILD #17
# ============================================================================

echo ""
echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║           VERIFICAÇÃO PRÉ-DEPLOY - BUILD #17                      ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""

ERRORS=0
WARNINGS=0

# ----------------------------------------------------------------------------
# 1. Verificar que dist/ existe
# ----------------------------------------------------------------------------
echo "📁 Verificando pasta dist/..."
if [ -d "dist" ]; then
  echo "   ✅ Pasta dist/ existe"
else
  echo "   ❌ Pasta dist/ NÃO existe! Execute: npm run build"
  ERRORS=$((ERRORS + 1))
fi

# ----------------------------------------------------------------------------
# 2. Verificar version.json
# ----------------------------------------------------------------------------
echo ""
echo "📄 Verificando version.json..."
if [ -f "dist/version.json" ]; then
  BUILD_NUMBER=$(cat dist/version.json | grep buildNumber | awk '{print $2}' | tr -d ',')
  BUILD_DATE=$(cat dist/version.json | grep buildDate | cut -d'"' -f4)

  if [ "$BUILD_NUMBER" = "17" ]; then
    echo "   ✅ Build number: $BUILD_NUMBER (correto)"
    echo "   ✅ Build date: $BUILD_DATE"
  else
    echo "   ❌ Build number: $BUILD_NUMBER (esperado: 17)"
    ERRORS=$((ERRORS + 1))
  fi
else
  echo "   ❌ dist/version.json NÃO existe!"
  ERRORS=$((ERRORS + 1))
fi

# ----------------------------------------------------------------------------
# 3. Verificar ficheiros críticos
# ----------------------------------------------------------------------------
echo ""
echo "🔍 Verificando ficheiros críticos..."

CRITICAL_FILES=(
  "dist/index.html"
  "dist/manifest.webmanifest"
  "dist/sw.js"
  "dist/assets/index-CUeVRJ-b.js"
  "dist/assets/vendor-74TpZhNv.js"
  "dist/assets/index-kD9IiKK6.css"
)

for file in "${CRITICAL_FILES[@]}"; do
  if [ -f "$file" ]; then
    SIZE=$(ls -lh "$file" | awk '{print $5}')
    echo "   ✅ $file ($SIZE)"
  else
    echo "   ❌ $file NÃO existe!"
    ERRORS=$((ERRORS + 1))
  fi
done

# ----------------------------------------------------------------------------
# 4. Verificar tamanho total
# ----------------------------------------------------------------------------
echo ""
echo "📊 Verificando tamanho total..."
TOTAL_SIZE=$(du -sh dist/ | awk '{print $1}')
echo "   ℹ️  Tamanho total: $TOTAL_SIZE"

if [ -d "dist/assets" ]; then
  JS_COUNT=$(ls dist/assets/*.js 2>/dev/null | wc -l | tr -d ' ')
  echo "   ℹ️  Ficheiros JavaScript: $JS_COUNT"

  if [ "$JS_COUNT" -lt "50" ]; then
    echo "   ⚠️  AVISO: Menos ficheiros JS que o esperado (esperado: ~59)"
    WARNINGS=$((WARNINGS + 1))
  fi
fi

# ----------------------------------------------------------------------------
# 5. Verificar código-fonte (sessão persistente)
# ----------------------------------------------------------------------------
echo ""
echo "🔐 Verificando implementação de sessão persistente..."

if grep -q "flowType: 'pkce'" services/supabaseClient.ts; then
  echo "   ✅ PKCE flow implementado (services/supabaseClient.ts)"
else
  echo "   ⚠️  PKCE flow NÃO encontrado"
  WARNINGS=$((WARNINGS + 1))
fi

if grep -q "persistSession: true" services/supabaseClient.ts; then
  echo "   ✅ persistSession: true (services/supabaseClient.ts)"
else
  echo "   ❌ persistSession NÃO está true!"
  ERRORS=$((ERRORS + 1))
fi

# ----------------------------------------------------------------------------
# 6. Verificar geolocalização obrigatória
# ----------------------------------------------------------------------------
echo ""
echo "📍 Verificando implementação de geolocalização..."

if [ -f "services/geolocationService.ts" ]; then
  echo "   ✅ geolocationService.ts existe"

  if grep -q "getCurrentLocation" services/geolocationService.ts; then
    echo "   ✅ Função getCurrentLocation() implementada"
  fi

  if grep -q "isWithinAllowedLocations" services/geolocationService.ts; then
    echo "   ✅ Função isWithinAllowedLocations() implementada"
  fi
else
  echo "   ❌ services/geolocationService.ts NÃO existe!"
  ERRORS=$((ERRORS + 1))
fi

# ----------------------------------------------------------------------------
# 7. Verificar otimizações de polling
# ----------------------------------------------------------------------------
echo ""
echo "⚡ Verificando otimizações de performance..."

if grep -q "120000" App.tsx; then
  echo "   ✅ Polling configurado para 120 segundos (App.tsx)"
else
  echo "   ⚠️  Polling de 120s NÃO encontrado"
  WARNINGS=$((WARNINGS + 1))
fi

# ----------------------------------------------------------------------------
# 8. Verificar documentação
# ----------------------------------------------------------------------------
echo ""
echo "📚 Verificando documentação..."

DOCS=(
  "SESSION_CONFIGURATION.md"
  "GEOLOCATION_IMPLEMENTATION.md"
  "DEPLOY_BUILD_17.md"
  "APPLY_THIS_TO_SUPABASE_FINAL.sql"
  "RESUMO_BUILD_17.md"
)

for doc in "${DOCS[@]}"; do
  if [ -f "$doc" ]; then
    echo "   ✅ $doc"
  else
    echo "   ⚠️  $doc NÃO existe"
    WARNINGS=$((WARNINGS + 1))
  fi
done

# ----------------------------------------------------------------------------
# 9. Verificar se há processos em background
# ----------------------------------------------------------------------------
echo ""
echo "🔧 Verificando processos..."

if lsof -i :3006 >/dev/null 2>&1; then
  echo "   ⚠️  Porta 3006 em uso (dev server a correr?)"
  echo "      Não é problema, mas pode querer parar: pkill -f \"npm run dev\""
  WARNINGS=$((WARNINGS + 1))
else
  echo "   ✅ Porta 3006 livre"
fi

# ----------------------------------------------------------------------------
# RESUMO FINAL
# ----------------------------------------------------------------------------
echo ""
echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║                        RESUMO DA VERIFICAÇÃO                       ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo "   ✅ TUDO OK! Build #17 pronto para deploy em produção!"
  echo ""
  echo "   📦 Próximos passos:"
  echo "      1. Upload de dist/ para https://semrumo.eu/app/myportal/"
  echo "      2. Configurar Supabase Dashboard (JWT expiry = 43200s)"
  echo "      3. Aplicar APPLY_THIS_TO_SUPABASE_FINAL.sql"
  echo "      4. Testar em produção"
  echo ""
  exit 0
elif [ $ERRORS -eq 0 ]; then
  echo "   ⚠️  Build completo, mas com $WARNINGS avisos"
  echo "      (Avisos não bloqueiam deploy, mas recomenda-se revisão)"
  echo ""
  exit 0
else
  echo "   ❌ Encontrados $ERRORS erros críticos!"
  echo "   ⚠️  E $WARNINGS avisos"
  echo ""
  echo "   ⚠️  NÃO fazer deploy até resolver os erros!"
  echo ""
  exit 1
fi
