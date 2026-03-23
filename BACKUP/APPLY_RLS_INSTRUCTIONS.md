# Instruções para Aplicar RLS (Row Level Security)

## ✅ Estado Atual

- ✅ **147 utilizadores migrados** para Supabase Auth (100%)
- ✅ **AuthContext atualizado** para usar `auth.uid()`
- ✅ **Login page atualizada** para autenticar via Supabase Auth
- ✅ **Função SQL helper criada**: `auth_user_id()` para mapear UUID → BigInt

## 📋 Próximos Passos

### Passo 1: Aplicar Função Helper (OBRIGATÓRIO)

1. Abrir [Supabase Dashboard](https://supabase.com/dashboard)
2. Ir para **SQL Editor**
3. Copiar e executar o ficheiro: `migrations/002_create_auth_helper_function.sql`

**O que faz:**
- Cria a função `auth_user_id()` que mapeia `auth.uid()` (UUID) para `users.id` (BigInt)
- Esta função é ESSENCIAL para as políticas RLS funcionarem

### Passo 2: Aplicar Políticas RLS

1. No **SQL Editor** do Supabase
2. Copiar e executar o ficheiro: `migrations/003_apply_rls_policies.sql`

**O que faz:**
- ✅ Corrige 5 vulnerabilidades críticas na tabela `anomalies`
- ✅ Adiciona RLS a 7 tabelas sem políticas de segurança:
  - `users`
  - `time_logs`
  - `internal_messages`
  - `expenses`
  - `leaves`
  - `trips`
  - `hour_bank_adjustments`

### Passo 3: Testar Login

Após aplicar as migrações:

1. **Abrir aplicação** em modo desenvolvimento
2. **Testar login** com:
   - ID de utilizador (ex: `1`)
   - PIN (o mesmo que estava configurado, ou o hash SHA-256)

**Nota:** Os utilizadores usam agora **Supabase Auth** em vez de PIN legacy.
- Email: `user{id}@myportal.internal` (ou email real se tiver)
- Password: O PIN que estava configurado

### Passo 4: Verificar RLS

```sql
-- Verificar que RLS está ativo
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('users', 'time_logs', 'anomalies', 'internal_messages', 'expenses', 'leaves', 'trips', 'hour_bank_adjustments');

-- Verificar políticas criadas
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Testar função helper
SELECT auth_user_id();  -- Deve retornar o ID numérico do utilizador autenticado
```

## 🔐 Políticas Implementadas

### Anomalies
- ✅ Users podem ver as suas próprias anomalias
- ✅ Admins/Auditors podem ver todas
- ✅ Users podem criar anomalias para si próprios
- ✅ Users podem atualizar anomalias não resolvidas
- ✅ Apenas Admins podem apagar anomalias

### Time Logs
- ✅ Users podem ver os seus próprios registos
- ✅ Users podem criar registos para si próprios
- ✅ Users podem atualizar registos incompletos (sem check_out)

### Users
- ✅ Users podem ver o seu próprio perfil
- ✅ Admins/Auditors podem ver todos os perfis
- ✅ Users podem atualizar o seu próprio perfil

### Internal Messages
- ✅ Users podem ver mensagens enviadas ou recebidas por eles
- ✅ Users podem enviar mensagens

### Expenses, Leaves, Trips
- ✅ Users podem ver/criar/atualizar os seus próprios registos pendentes
- ✅ Admins podem gerir todos os registos

### Hour Bank Adjustments
- ✅ Users podem ver os seus ajustes
- ✅ Apenas Admins podem criar ajustes

## ⚠️ Importante

1. **Executar migrações pela ORDEM correta:**
   - Primeiro: `002_create_auth_helper_function.sql`
   - Depois: `003_apply_rls_policies.sql`

2. **Service Role Key:**
   - Operações de admin (criar users, kiosk clock-in/out) usam Service Role Key
   - Service Role Key **bypassa RLS** automaticamente
   - Não é necessário desativar RLS para operações de sistema

3. **Backup:**
   - Git tag criado: `v1.0-pre-auth-migration`
   - Para reverter: `git checkout v1.0-pre-auth-migration`

## 🧪 Testes Recomendados

Após aplicar RLS:

1. **Login como colaborador** → Verificar que só vê os seus dados
2. **Login como admin** → Verificar que vê todos os dados
3. **Kiosk mode** → Verificar que clock-in/out funciona
4. **Criar anomalia** → Verificar que é criada para o user correto
5. **Visualizar time logs** → Verificar que RLS filtra corretamente

## 📞 Em Caso de Problemas

Se a aplicação ficar bloqueada após aplicar RLS:

### Opção A: Desativar RLS temporariamente (via Dashboard)
1. Supabase Dashboard → **Database** → **Tables**
2. Para cada tabela: **Settings** → **Disable RLS**

### Opção B: Via SQL
```sql
-- Desativar RLS em todas as tabelas
ALTER TABLE anomalies DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE time_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE internal_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE leaves DISABLE ROW LEVEL SECURITY;
ALTER TABLE trips DISABLE ROW LEVEL SECURITY;
ALTER TABLE hour_bank_adjustments DISABLE ROW LEVEL SECURITY;
```

## ✅ Checklist Final

- [ ] Migração 002 aplicada (função helper)
- [ ] Migração 003 aplicada (políticas RLS)
- [ ] Login testado com utilizador migrado
- [ ] RLS verificado (queries de teste)
- [ ] Kiosk mode testado
- [ ] Aplicação em produção funcional

---

**Data:** 2026-03-18
**Utilizadores Migrados:** 147/147 (100%)
**RLS:** Pronto para aplicar
