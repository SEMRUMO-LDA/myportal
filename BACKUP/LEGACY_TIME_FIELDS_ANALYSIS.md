# Análise: Campos Legacy de Horários no User

## 📋 Situação Atual

### **Campos Legacy** (Linhas 119-122 em `types.ts`):
```typescript
workStartTime?: string;
workEndTime?: string;
lunchStartTime?: string;
lunchEndTime?: string;
```

### **Nova Arquitetura** (Linhas 135-136 em `types.ts`):
```typescript
scheduleTemplateId?: number;
scheduleCycleStartDate?: string;
```

---

## 🔍 Análise de Uso

### **Ficheiros que Usam Campos Legacy** (14 ficheiros):

1. **pages/KioskDashboard.tsx** ✅ CORRIGIDO
   - Agora usa `todaySchedule` via Schedule Template

2. **App.tsx**
   - Linha ~112-118: Calcula `expectedMinutesPerDay` para Hour Bank
   - **Status**: Precisa migrar para Schedule Template

3. **pages/AttendanceControl.tsx**
   - Provável uso para display/validação
   - **Status**: Verificar

4. **pages/CollaboratorFile.tsx**
   - Editor de perfil de colaborador
   - **Status**: Campos devem ser removidos do form

5. **pages/UserProfile.tsx**
   - Editor de perfil
   - **Status**: Campos devem ser removidos do form

6. **services/resilientTimeLogService.ts**
   - Cálculos de horas
   - **Status**: Migrar para Schedule Template

7. **hooks/useDataHandlers.ts**
   - Handlers de create/update user
   - **Status**: Remover do payload

8. **hooks/useSupabaseSync.ts**
   - Sync com BD
   - **Status**: Verificar se DB ainda tem esses campos

9. **pages/Reports.tsx**
   - Relatórios
   - **Status**: Migrar para Schedule Template

10. **services/analyticsService.ts**
    - Analytics
    - **Status**: Migrar para Schedule Template

11. **pages/EmployeeTimeBank.tsx**
    - Bolsa de horas
    - **Status**: Migrar para Schedule Template

12-14. **Outros ficheiros**: Ver análise detalhada

---

## 🎯 Recomendação

### **OPÇÃO 1: Deprecation Gradual** ⭐ RECOMENDADO

**Fase 1 - Imediata** (Esta sprint):
1. ✅ Atualizar `KioskDashboard` para usar Schedule Template
2. ⚠️ Marcar campos como `@deprecated` no tipo:
   ```typescript
   /** @deprecated Use scheduleTemplateId instead */
   workStartTime?: string;
   /** @deprecated Use scheduleTemplateId instead */
   workEndTime?: string;
   /** @deprecated Use scheduleTemplateId instead */
   lunchStartTime?: string;
   /** @deprecated Use scheduleTemplateId instead */
   lunchEndTime?: string;
   ```

3. ⚠️ Criar função helper global:
   ```typescript
   // utils/scheduleUtils.ts
   export function getUserScheduleForDate(
     user: User,
     date: Date,
     scheduleTemplates: ScheduleTemplate[]
   ): ScheduleDay | null {
     // Implementation...
   }
   ```

4. ⚠️ Migrar ficheiros críticos primeiro:
   - `App.tsx` (Hour Bank calculation)
   - `services/resilientTimeLogService.ts`
   - `pages/Reports.tsx`

**Fase 2 - Próxima sprint** (Migration):
1. Migrar todos os restantes ficheiros
2. Criar migration script para limpar BD
3. Remover campos do tipo `User`

---

### **OPÇÃO 2: Manter Ambos** ❌ NÃO RECOMENDADO

**Problemas**:
- Duplicação de dados (fonte de bugs)
- Confusão sobre qual campo usar
- Maintenance overhead
- Dados inconsistentes

---

## 📊 Análise de Impacto

### **Database** (Supabase):

Verificar se tabela `users` ainda tem essas colunas:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('work_start_time', 'work_end_time', 'lunch_start_time', 'lunch_end_time');
```

### **Se colunas existem**:
- **OPÇÃO A**: Manter por compatibilidade (sync automático de Schedule Template → User fields)
- **OPÇÃO B**: Remover após migração completa

---

## ✅ Ação Imediata

### **Para ESTA sessão**:

1. ✅ **KioskDashboard** - DONE (usa Schedule Template)

2. ⚠️ **Adicionar comentários de deprecation**:
   ```typescript
   /**
    * @deprecated Use scheduleTemplateId and fetch from ScheduleTemplate instead
    * Will be removed in version 3.0
    */
   workStartTime?: string;
   ```

3. ⚠️ **Criar utility function** para facilitar migração

4. ⚠️ **Documentar migration path** para outros developers

---

## 🚦 Status da Migração

| Ficheiro | Status | Prioridade | Effort |
|----------|--------|------------|--------|
| KioskDashboard.tsx | ✅ DONE | Alta | - |
| App.tsx | ⏳ TODO | Alta | 1h |
| resilientTimeLogService.ts | ⏳ TODO | Alta | 2h |
| Reports.tsx | ⏳ TODO | Média | 1h |
| EmployeeTimeBank.tsx | ⏳ TODO | Média | 1h |
| CollaboratorFile.tsx | ⏳ TODO | Baixa | 30min |
| UserProfile.tsx | ⏳ TODO | Baixa | 30min |
| Outros | ⏳ TODO | Baixa | 2h |

**Total Effort**: ~8 horas de trabalho

---

## 📝 Conclusão

**Decisão Recomendada**: **DEPRECATION GRADUAL**

**Razões**:
1. Schedule Template é a arquitetura correta (suporta turnos rotativos, dias off, etc.)
2. Campos legacy limitam funcionalidades (apenas 1 horário fixo)
3. Migração pode ser feita sem breaking changes
4. Melhora maintainability a longo prazo

**Próximos Passos**:
1. Marcar campos como deprecated (5 min)
2. Criar utility function (30 min)
3. Migrar App.tsx hour bank calculation (1h)
4. Agendar restantes migrações para próxima sprint

---

**Analista**: Senior Software Architect
**Data**: 2026-03-19
**Recomendação**: APPROVE deprecation plan
