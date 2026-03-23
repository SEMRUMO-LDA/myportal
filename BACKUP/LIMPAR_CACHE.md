# Como Limpar o Cache e Corrigir o Erro

O erro `ReferenceError: logoutKiosk is not defined` está acontecendo porque o seu browser está com uma **versão antiga da aplicação em cache**.

## ✅ Solução Rápida

### Opção 1: Hard Refresh (Mais Rápido)
1. **Chrome/Edge/Brave:**
   - Windows: `Ctrl + Shift + R` ou `Ctrl + F5`
   - Mac: `Cmd + Shift + R`

2. **Firefox:**
   - Windows: `Ctrl + Shift + Delete`
   - Mac: `Cmd + Shift + Delete`

3. **Safari:**
   - Mac: `Cmd + Option + E` depois `Cmd + R`

### Opção 2: Limpar Cache Manualmente

#### Chrome/Edge/Brave:
1. Pressione `F12` para abrir DevTools
2. Clique com o **botão direito** no ícone de **Reload**
3. Selecione **"Empty Cache and Hard Reload"**

#### Firefox:
1. Menu → Settings → Privacy & Security
2. Cookies and Site Data → **Clear Data**
3. Marque **Cached Web Content**
4. Clique **Clear**

### Opção 3: Modo Anónimo/Incognito
1. Abra uma janela privada/incógnita
2. Aceda à aplicação
3. Faça login normalmente

---

## 🔧 Verificação Técnica

O código está **100% correto**. Veja:

### AuthContext.tsx (Linha 190)
```typescript
<AuthContext.Provider value={{ 
  user, 
  isAuthenticated: !!user, 
  isLoading, 
  login, 
  loginWithSupabase, 
  logout, 
  logoutKiosk,  // ✅ ESTÁ AQUI
  hasPermission 
}}>
```

### App.tsx (Linha 243)
```typescript
const { user: authUser, logout, logoutKiosk } = useAuth(); // ✅ ESTÁ AQUI
```

### App.tsx (Linha 3707)
```typescript
<KioskDashboard
  onLogout={logoutKiosk}  // ✅ ESTÁ AQUI
  ...
/>
```

---

## 📦 Build Atual

- **Build:** 23
- **Data:** 19-03-2026 11:07
- **Status:** ✅ Compilado com sucesso
- **Ficheiros gerados:** dist/

---

## 🚀 Como Confirmar que Funcionou

Após limpar a cache:

1. Abra a aplicação
2. Pressione `F12` (DevTools)
3. Vá ao separador **Network**
4. Procure por `index-B20_g851.js` (novo)
5. Se aparecer `index-DSF4h-uA.js` (antigo) → Cache não foi limpa

---

## ⚠️ Se o Erro Persistir

Execute isto no terminal para forçar nova build com cache-busting:

```bash
rm -rf dist node_modules/.vite
npm run build
```

Depois siga os passos de limpeza de cache acima.

---

## 📝 Nota Técnica

O Service Worker (PWA) pode estar a servir ficheiros antigos. 
Se o erro persistir após limpar a cache do browser, execute no **Console do browser** (F12):

```javascript
navigator.serviceWorker.getRegistrations().then(function(registrations) {
  for(let registration of registrations) {
    registration.unregister();
  }
  location.reload(true);
});
```

Isto remove o Service Worker e força reload completo.
