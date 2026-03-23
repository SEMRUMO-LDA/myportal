#!/bin/bash

echo "=========================================="
echo "DIAGNOSTICO PRODUCAO - EMERGENCIA"
echo "=========================================="

echo ""
echo "1. VERIFICAR BUILD ATUAL"
ls -lh dist/index.html 2>/dev/null && echo "   OK - dist/index.html existe" || echo "   ERRO - dist/index.html NAO existe"

echo ""
echo "2. VERIFICAR CACHE BUSTER"
if grep -q "BUILD_VERSION" dist/index.html 2>/dev/null; then
  echo "   OK - Cache buster presente"
  grep "BUILD_VERSION" dist/index.html | head -1
else
  echo "   AVISO - Cache buster nao encontrado"
fi

echo ""
echo "3. VERIFICAR IMPORTS CRITICOS"
echo "   AuthContext:"
grep -c "logoutKiosk" context/AuthContext.tsx 2>/dev/null && echo "      OK - logoutKiosk encontrado" || echo "      ERRO"

echo ""
echo "4. LISTAR FICHEIROS DIST (principais)"
ls -lh dist/assets/*.js 2>/dev/null | tail -5

echo ""
echo "5. VERIFICAR TAMANHO DO BUILD"
du -sh dist/ 2>/dev/null

echo ""
echo "=========================================="
echo "AGUARDANDO MAIS INFORMACOES DO ERRO..."
echo "=========================================="
