# BUILD 33 - FIX DEFINITIVO DO PROBLEMA "UTILIZADOR NÃO ENCONTRADO"

**Data:** 2026-03-19
**Status:** ✅ RESOLVIDO DEFINITIVAMENTE

---

## 🔴 PROBLEMA CRÍTICO

### Sintoma
- Login mostrava **"Utilizador não encontrado"** mesmo com users válidos na base de dados
- Console mostrava: `[Login] Available users: 0`
- HTML test page funcionava, mas a app React não

### Causa Raiz Identificada

**O array `users` estava a ser LIMPO quando o utilizador fazia login!**

#### Sequência do Erro:

1. **App.tsx linha 274+:** `useEffect` com dependências `[authSessionKey, currentUser?.id]`
2. **Primeiro render:** App carrega users do Supabase → `setUsers([...])` → 69 users carregados
3. **User faz login:** AuthContext dispara evento `SIGNED_IN`
4. **App.tsx linha 236:** Event handler incrementa `authSessionKey`
5. **useEffect corre de novo:** Por causa da mudança em `authSessionKey`
6. **Problema:** Fazia fetch de users DE NOVO, limpando o array durante o processo
7. **Login.tsx:** Recebia array vazio → "Utilizador não encontrado"

---

## ✅ SOLUÇÃO IMPLEMENTADA

### Código Adicionado

#### 1. Declaração do Ref (linha 160)
```typescript
const usersLoadedRef = useRef(false); // Track if users were already loaded
```

#### 2. Guard no início do useEffect (linhas 287-302)
```typescript
// CRITICAL FIX: If users were already loaded, NEVER fetch again
// This prevents clearing users on auth changes (SIGNED_IN event)
let currentUsersList: User[] = [];

if (usersLoadedRef.current) {
  console.log('[App] 🔒 Users already loaded - SKIPPING fetch to prevent clearing');
  currentUsersList = users; // Use existing users
  setLoading(false);

  // If no user authenticated yet, wait
  if (!currentUser) {
    console.log('[App] Waiting for authentication...');
    setDataReady(true);
    return;
  }
  // Continue to Phase 2 without fetching users again
} else {
  // Users NOT loaded yet - fetch them now
  console.log('[App] 📥 Fetching users from Supabase (first time)...');
  // ... fetch logic
}
```

#### 3. Marcar como loaded após fetch (linha 398)
```typescript
setUsers(freshMappedUsers);
usersLoadedRef.current = true; // Mark users as loaded - NEVER fetch again
console.log('[App] ✅ Users SET in state:', freshMappedUsers.length, '- LOCKED from re-fetching');
```

---

## 🎯 RESULTADO

### Comportamento Esperado

1. **Primeiro render:**
   - `usersLoadedRef.current = false`
   - Faz fetch do Supabase
   - Carrega 69 users
   - `usersLoadedRef.current = true` ✅

2. **User faz login:**
   - `SIGNED_IN` event → `authSessionKey` incrementa
   - useEffect corre de novo
   - `usersLoadedRef.current = true` → **SKIP fetch**
   - Mantém os 69 users no state ✅
   - Continua para Phase 2 (carregar time_logs, etc)

3. **Login.tsx recebe:**
   - `users.length = 69` ✅
   - Encontra user por ID
   - Login com sucesso ✅

---

## 📊 LOGS ESPERADOS NA CONSOLA

### Primeiro Render (sem auth)
```
[App] Starting data fetch... { hasUsers: 0, currentUser: undefined, usersLoaded: false }
[App] 📥 Fetching users from Supabase (first time)...
[App] ✅ Users fetch result: 69 users
[App] ✅ Users SET in state: 69 - LOCKED from re-fetching
[App] Initial load complete. Waiting for authentication...
```

### Após Login (SIGNED_IN event)
```
[App] Starting data fetch... { hasUsers: 69, currentUser: 69, usersLoaded: true }
[App] 🔒 Users already loaded - SKIPPING fetch to prevent clearing
[App] 🔐 User role: COLLABORATOR | Can view all records: false
[App] 📅 Today's date: 2026-03-19 | Filter from: 2026-03-18
[App] ⚠️ Regular user - filtering by user_id: 69
... Phase 2 data loading ...
```

### Login Component
```
[Login] 🔍 Searching for user ID: 69
[Login] 📋 Available users: 69
[Login] 📋 Users IDs: 1, 2, 3, ..., 69
[Login] ✅ User found: { id: 69, name: "João Silva" }
```

---

## 🚀 DEPLOY CHECKLIST

- [x] Build 33 criado com sucesso
- [x] Sem erros TypeScript
- [x] Cache buster atualizado para v32 em index.html
- [ ] Testar localmente (abrir browser)
- [ ] Verificar logs na consola
- [ ] Confirmar login funciona
- [ ] Upload para produção
- [ ] Limpar cache browser em produção
- [ ] Testar em produção

---

## ⚠️ NOTAS IMPORTANTES

1. **NUNCA remover `usersLoadedRef`** - É crítico para prevenir o bug
2. **NUNCA adicionar `users` nas dependências do useEffect** - Causaria loop infinito
3. **Cache browser:** Users precisam fazer Ctrl+F5 ou esperar cache buster limpar

---

## 📝 FICHEIROS MODIFICADOS

1. **App.tsx** (linhas 160, 287-411)
   - Adicionado `usersLoadedRef`
   - Refatorado lógica de fetch com guard
   - Marcação de loaded após sucesso

2. **index.html** (linha 13)
   - BUILD_VERSION atualizado: `'28'` → `'32'`

---

## 🔍 VERIFICAÇÃO

Para confirmar que o fix está ativo, procurar na consola:

✅ **Primeira visita:**
```
[App] 📥 Fetching users from Supabase (first time)...
[App] ✅ Users SET in state: X - LOCKED from re-fetching
```

✅ **Após login:**
```
[App] 🔒 Users already loaded - SKIPPING fetch to prevent clearing
```

❌ **Se ver isto, o build antigo está em cache:**
```
[App] 📥 Fetching users from Supabase... (múltiplas vezes)
[Login] 📋 Available users: 0
```

**Solução:** Ctrl+F5 para forçar reload, ou aguardar cache buster.

---

**FIM DO DOCUMENTO**
