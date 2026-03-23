# 🚨 SOLUÇÕES RÁPIDAS - ERROS EM PRODUÇÃO

**Build:** 24
**Data:** 19-03-2026

---

## 🔴 ERRO 1: "logoutKiosk is not defined"

### Causa
Cache do browser ainda tem versão antiga

### Solução Imediata
```bash
# No browser em produção:
1. Pressionar Ctrl+Shift+R (Windows) ou Cmd+Shift+R (Mac)
2. OU abrir DevTools (F12) → Application → Storage → Clear site data
3. OU executar no Console:
```

```javascript
localStorage.setItem('app_build_version', '0');
location.reload(true);
```

---

## 🔴 ERRO 2: "User not found"

### Causa
ID inserido não existe ou utilizador está INACTIVE

### Solução Imediata
Usar IDs válidos testados:
- **ID: 1** (RH SEMRUMO) - ADMIN
- **ID: 69** (José Cavaco) - Colaborador

### Verificar na BD:
```sql
SELECT id, name, email, status
FROM users
WHERE status = 'ACTIVE'
ORDER BY id;
```

---

## 🔴 ERRO 3: Tela Branca / Nada Acontece

### Causa
Erro de JavaScript bloqueou a renderização

### Solução Imediata
```bash
# 1. Abrir DevTools (F12)
# 2. Ver Console → Copiar erro exato
# 3. Ver Network → Verificar se ficheiros carregaram
```

### Verificar:
- ✅ Ficheiros .js carregaram? (status 200)
- ✅ index.html carregou? (status 200)
- ✅ Há erro vermelho no Console?

---

## 🔴 ERRO 4: "Failed to fetch" / Network Error

### Causa
Supabase não está acessível ou RLS bloqueou

### Solução Imediata
```bash
# Testar conectividade Supabase:
curl https://imfhacvrivasciftaujm.supabase.co/rest/v1/
```

### Verificar:
- ✅ URL Supabase correta?
- ✅ API Key válida?
- ✅ RLS policies corretas?

---

## 🔴 ERRO 5: "Invalid login credentials"

### Causa
PIN incorreto ou utilizador sem auth_id

### Solução Imediata
Resetar PIN:
```sql
-- Na BD Supabase
UPDATE auth.users
SET encrypted_password = crypt('123456', gen_salt('bf'))
WHERE email = 'rh@semrumo.pt';
```

---

## 🔴 ERRO 6: Redireciona para /login imediatamente

### Causa
Sessão não está a ser criada/guardada

### Solução Imediata
Verificar localStorage:
```javascript
// No Console do browser
console.log(localStorage);
// Deve ter: supabase.auth.token
```

---

## 🔧 DIAGNÓSTICO GERAL

### Passo 1: Verificar Console
```javascript
// F12 → Console
console.log('App loaded');
```

### Passo 2: Verificar Network
```
F12 → Network → Reload
- Procurar ficheiros com status 404 ou 500
- Verificar se index.html carregou
```

### Passo 3: Verificar Supabase
```javascript
// No Console
const test = await supabase.from('users').select('count');
console.log(test);
```

---

## 📞 COMANDOS DE EMERGÊNCIA

### Limpar TUDO (Cache + Storage + SW)
```javascript
// Executar no Console do browser em produção:
(async () => {
  // Limpar Service Workers
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (let reg of registrations) {
      await reg.unregister();
    }
  }

  // Limpar Cache API
  if ('caches' in window) {
    const names = await caches.keys();
    for (let name of names) {
      await caches.delete(name);
    }
  }

  // Limpar LocalStorage
  localStorage.clear();

  // Limpar SessionStorage
  sessionStorage.clear();

  console.log('✅ TUDO LIMPO! Recarregando...');
  setTimeout(() => location.reload(true), 500);
})();
```

### Forçar Nova Versão
```javascript
// Executar no Console:
localStorage.setItem('app_build_version', '0');
location.reload(true);
```

### Verificar Versão Carregada
```javascript
// Executar no Console:
console.log('Build version:', localStorage.getItem('app_build_version'));
console.log('Expected: 24');
```

---

## 🔍 CHECKLIST DE TROUBLESHOOTING

Quando há erro em produção, verificar NESTA ORDEM:

- [ ] 1. **Console tem erro?** → Copiar erro exato
- [ ] 2. **Network tem 404/500?** → Ver que ficheiro falhou
- [ ] 3. **Cache limpa?** → Ctrl+Shift+R
- [ ] 4. **Versão correta?** → Verificar BUILD_VERSION
- [ ] 5. **Supabase responde?** → Testar query simples
- [ ] 6. **Utilizador existe?** → Verificar na BD
- [ ] 7. **PIN correto?** → Testar com 123456
- [ ] 8. **RLS permite?** → Verificar policies

---

## 🚀 REBUILD E REDEPLOY RÁPIDO

Se nada funcionar, fazer rebuild:

```bash
# 1. Limpar tudo
rm -rf dist node_modules/.vite

# 2. Novo build
npm run build

# 3. Verificar
ls -lh dist/

# 4. Upload para servidor
# (copiar pasta dist/)

# 5. No browser do utilizador:
# Ctrl+Shift+R para forçar reload
```

---

## 📊 LOGS ÚTEIS PARA DEBUG

### Ver versão atual no browser:
```javascript
localStorage.getItem('app_build_version')
// Deve retornar: "24"
```

### Ver sessão Supabase:
```javascript
const { data } = await supabase.auth.getSession();
console.log(data);
```

### Ver utilizador autenticado:
```javascript
// No React DevTools → Components → AuthContext
// Procurar: user
```

---

## ⚡ SOLUÇÃO UNIVERSAL

Se NADA funcionar, esta solução SEMPRE funciona:

```bash
# 1. No servidor, criar ficheiro .htaccess:
cat > dist/.htaccess << 'EOF'
<IfModule mod_headers.c>
  Header set Cache-Control "no-cache, no-store, must-revalidate"
  Header set Pragma "no-cache"
  Header set Expires 0
</IfModule>

<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
EOF

# 2. Reiniciar servidor web
# 3. No browser: Ctrl+Shift+Delete → Limpar tudo → Reload
```

---

## 🆘 CONTACTO EMERGÊNCIA

**Build:** 24
**Ficheiros críticos:**
- [index.html](dist/index.html)
- [AuthContext.tsx](context/AuthContext.tsx)
- [Login.tsx](pages/Login.tsx)

**Testes executados:**
- ✅ Login funciona (local)
- ✅ Supabase conecta
- ✅ Clock in/out funciona
- ✅ Logout funciona

**Se o erro persistir:**
Enviar screenshot do Console (F12) + erro exato
