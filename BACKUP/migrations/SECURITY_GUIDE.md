# 🔒 Guia de Segurança - Otimizações SQL

## ✅ O que é 100% SEGURO

### 1. **CREATE INDEX** - SEGURO ✅
```sql
CREATE INDEX idx_name ON table(column);
```
- **Por quê seguro:** Não altera dados, apenas cria estrutura de busca
- **Risco:** Pode usar espaço em disco e demorar em tabelas grandes
- **Rollback:** `DROP INDEX idx_name;`

### 2. **ANALYZE** - SEGURO ✅
```sql
ANALYZE table_name;
```
- **Por quê seguro:** Apenas atualiza estatísticas do query planner
- **Risco:** Nenhum
- **Rollback:** Não necessário

### 3. **CREATE VIEW** - SEGURO ✅
```sql
CREATE VIEW view_name AS SELECT...
```
- **Por quê seguro:** É apenas uma query salva, não copia dados
- **Risco:** Nenhum
- **Rollback:** `DROP VIEW view_name;`

### 4. **CREATE FUNCTION** - SEGURO* ✅
```sql
CREATE FUNCTION name() RETURNS...
```
- **Por quê seguro:** Desde que seja READ-ONLY (SELECT apenas)
- **Risco:** Se tiver INSERT/UPDATE/DELETE pode alterar dados
- **Rollback:** `DROP FUNCTION name();`

## ⚠️ CUIDADO - Pode afetar sistema

### 1. **ALTER DATABASE SET** - CUIDADO ⚠️
```sql
ALTER DATABASE postgres SET statement_timeout = '30s';
```
- **Impacto:** Afeta TODAS as conexões futuras
- **Teste primeiro:** `SET LOCAL statement_timeout = '30s';`
- **Rollback:** `ALTER DATABASE postgres RESET statement_timeout;`

### 2. **ALTER ROLE SET** - CUIDADO ⚠️
```sql
ALTER ROLE authenticated SET statement_timeout = '30s';
```
- **Impacto:** Afeta todos os usuários com esse role
- **Teste primeiro:** Em ambiente de desenvolvimento
- **Rollback:** `ALTER ROLE authenticated RESET statement_timeout;`

### 3. **CREATE MATERIALIZED VIEW** - CUIDADO ⚠️
```sql
CREATE MATERIALIZED VIEW mv_name AS SELECT...
```
- **Impacto:** Copia dados fisicamente (usa espaço)
- **Manutenção:** Precisa de REFRESH periódico
- **Rollback:** `DROP MATERIALIZED VIEW mv_name;`

## ❌ NUNCA FAÇA em Produção

1. **DROP TABLE** - DESTRÓI DADOS ❌
2. **TRUNCATE** - APAGA TODOS OS DADOS ❌
3. **DELETE sem WHERE** - APAGA TUDO ❌
4. **ALTER TABLE DROP COLUMN** - PERDE COLUNA ❌
5. **UPDATE sem WHERE** - ALTERA TUDO ❌

## 📋 Checklist de Segurança

Antes de executar SQL em produção:

- [ ] **1. Fez backup?** Supabase > Settings > Backups
- [ ] **2. Testou em dev?** Sempre teste primeiro
- [ ] **3. Horário adequado?** Evite horário de pico
- [ ] **4. Tem rollback?** Saiba como desfazer
- [ ] **5. Monitoramento ativo?** Acompanhe após aplicar

## 🚀 Sequência Segura Recomendada

### Fase 1: Totalmente Seguro (faça já)
```sql
-- 1. Criar índices
CREATE INDEX IF NOT EXISTS idx_users_id ON users(id);
CREATE INDEX IF NOT EXISTS idx_time_logs_user_date ON time_logs(user_id, date DESC);

-- 2. Atualizar estatísticas
ANALYZE users;
ANALYZE time_logs;
```

### Fase 2: Teste primeiro
```sql
-- 1. Teste local do timeout
SET LOCAL statement_timeout = '30s';
-- Execute queries para testar
SELECT * FROM users LIMIT 100;

-- 2. Se OK, aplique gradualmente
ALTER ROLE authenticated SET statement_timeout = '30s';
```

### Fase 3: Monitore
```sql
-- Ver queries lentas
SELECT query, now() - query_start as duration
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY duration DESC;

-- Ver uso de índices
SELECT indexrelname, idx_scan
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

## 🔄 Scripts de Rollback Prontos

### Reverter Timeouts
```sql
ALTER DATABASE postgres RESET statement_timeout;
ALTER ROLE authenticated RESET statement_timeout;
ALTER ROLE anon RESET statement_timeout;
```

### Remover Índices
```sql
-- Lista todos os índices criados
SELECT 'DROP INDEX IF EXISTS ' || indexname || ';'
FROM pg_indexes
WHERE indexname LIKE 'idx_%'
AND tablename IN ('users', 'time_logs', 'anomalies');
```

### Verificar Estado
```sql
-- Estado atual do sistema
SELECT
    current_setting('statement_timeout') as timeout,
    (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'users') as indices,
    pg_database_size(current_database()) as db_size;
```

## 💡 Dicas Finais

1. **Sempre em transação**: Use `BEGIN; ... COMMIT;` para poder fazer `ROLLBACK;`
2. **Uma mudança por vez**: Não aplique tudo de uma vez
3. **Documente**: Anote o que mudou e quando
4. **Comunique**: Avise a equipa antes de mudanças grandes
5. **Tenha plano B**: Saiba o que fazer se algo correr mal

## 📞 Em caso de problemas

1. **Primeiro**: Não entre em pânico
2. **Execute rollback**: Use os scripts acima
3. **Verifique logs**: Supabase > Logs & Analytics
4. **Restaure backup** se necessário: Supabase > Backups
5. **Documente** o que aconteceu para evitar no futuro