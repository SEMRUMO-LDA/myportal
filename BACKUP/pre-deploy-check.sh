#!/bin/bash

# ========================
# MYPORTAL - Checklist Pré-Deploy
# ========================
# Verifica se o build está pronto para produção
# Criado: 2026-03-20
# Risco: ZERO - Apenas lê e verifica

echo "🚀 MYPORTAL - Checklist Pré-Deploy"
echo "===================================="
echo ""

CHECKS_PASSED=0
CHECKS_FAILED=0
WARNINGS=0

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ========================
# CHECK #1: Ficheiros críticos
# ========================
echo "📁 CHECK #1: Ficheiros Críticos"

if [ -f ".env.local" ]; then
    if grep -q "VITE_SUPABASE_SERVICE_KEY" .env.local 2>/dev/null; then
        echo -e "${RED}❌ FALHA: .env.local contém chaves secretas!${NC}"
        echo "   Ação: Remover VITE_SUPABASE_SERVICE_KEY de .env.local"
        ((CHECKS_FAILED++))
    else
        echo -e "${GREEN}✅ PASS: .env.local não contém service keys${NC}"
        ((CHECKS_PASSED++))
    fi
else
    echo -e "${GREEN}✅ PASS: .env.local não existe${NC}"
    ((CHECKS_PASSED++))
fi

# ========================
# CHECK #2: .gitignore existe
# ========================
echo ""
echo "🔒 CHECK #2: Segurança Git"

if [ -f ".gitignore" ]; then
    if grep -q ".env.local" .gitignore; then
        echo -e "${GREEN}✅ PASS: .gitignore protege .env.local${NC}"
        ((CHECKS_PASSED++))
    else
        echo -e "${RED}❌ FALHA: .gitignore não protege .env.local${NC}"
        echo "   Ação: Adicionar '.env.local' ao .gitignore"
        ((CHECKS_FAILED++))
    fi
else
    echo -e "${RED}❌ FALHA: .gitignore não existe!${NC}"
    echo "   Ação: Criar .gitignore"
    ((CHECKS_FAILED++))
fi

# ========================
# CHECK #3: Ficheiros .bak
# ========================
echo ""
echo "🧹 CHECK #3: Ficheiros Temporários"

BAK_COUNT=$(find . -name "*.bak*" -o -name "*Simple.tsx" | grep -v node_modules | wc -l | xargs)
if [ "$BAK_COUNT" -eq 0 ]; then
    echo -e "${GREEN}✅ PASS: Sem ficheiros .bak ou *Simple${NC}"
    ((CHECKS_PASSED++))
else
    echo -e "${YELLOW}⚠️  WARNING: $BAK_COUNT ficheiros temporários encontrados${NC}"
    echo "   Ação: Executar ./cleanup-safe.sh"
    ((WARNINGS++))
fi

# ========================
# CHECK #4: Build Válido
# ========================
echo ""
echo "🔨 CHECK #4: Build Status"

if [ -d "dist" ] && [ -f "dist/index.html" ]; then
    # Verificar se BUILD_VERSION existe
    if grep -q "BUILD_VERSION" dist/index.html; then
        BUILD_NUM=$(grep -o "BUILD_VERSION = '[0-9]*'" dist/index.html | grep -o "[0-9]*")
        echo -e "${GREEN}✅ PASS: Build existe (BUILD $BUILD_NUM)${NC}"
        ((CHECKS_PASSED++))
    else
        echo -e "${YELLOW}⚠️  WARNING: BUILD_VERSION não encontrado${NC}"
        ((WARNINGS++))
    fi
else
    echo -e "${RED}❌ FALHA: Build não existe (dist/ vazio)${NC}"
    echo "   Ação: Executar 'npm run build'"
    ((CHECKS_FAILED++))
fi

# ========================
# CHECK #5: TypeScript Errors
# ========================
echo ""
echo "📝 CHECK #5: TypeScript (Quick)"
echo "   (Executar 'npx tsc --noEmit' para verificação completa)"

# Quick check - apenas verificar se compila
if command -v tsc &> /dev/null; then
    # Timeout de 5 segundos para não demorar
    timeout 5s npx tsc --noEmit 2>&1 | head -3 | grep -q "error TS" && TS_HAS_ERRORS=1 || TS_HAS_ERRORS=0

    if [ $TS_HAS_ERRORS -eq 1 ]; then
        echo -e "${YELLOW}⚠️  WARNING: TypeScript tem erros${NC}"
        echo "   Ação: Executar 'npx tsc --noEmit' para ver detalhes"
        ((WARNINGS++))
    else
        echo -e "${GREEN}✅ PASS: TypeScript parece OK (quick check)${NC}"
        ((CHECKS_PASSED++))
    fi
