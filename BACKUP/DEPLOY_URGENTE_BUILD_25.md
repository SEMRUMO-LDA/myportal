# 🚨 DEPLOY URGENTE - BUILD 25

**Data:** 19-03-2026 11:30
**Build:** 25
**Status:** CORREÇÕES CRÍTICAS APLICADAS

---

## 🔧 PROBLEMAS CORRIGIDOS

### ❌ Problema 1: "A carregar base de dados... Aguarde"
**Causa:** O `loading` ficava travado em `true` quando havia erro na query de users
**Solução:** Adicionado `finally` block que SEMPRE desliga o loading
**Ficheiro:** [App.tsx:764-769](App.tsx#L764-L769)

```typescript
} finally {
  // CRITICAL: Always disable loading, even on errors
  // This prevents "A carregar base de dados..." from getting stuck
  setLoading(false);
  setDataReady(true);
}
```

### ❌ Problema 2: "Quando entra não mostra portal e dá erro"
**Causa:** Difícil diagnosticar sem logs
**Solução:** Adicionados logs detalhados no ProtectedRoute
**Ficheiro:** [ProtectedRoute.tsx:14-21](components/ProtectedRoute.tsx#L14-L21)

```typescript
console.log('[ProtectedRoute]', {
    path: location.pathname,
    isAuthenticated,
    isLoading,
    user: user ? { id: user.id, name: user.name, role: user.role } : null,
    allowedRoles
});
```

---

## 📦 DEPLOY IMEDIATO

### Método 1: Upload Direto (RECOMENDADO)
```bash
# 1. Fazer backup do dist/ atual no servidor
mv dist dist_backup_$(date +%Y%m%d_%H%M%S)

# 2. Fazer upload da nova pasta dist/
# (copiar todo o conteúdo da pasta dist/ local para o servidor)

# 3. No browser dos utilizadores:
# Ctrl+Shift+R para forçar reload
```

### Método 2: Via Terminal (se tiver SSH)
```bash
# No seu computador:
cd /Users/tiagopacheco/Desktop/MYPORTAL
tar -czf dist_build25.tar.gz dist/

# Copiar para servidor:
scp dist_build25.tar.gz user@servidor:/path/to/app/

# No servidor:
ssh user@servidor
cd /path/to/app
tar -xzf dist_build25.tar.gz
```

---

## 🧪 TESTE PÓS-DEPLOY

### Teste 1: Verificar Loading
```
1. Abrir app
2. Console (F12) deve mostrar:
   "[App] Starting data fetch..."
3. NÃO deve ficar preso em "A carregar base de dados"
4. ✅ Login deve aparecer rapidamente (< 2s)
```

### Teste 2: Verificar Login
```
1. Inserir ID: 69
2. Inserir PIN: 123456
3. Console deve mostrar:
   "[EmployeeLogin] User found, moving to PIN step"
   "[Login] Colaborador mode - navigating to /portal"
4. ✅ Deve redirecionar para /portal
```

### Teste 3: Verificar Portal
```
1. Após login, Console deve mostrar:
   "[ProtectedRoute] path: /portal, isAuthenticated: true"
2. ✅ Portal deve carregar sem erros
3. ✅ Botão "Entrada" deve estar visível
```

---

## 📊 LOGS ESPERADOS (Console)

### Login Bem-Sucedido
```
[App] Starting data fetch...
[App] Users loaded successfully
[EmployeeLogin] User found, moving to PIN step
[Login] Colaborador mode - navigating to /portal
[ProtectedRoute] { path: "/portal", isAuthenticated: true, user: {...} }
```

### Se houver Erro
```
[App] Starting data fetch...
[App] Error loading data: [erro]
[App] FINALLY block executed - loading disabled
```

---

## 🚨 SE O ERRO PERSISTIR

Execute isto no **Console do browser** (F12):

```javascript
// SCRIPT DE DIAGNÓSTICO COMPLETO
console.clear();
console.log('=== DIAGNÓSTICO BUILD 25 ===\n');

// 1. Verificar versão
const version = localStorage.getItem('app_build_version');
console.log('1. Build version:', version);
console.log('   Expected: 24 or 25');

// 2. Verificar sessão Supabase
const session = await supabase.auth.getSession();
console.log('\n2. Supabase session:', session.data.session ? 'ACTIVE' : 'NONE');

// 3. Verificar users carregados
const users = await supabase.from('users').select('id, name').eq('status', 'ACTIVE').limit(5);
console.log('\n3. Users from DB:', users.data ? users.data.length + ' found' : 'ERROR');
if (users.data) {
  users.data.forEach(u => console.log('   - ID ' + u.id + ': ' + u.name));
}

// 4. Testar login
console.log('\n4. Testing login with ID: 69');
const testUser = users.data?.find(u => u.id === 69);
console.log('   User exists:', testUser ? 'YES - ' + testUser.name : 'NO');

console.log('\n=== FIM DIAGNÓSTICO ===');
```

### Copiar e Enviar Output
Se o erro persistir, copie TODO o output do script acima e envie.

---

## 🔄 ROLLBACK (Se Necessário)

Se o build 25 causar problemas:

```bash
# No servidor:
rm -rf dist
mv dist_backup_TIMESTAMP dist
# (substituir TIMESTAMP pelo backup criado)
```

---

## 📝 CHANGELOG BUILD 25

### Adicionado
- ✅ `finally` block no App.tsx para garantir que loading sempre termina
- ✅ Logs detalhados no ProtectedRoute para debug

### Corrigido
- ✅ Loading infinito quando query de users falha
- ✅ Mensagem "A carregar base de dados" não desaparecia

### Melhorado
- ✅ Logs mais detalhados para diagnóstico em produção
- ✅ Mensagens de erro mais claras

---

## 🎯 PRÓXIMOS PASSOS APÓS DEPLOY

1. **Monitorizar Console** (primeiros 10 min)
   - Verificar se "[App] FINALLY block executed" aparece
   - Confirmar que não há erros vermelhos

2. **Testar com 3 utilizadores diferentes**
   - ID: 1 (Admin)
   - ID: 69 (Colaborador)
   - ID: 3 (Colaborador)

3. **Verificar funcionalidades**
   - ✅ Login funciona?
   - ✅ Portal carrega?
   - ✅ Clock in/out funciona?
   - ✅ Logout funciona?

---

## 💡 DICAS

### Se "A carregar base de dados" ainda aparecer:
```
Significa que a query está falhando.
Verificar:
1. RLS policies do Supabase
2. API Key válida
3. Conectividade com Supabase
```

### Se não redirecionar para /portal:
```
Verificar logs do Console:
[ProtectedRoute] deve mostrar isAuthenticated: true
Se mostrar false, o login não criou sessão
```

### Se portal não carregar:
```
Verificar se currentUser está definido:
[ProtectedRoute] user: {...} deve ter dados
Se for null, AuthContext não resolveu o user
```

---

## 📞 SUPORTE

**Build:** 25
**Ficheiros modificados:**
- [App.tsx](App.tsx) - Linha 764-769
- [ProtectedRoute.tsx](components/ProtectedRoute.tsx) - Linha 14-35

**Testes executados:**
- ✅ Build compila sem erros
- ✅ Supabase conecta
- ✅ Users carregam localmente
- ✅ Login funciona localmente

---

**DEPLOY URGENTE - APLICAR IMEDIATAMENTE**
**Estimativa: 5 minutos para upload + teste**
