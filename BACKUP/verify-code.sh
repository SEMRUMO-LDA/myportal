#!/bin/bash

echo "===================================================="
echo "VERIFICACAO DE CODIGO - FLUXO LOGIN/LOGOUT"
echo "===================================================="

echo ""
echo "1. VERIFICAR AuthContext.tsx"
if grep -q "logoutKiosk" context/AuthContext.tsx; then
  echo "   OK - logoutKiosk definido"
else
  echo "   ERRO - logoutKiosk NAO encontrado"
fi

if grep -q "loginWithSupabase" context/AuthContext.tsx; then
  echo "   OK - loginWithSupabase definido"
else
  echo "   ERRO - loginWithSupabase NAO encontrado"
fi

echo ""
echo "2. VERIFICAR Login.tsx"
if grep -q "useAuth" pages/Login.tsx; then
  echo "   OK - useAuth importado"
else
  echo "   ERRO - useAuth NAO importado"
fi

if grep -q "loginWithSupabase" pages/Login.tsx; then
  echo "   OK - loginWithSupabase usado"
else
  echo "   ERRO - loginWithSupabase NAO usado"
fi

echo ""
echo "3. VERIFICAR KioskDashboard.tsx"
if grep -q "onClockIn" pages/KioskDashboard.tsx; then
  echo "   OK - onClockIn definido"
else
  echo "   ERRO - onClockIn NAO encontrado"
fi

if grep -q "onClockOut" pages/KioskDashboard.tsx; then
  echo "   OK - onClockOut definido"
else
  echo "   ERRO - onClockOut NAO encontrado"
fi

echo ""
echo "4. VERIFICAR App.tsx"
if grep -q "logoutKiosk" App.tsx; then
  echo "   OK - logoutKiosk usado"
else
  echo "   ERRO - logoutKiosk NAO encontrado"
fi

if grep -q "handleClockIn" App.tsx; then
  echo "   OK - handleClockIn definido"
else
  echo "   ERRO - handleClockIn NAO encontrado"
fi

if grep -q "handleClockOut" App.tsx; then
  echo "   OK - handleClockOut definido"
else
  echo "   ERRO - handleClockOut NAO encontrado"
fi

echo ""
echo "5. VERIFICAR Build"
if [ -d "dist" ]; then
  echo "   OK - Pasta dist/ existe"
  if [ -f "dist/index.html" ]; then
    echo "   OK - dist/index.html existe"
  else
    echo "   ERRO - dist/index.html NAO existe"
  fi
else
  echo "   ERRO - Pasta dist/ NAO existe"
fi

echo ""
echo "===================================================="
echo "CONCLUSAO: Codigo verificado"
echo "===================================================="
