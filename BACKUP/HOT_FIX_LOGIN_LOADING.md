# 🔥 HOT FIX: Login "A carregar..." Infinito

**Problema identificado**: Login.tsx fica stuck porque `users` array está vazio.

**Causa**: App.tsx não está a passar users para Login.tsx (possível issue RLS ou query).

---

## ✅ SOLUÇÃO RÁPIDA (5 MIN)

### Opção A: Timeout Automático (Mais Seguro)

Adicionar timeout que permite login mesmo sem users carregados:

```typescript
// Login.tsx - Adicionar após linha 22

const [localUsers, setLocalUsers] = useState<UserType[]>([]);
const [loadTimeout, setLoadTimeout] = useState(false);

useEffect(() => {
  // Se users não carregaram em 5s, permitir login na mesma
  const timer = setTimeout(() => {
    if (users.length === 0) {
      console.warn('[Login] Users não carregaram em 5s, permitindo login direto');
      setLoadTimeout(true);
    }
  }, 5000);

  return () => clearTimeout(timer);
}, [users]);

// Depois, na linha 1045, mudar:
// ANTES:
{(users.length === 0 && localUsers.length === 0) ? (

// DEPOIS:
{(users.length === 0 && localUsers.length === 0 && !loadTimeout) ? (
```

### Opção B: Fetch Direto no Login (Mais Robusto)

Fazer Login buscar users diretamente, sem depender do App.tsx:

```typescript
// Login.tsx - Adicionar após linha 22

const [localUsers, setLocalUsers] = useState<UserType[]>([]);
const [loadingLocalUsers, setLoadingLocalUsers] = useState(false);

useEffect(() => {
  // Se App.tsx não passou users, buscar localmente
  if (users.length === 0 && !loadingLocalUsers) {
    console.log('[Login] Fetching users locally...');
    setLoadingLocalUsers(true);

    supabase
      .from('users')
      .select('id, name, email, pin, role, status, auth_id, requires_new_pin')
      .eq('status', 'ACTIVE')
      .then(({ data, error }) => {
        if (error) {
          console.error('[Login] Failed to fetch users:', error);
        } else if (data) {
          console.log(`[Login] Loaded ${data.length} users locally`);
          setLocalUsers(data as UserType[]);
        }
        setLoadingLocalUsers(false);
      });
  } else if (users.length > 0) {
    // Se App.tsx passou users, usar esses
    setLocalUsers(users);
  }
}, [users, loadingLocalUsers]);

// Depois, usar localUsers em vez de users
// Na linha 1045:
{(localUsers.length === 0 && loadingLocalUsers) ? (
```

---

## 🚀 IMPLEMENTAÇÃO URGENTE

Como não queres arriscar, vou fazer a **Opção A** (timeout) que é mais segura:
