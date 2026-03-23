# 🔐 Plano de Migração: Supabase Auth Integration

**Objetivo:** Migrar sistema de autenticação custom (PIN) para Supabase Auth mantendo UX atual
**Tempo Estimado:** 2-3 dias
**Complexidade:** Média-Alta
**Risco:** Médio (requer testes extensivos)

---

## 🎯 Visão Geral

### Estado Atual
```typescript
// Login custom com PIN
const user = await supabase
  .from('users')
  .select('*')
  .eq('pin', userPin)
  .single();

// ❌ Problemas:
// - PIN em plaintext ou mal encriptado
// - Sem sessões seguras
// - RLS não funciona (auth.uid() = null)
// - Sem auditoria de logins
```

### Estado Futuro
```typescript
// Login integrado com Supabase Auth
const { data, error } = await supabase.auth.signInWithPassword({
  email: `user${userId}@myportal.internal`, // Email virtual
  password: userPin // PIN como password
});

// ✅ Vantagens:
// - auth.uid() disponível
// - RLS funciona nativamente
// - Sessões JWT seguras
// - Auditoria automática
// - 2FA possível no futuro
```

---

## 📋 Arquitetura Proposta

### 1. Estrutura de Dados

#### Tabela `users` (atualizada)
```sql
ALTER TABLE users ADD COLUMN auth_id UUID UNIQUE;
ALTER TABLE users ADD COLUMN email VARCHAR(255) UNIQUE;

-- Constraint para garantir integridade
ALTER TABLE users
  ADD CONSTRAINT fk_users_auth
  FOREIGN KEY (auth_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- Index para performance
CREATE INDEX idx_users_auth_id ON users(auth_id);
```

#### Tabela `auth.users` (Supabase nativa)
```
auth.users
├── id (UUID) → users.auth_id
├── email (string) → "user123@myportal.internal"
├── encrypted_password (hash do PIN)
├── created_at
├── last_sign_in_at
└── raw_user_meta_data (JSON com user_id numérico)
```

---

## 🛠️ Plano de Implementação

### **FASE 1: Preparação (4 horas)**

#### 1.1 Backup Completo
```bash
# Backup da BD
pg_dump $DATABASE_URL > backup_pre_auth_migration.sql

# Backup do código
git tag -a v1.0-pre-auth-migration -m "Before Supabase Auth migration"
git push --tags
```

#### 1.2 Atualizar Schema
```sql
-- migrations/001_add_auth_columns.sql

BEGIN;

-- Adicionar colunas
ALTER TABLE users
  ADD COLUMN auth_id UUID UNIQUE,
  ADD COLUMN email VARCHAR(255) UNIQUE;

-- Gerar emails virtuais para users existentes
UPDATE users
SET email = 'user' || id || '@myportal.internal'
WHERE email IS NULL;

-- Tornar email obrigatório
ALTER TABLE users ALTER COLUMN email SET NOT NULL;

COMMIT;
```

#### 1.3 Criar Função de Migração
```sql
-- migrations/002_create_auth_users.sql

CREATE OR REPLACE FUNCTION migrate_user_to_auth(
  p_user_id INTEGER,
  p_pin TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_auth_id UUID;
  v_email TEXT;
BEGIN
  -- Obter email do user
  SELECT email INTO v_email
  FROM users
  WHERE id = p_user_id;

  -- Criar user no Supabase Auth
  -- Nota: Isto precisa ser feito via API, não SQL direto
  -- Esta função é um placeholder para lógica TypeScript

  RETURN v_auth_id;
END;
$$;
```

---

### **FASE 2: Script de Migração (6 horas)**

#### 2.1 Criar Script de Migração TypeScript

```typescript
// scripts/migrate-users-to-auth.ts

import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!; // Service role key

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

interface AppUser {
  id: number;
  name: string;
  email: string;
  pin?: string;
  auth_id?: string;
}

async function migrateUsers() {
  console.log('🚀 Starting user migration to Supabase Auth...');

  // 1. Buscar todos os users que ainda não têm auth_id
  const { data: users, error: fetchError } = await supabaseAdmin
    .from('users')
    .select('id, name, email, pin')
    .is('auth_id', null);

  if (fetchError) {
    console.error('❌ Error fetching users:', fetchError);
    return;
  }

  console.log(`📊 Found ${users.length} users to migrate`);

  let successCount = 0;
  let errorCount = 0;

  // 2. Criar auth user para cada app user
  for (const user of users) {
    try {
      console.log(`\n🔄 Migrating user ${user.id}: ${user.name}...`);

      // Gerar password temporário se PIN não existir
      const password = user.pin || generateTemporaryPassword();

      // Criar user no Supabase Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: password,
        email_confirm: true, // Auto-confirmar email
        user_metadata: {
          app_user_id: user.id,
          name: user.name,
          migrated_at: new Date().toISOString()
        }
      });

      if (authError) {
        console.error(`❌ Error creating auth user for ${user.id}:`, authError);
        errorCount++;
        continue;
      }

      console.log(`✅ Auth user created: ${authData.user.id}`);

      // 3. Atualizar app user com auth_id
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({ auth_id: authData.user.id })
        .eq('id', user.id);

      if (updateError) {
        console.error(`❌ Error updating user ${user.id}:`, updateError);
        errorCount++;
        continue;
      }

      console.log(`✅ User ${user.id} migrated successfully`);
      successCount++;

    } catch (err) {
      console.error(`❌ Unexpected error for user ${user.id}:`, err);
      errorCount++;
    }
  }

  console.log('\n📊 Migration Summary:');
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📈 Total: ${users.length}`);
}

function generateTemporaryPassword(): string {
  // Gerar password temporário seguro
  return createHash('sha256')
    .update(Math.random().toString())
    .digest('hex')
    .substring(0, 16);
}

// Executar migração
migrateUsers()
  .then(() => {
    console.log('✅ Migration completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  });
```

#### 2.2 Executar Migração

```bash
# 1. Adicionar Service Role Key ao .env
echo "SUPABASE_SERVICE_KEY=your-service-role-key" >> .env.local

# 2. Instalar dependências
npm install

# 3. Compilar script
npx tsx scripts/migrate-users-to-auth.ts

# 4. Verificar resultados
# Todos os users devem ter auth_id preenchido
```

---

### **FASE 3: Atualizar Código da Aplicação (8 horas)**

#### 3.1 Atualizar AuthContext

```typescript
// context/AuthContext.tsx

import { createContext, useContext, useEffect, useState } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
import { User as AppUser } from '../types';

interface AuthContextType {
  session: Session | null;
  user: AppUser | null;
  supabaseUser: SupabaseUser | null;
  loading: boolean;
  signInWithPin: (pin: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  // 1. Inicializar sessão ao carregar
  useEffect(() => {
    // Verificar sessão existente
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setSupabaseUser(session?.user ?? null);

      if (session?.user) {
        loadAppUser(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listener para mudanças de auth
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setSupabaseUser(session?.user ?? null);

      if (session?.user) {
        loadAppUser(session.user.id);
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Carregar dados do app user
  async function loadAppUser(authId: string) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', authId)
        .single();

      if (error) throw error;
      setUser(data);
    } catch (err) {
      console.error('Error loading app user:', err);
    } finally {
      setLoading(false);
    }
  }

  // 3. Login com PIN
  async function signInWithPin(pin: string) {
    // Buscar email do user pelo PIN (temporário durante migração)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('email')
      .eq('pin', pin)
      .single();

    if (userError || !userData) {
      throw new Error('PIN inválido');
    }

    // Autenticar via Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email: userData.email,
      password: pin, // PIN usado como password
    });

    if (error) throw error;

    // User será carregado automaticamente via onAuthStateChange
  }

  // 4. Logout
  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        supabaseUser,
        loading,
        signInWithPin,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

#### 3.2 Atualizar Página de Login

```typescript
// pages/Login.tsx

export default function Login() {
  const { signInWithPin } = useAuth();
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await signInWithPin(pin);
      // Redirect acontece automaticamente via AuthContext
    } catch (err) {
      setError('PIN inválido. Tente novamente.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="password"
          placeholder="Digite seu PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          maxLength={4}
          pattern="[0-9]{4}"
          disabled={loading}
        />

        {error && <p className="text-red-600">{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? 'Autenticando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
```

#### 3.3 Atualizar App.tsx

```typescript
// App.tsx

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/*"
          element={
            <ProtectedRoute>
              {/* Rotas protegidas aqui */}
            </ProtectedRoute>
          }
        />
      </Routes>
    </HashRouter>
  );
}
```

---

### **FASE 4: Implementar RLS Corretamente (4 horas)**

#### 4.1 Policies com Auth Correto

```sql
-- migrations/003_rls_with_auth.sql

BEGIN;

-- ============================================================================
-- USERS TABLE
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users vêem o próprio perfil
CREATE POLICY "users_select_own" ON users
    FOR SELECT
    TO authenticated
    USING (auth.uid() = auth_id);

-- Admins vêem tudo
CREATE POLICY "users_select_admin" ON users
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE auth_id = auth.uid()
            AND role IN ('ADMIN', 'RH')
        )
    );

-- Users atualizam próprio perfil (campos limitados)
CREATE POLICY "users_update_own" ON users
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = auth_id)
    WITH CHECK (auth.uid() = auth_id);

-- Admins atualizam qualquer user
CREATE POLICY "users_update_admin" ON users
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE auth_id = auth.uid()
            AND role IN ('ADMIN', 'RH')
        )
    );

-- ============================================================================
-- TIME_LOGS TABLE
-- ============================================================================

ALTER TABLE time_logs ENABLE ROW LEVEL SECURITY;

-- Criar view helper para obter user_id do auth
CREATE OR REPLACE FUNCTION auth_user_id()
RETURNS INTEGER
LANGUAGE SQL
STABLE
AS $$
    SELECT id FROM users WHERE auth_id = auth.uid();
$$;

-- Users vêem próprios logs
CREATE POLICY "time_logs_select_own" ON time_logs
    FOR SELECT
    TO authenticated
    USING (user_id = auth_user_id());

-- Admins vêem todos
CREATE POLICY "time_logs_select_admin" ON time_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE auth_id = auth.uid()
            AND role IN ('ADMIN', 'RH')
        )
    );

-- Users inserem próprios logs
CREATE POLICY "time_logs_insert_own" ON time_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth_user_id());

-- Users atualizam próprios logs
CREATE POLICY "time_logs_update_own" ON time_logs
    FOR UPDATE
    TO authenticated
    USING (user_id = auth_user_id())
    WITH CHECK (user_id = auth_user_id());

-- ============================================================================
-- ANOMALIES TABLE
-- ============================================================================

ALTER TABLE anomalies ENABLE ROW LEVEL SECURITY;

-- Users vêem próprias anomalias
CREATE POLICY "anomalies_select_own" ON anomalies
    FOR SELECT
    TO authenticated
    USING (user_id = auth_user_id());

-- Admins vêem todas
CREATE POLICY "anomalies_select_admin" ON anomalies
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE auth_id = auth.uid()
            AND role IN ('ADMIN', 'RH')
        )
    );

-- Users atualizam próprias (apenas status limitados)
CREATE POLICY "anomalies_update_own" ON anomalies
    FOR UPDATE
    TO authenticated
    USING (user_id = auth_user_id())
    WITH CHECK (
        user_id = auth_user_id()
        AND status IN ('AWAITING_JUSTIFICATION', 'JUSTIFIED_PENDING_REVIEW')
    );

-- Admins atualizam todas
CREATE POLICY "anomalies_update_admin" ON anomalies
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE auth_id = auth.uid()
            AND role IN ('ADMIN', 'RH')
        )
    );

COMMIT;
```

#### 4.2 Aplicar Policies às Restantes Tabelas

```sql
-- Repetir padrão similar para:
-- - internal_messages
-- - expenses
-- - leaves
-- - trips
-- - hour_bank_adjustments
```

---

### **FASE 5: Testes (6 horas)**

#### 5.1 Testes Unitários

```typescript
// tests/auth.test.ts

import { describe, it, expect } from 'vitest';
import { supabase } from '../services/supabaseClient';

describe('Supabase Auth Integration', () => {
  it('should sign in with valid PIN', async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'user1@myportal.internal',
      password: '1234', // PIN de teste
    });

    expect(error).toBeNull();
    expect(data.user).toBeDefined();
    expect(data.session).toBeDefined();
  });

  it('should fail with invalid PIN', async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'user1@myportal.internal',
      password: '9999',
    });

    expect(error).toBeDefined();
    expect(data.user).toBeNull();
  });

  it('should load app user after auth', async () => {
    // Sign in first
    await supabase.auth.signInWithPassword({
      email: 'user1@myportal.internal',
      password: '1234',
    });

    // Get session
    const { data: { session } } = await supabase.auth.getSession();

    // Load app user
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', session?.user.id)
      .single();

    expect(error).toBeNull();
    expect(user).toBeDefined();
    expect(user.id).toBe(1);
  });
});
```

#### 5.2 Testes E2E

```typescript
// tests/e2e/auth-flow.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Auth Flow', () => {
  test('should login with PIN and see dashboard', async ({ page }) => {
    await page.goto('http://localhost:5173/#/login');

    // Enter PIN
    await page.fill('input[type="password"]', '1234');
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/dashboard/);

    // Should see user name
    await expect(page.locator('text=Bem-vindo')).toBeVisible();
  });

  test('should show error with invalid PIN', async ({ page }) => {
    await page.goto('http://localhost:5173/#/login');

    await page.fill('input[type="password"]', '9999');
    await page.click('button[type="submit"]');

    // Should show error
    await expect(page.locator('text=PIN inválido')).toBeVisible();
  });

  test('RLS should work - user cannot see other users', async ({ page, context }) => {
    // Login as user 1
    await page.goto('http://localhost:5173/#/login');
    await page.fill('input[type="password"]', '1234');
    await page.click('button[type="submit"]');

    // Navigate to profile
    await page.goto('http://localhost:5173/#/profile');

    // Try to access other user's profile via URL manipulation
    await page.goto('http://localhost:5173/#/profile/2');

    // Should see error or redirect
    await expect(page.locator('text=Acesso negado')).toBeVisible();
  });
});
```

#### 5.3 Testes Manuais

**Checklist:**
- [ ] Login com PIN funciona
- [ ] Logout funciona
- [ ] Refresh mantém sessão
- [ ] Kiosk mode funciona
- [ ] Admin vê todos os users
- [ ] User comum só vê próprios dados
- [ ] Anomalies workflow funciona
- [ ] Time logs creation funciona
- [ ] Expenses submission funciona
- [ ] Performance não degradou

---

### **FASE 6: Deploy e Monitoring (2 horas)**

#### 6.1 Deploy para Staging

```bash
# 1. Criar branch de migração
git checkout -b feat/supabase-auth-migration

# 2. Commit todas as mudanças
git add .
git commit -m "feat: migrate to Supabase Auth with RLS"

# 3. Push para staging
git push origin feat/supabase-auth-migration

# 4. Deploy staging
npm run build
# Deploy para ambiente de staging
```

#### 6.2 Smoke Tests em Staging

```bash
# Executar testes E2E em staging
STAGING_URL=https://staging.semrumo.eu npm run test:e2e
```

#### 6.3 Deploy para Produção

```bash
# 1. Merge para main
git checkout main
git merge feat/supabase-auth-migration

# 2. Tag de release
git tag -a v2.0.0 -m "Supabase Auth integration with RLS"
git push --tags

# 3. Build produção
npm run build

# 4. Deploy
# (seguir processo de deploy da empresa)
```

#### 6.4 Monitoring

```typescript
// services/analytics.ts

// Track auth events
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    analyticsService.track('user_login', {
      user_id: session?.user.user_metadata.app_user_id,
      method: 'pin',
      timestamp: new Date().toISOString(),
    });
  }

  if (event === 'SIGNED_OUT') {
    analyticsService.track('user_logout', {
      timestamp: new Date().toISOString(),
    });
  }

  if (event === 'TOKEN_REFRESHED') {
    console.log('[Auth] Session refreshed');
  }
});
```

---

## 📊 Cronograma Detalhado

| Fase | Tarefa | Tempo | Responsável |
|------|--------|-------|-------------|
| 1 | Backup e schema | 4h | Dev |
| 2 | Script migração | 6h | Dev |
| 2 | Executar migração | 1h | Dev + DBA |
| 3 | Atualizar AuthContext | 3h | Dev |
| 3 | Atualizar Login | 2h | Dev |
| 3 | Atualizar App | 2h | Dev |
| 3 | Atualizar outras páginas | 1h | Dev |
| 4 | Implementar RLS | 4h | Dev |
| 5 | Testes unitários | 2h | QA |
| 5 | Testes E2E | 2h | QA |
| 5 | Testes manuais | 2h | QA |
| 6 | Deploy staging | 1h | DevOps |
| 6 | Deploy produção | 1h | DevOps |
| **TOTAL** | | **31h** | |

**Distribuído em 2-3 dias de trabalho**

---

## ⚠️ Riscos e Mitigações

### Risco 1: Migração de Users Falha
**Probabilidade:** Média
**Impacto:** Alto

**Mitigação:**
- Backup completo antes de migrar
- Script idempotente (pode re-executar)
- Migrar em batches pequenos
- Rollback plan documentado

### Risco 2: RLS Bloqueia Queries Legítimas
**Probabilidade:** Alta
**Impacto:** Alto

**Mitigação:**
- Testar TODAS as queries em staging
- Monitoring de erros RLS
- Feature flag para desativar RLS rapidamente
- Service role key como fallback

### Risco 3: Performance Degradação
**Probabilidade:** Média
**Impacto:** Médio

**Mitigação:**
- Índices adequados em auth_id
- Cache de auth_user_id()
- Monitoring de query performance
- Load testing antes de produção

### Risco 4: Users Não Conseguem Login
**Probabilidade:** Baixa
**Impacto:** Crítico

**Mitigação:**
- Manter PIN login como fallback temporário
- Comunicação prévia aos users
- Suporte disponível durante rollout
- Processo de reset de password documentado

---

## ✅ Critérios de Sucesso

- [ ] 100% dos users migrados com auth_id
- [ ] Login com PIN funciona via Supabase Auth
- [ ] RLS ativo em todas as 8 tabelas críticas
- [ ] Zero vulnerabilidades RLS identificadas
- [ ] Performance igual ou melhor que antes
- [ ] Zero erros em produção relacionados a auth
- [ ] Audit trail de logins funcionando
- [ ] Testes E2E passam 100%

---

## 🔗 Recursos Úteis

- **Supabase Auth Docs:** https://supabase.com/docs/guides/auth
- **RLS Patterns:** https://supabase.com/docs/guides/auth/row-level-security
- **Migration Guide:** https://supabase.com/docs/guides/auth/managing-users
- **Admin API:** https://supabase.com/docs/reference/javascript/auth-admin-api

---

## 📞 Contactos de Suporte

- **Supabase Support:** support@supabase.com
- **Community Discord:** https://discord.supabase.com
- **GitHub Issues:** https://github.com/supabase/supabase/issues

---

**Próximo Passo:** Decidir se avançar com esta migração ou considerar Opção B/C
