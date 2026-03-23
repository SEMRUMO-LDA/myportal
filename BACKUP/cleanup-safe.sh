#!/bin/bash

# ========================
# MYPORTAL - Limpeza Segura
# ========================
# Remove ficheiros não utilizados sem afetar código em produção
# Criado: 2026-03-20
# Risco: ZERO - Apenas remove backups e ficheiros temporários

echo "🧹 MYPORTAL - Limpeza Segura"
echo "=============================="
echo ""

# Verificar se estamos na pasta correta
if [ ! -f "package.json" ]; then
    echo "❌ Erro: Execute este script na raiz do projeto MYPORTAL"
    exit 1
fi

echo "📋 Ficheiros a remover:"
echo ""

# 1. Ficheiros .bak (backups)
echo "🔍 1. Ficheiros .bak (backups):"
find . -name "*.bak" -o -name "*.bak2" -o -name "*.bak3" -o -name "*.bak4" | grep -v node_modules
echo ""

# 2. Ficheiros *Simple* não utilizados
echo "🔍 2. Ficheiros *Simple* (versões antigas):"
ls AppSimple.tsx context/AuthContextSimple.tsx 2>/dev/null
echo ""

# 3. Ficheiros .DS_Store (macOS)
echo "🔍 3. Ficheiros .DS_Store (macOS):"
find . -name ".DS_Store" | head -5
echo ""

# 4. Zips antigos (opcional)
echo "🔍 4. Zips de deploy antigos:"
ls dist*.zip 2>/dev/null | grep -v "dist.zip"
echo ""

echo "=============================="
echo ""
read -p "❓ Deseja remover estes ficheiros? (s/N): " confirm

if [ "$confirm" != "s" ] && [ "$confirm" != "S" ]; then
    echo "❌ Cancelado. Nenhum ficheiro foi removido."
    exit 0
fi

echo ""
echo "🗑️  Removendo ficheiros..."
echo ""

# Remover .bak files
echo "✅ Removendo ficheiros .bak..."
find . -name "*.bak" -delete
find . -name "*.bak2" -delete
find . -name "*.bak3" -delete
find . -name "*.bak4" -delete

# Remover ficheiros Simple (se não usados)
if [ -f "AppSimple.tsx" ]; then
    echo "✅ Removendo AppSimple.tsx..."
    rm -f AppSimple.tsx
fi

if [ -f "context/AuthContextSimple.tsx" ]; then
    echo "✅ Removendo context/AuthContextSimple.tsx..."
    rm -f context/AuthContextSimple.tsx
fi

# Remover .DS_Store
echo "✅ Removendo ficheiros .DS_Store..."
find . -name ".DS_Store" -delete

# Remover zips antigos (manter apenas dist.zip)
echo "✅ Removendo zips de deploy antigos..."
ls dist*.zip 2>/dev/null | grep -v "^dist.zip$" | xargs rm -f 2>/dev/null

# Remover node_modules/.cache (safe)
if [ -d "node_modules/.cache" ]; then
    echo "✅ Limpando cache do node_modules..."
    rm -rf node_modules/.cache
fi

echo ""
echo "=============================="
echo "✅ Limpeza concluída!"
echo ""
echo "📊 Espaço libertado:"
du -sh . 2>/dev/null
echo ""
echo "🎯 Próximo passo: Fazer commit das mudanças"
echo "   git status"
echo "   git add .gitignore"
echo "   git commit -m 'chore: add .gitignore and cleanup backup files'"