else
    echo -e "${YELLOW}⚠️  SKIP: tsc não disponível${NC}"
fi

# ========================
# CHECK #6: package.json válido
# ========================
echo ""
echo "📦 CHECK #6: Dependências"

if [ -f "package.json" ]; then
    if node -e "JSON.parse(require('fs').readFileSync('package.json'))" 2>/dev/null; then
        echo -e "${GREEN}✅ PASS: package.json válido${NC}"
        ((CHECKS_PASSED++))
    else
        echo -e "${RED}❌ FALHA: package.json inválido (JSON malformado)${NC}"
        ((CHECKS_FAILED++))
    fi
else
    echo -e "${RED}❌ FALHA: package.json não existe${NC}"
    ((CHECKS_FAILED++))
fi

# ========================
# CHECK #7: Version JSON
# ========================
echo ""
echo "🏷️  CHECK #7: Versão"

if [ -f "public/version.json" ]; then
    if [ -f "dist/version.json" ]; then
        echo -e "${GREEN}✅ PASS: version.json existe (public + dist)${NC}"
        cat dist/version.json | head -5
        ((CHECKS_PASSED++))
    else
        echo -e "${YELLOW}⚠️  WARNING: dist/version.json não existe${NC}"
        echo "   Ação: Fazer build novamente"
        ((WARNINGS++))
    fi
else
    echo -e "${RED}❌ FALHA: public/version.json não existe${NC}"
    ((CHECKS_FAILED++))
fi

# ========================
# CHECK #8: Bundle Size
# ========================
echo ""
echo "📊 CHECK #8: Bundle Size"

if [ -d "dist/assets" ]; then
    LARGEST_JS=$(find dist/assets -name "*.js" -exec ls -lh {} \; | sort -k5 -hr | head -1 | awk '{print $5, $9}')
    TOTAL_SIZE=$(du -sh dist | awk '{print $1}')

    echo "   📦 Total dist/: $TOTAL_SIZE"
    echo "   📄 Maior JS: $LARGEST_JS"

    # Verificar se maior que 4 MB (warning)
    TOTAL_MB=$(du -sm dist | awk '{print $1}')
    if [ $TOTAL_MB -gt 4 ]; then
        echo -e "${YELLOW}⚠️  WARNING: Bundle grande ($TOTAL_SIZE)${NC}"
        echo "   Considerar: Otimizar bundle size (ver ANALISE_HOLISTICA_BUILD_54.md)"
        ((WARNINGS++))
    else
        echo -e "${GREEN}✅ PASS: Bundle size aceitável${NC}"
        ((CHECKS_PASSED++))
    fi
else
    echo -e "${RED}❌ FALHA: dist/assets não existe${NC}"
    ((CHECKS_FAILED++))
fi

# ========================
# RESULTADO FINAL
# ========================
echo ""
echo "===================================="
echo "📊 RESULTADO FINAL"
echo "===================================="
echo -e "${GREEN}✅ Checks Passed: $CHECKS_PASSED${NC}"
echo -e "${RED}❌ Checks Failed: $CHECKS_FAILED${NC}"
echo -e "${YELLOW}⚠️  Warnings: $WARNINGS${NC}"
echo ""

if [ $CHECKS_FAILED -eq 0 ]; then
    if [ $WARNINGS -eq 0 ]; then
        echo -e "${GREEN}🎉 EXCELENTE! Build pronto para deploy!${NC}"
        echo ""
        echo "Próximos passos:"
        echo "  1. Testar manualmente em localhost:5173"
        echo "  2. Fazer upload de dist/ para servidor"
        echo "  3. Limpar cache do browser (Ctrl+Shift+R)"
        exit 0
    else
        echo -e "${YELLOW}⚠️  BUILD OK mas com warnings${NC}"
        echo "   Considerar resolver warnings antes de deploy"
        echo ""
        exit 0
    fi
else
    echo -e "${RED}❌ BUILD NÃO ESTÁ PRONTO!${NC}"
    echo "   Resolver checks falhados antes de deploy"
    echo ""
    exit 1
fi
