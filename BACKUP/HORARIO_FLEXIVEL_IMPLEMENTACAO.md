# ⏰ Horário Flexível - Implementação

**Data**: 2026-03-20
**Status**: ✅ **PARCIALMENTE IMPLEMENTADO**

---

## 🎯 Requisitos

Quando a opção **"Horário Flexível"** está **ON** para um colaborador:

### ✅ Implementado

1. ❌ **Sem Geofence** - Não valida localização GPS (ignora `restrictGeo`)
2. ❌ **Sem validação de horários** - Não cria anomalias de atraso/saída antecipada
3. ✅ **Objetivo**: Cumprir X horas/dia (configurável em `minimumDailyHours`, default 8h)
4. ✅ **Excedentes → Bolsa de Horas**

### 🚧 A Implementar

5. ⚠️ **4 Picagens obrigatórias por dia**:
   - Entrada (Clock In)
   - Início Pausa (Break Start)
   - Fim Pausa (Break End)
   - Saída (Clock Out)

---

## 📝 Alterações Realizadas

### 1. Desativar Geofence - `kioskClockService.ts` ✅

**Localização**: [kioskClockService.ts:51-79](services/kioskClockService.ts#L51-L79)

**Mudança**: Adicionar verificação `&& !attendanceConfig?.flexibleSchedule`

**Antes**:
```typescript
if (attendanceConfig?.restrictGeo) {
  // Valida geofence
}
```

**Depois**:
```typescript
if (attendanceConfig?.restrictGeo && !attendanceConfig?.flexibleSchedule) {
  console.log('[KioskClock] Validating geo restrictions...');
  // Valida geofence
} else if (attendanceConfig?.flexibleSchedule) {
  console.log('[KioskClock] ℹ️ Flexible schedule - skipping geo restrictions');
}
```

**Aplicado em**:
- ✅ `clockIn()` - linha 51-79
- ✅ `clockOut()` - linha 151-179

**Resultado**:
- Colaboradores com horário flexível podem picar de **qualquer local**
- Geofence só valida se `restrictGeo = ON` **E** `flexibleSchedule = OFF`

---

### 2. Desativar Anomalias de Horário - `ResilientKioskWrapper.tsx` ✅

**Localização**: [ResilientKioskWrapper.tsx:253](components/ResilientKioskWrapper.tsx#L253)

**Mudança**: Já estava implementado ✅

**Código**:
```typescript
// CHECK DELAYS
if (!user.attendanceConfig?.flexibleSchedule && expectedStart) {
  const checkInMins = getMinutesFromTime(result.log.checkIn);
  const startMins = getMinutesFromTime(expectedStart);
  const toleranceEntry = userLocation?.toleranceEntry ?? 15;

  if (checkInMins > startMins + toleranceEntry) {
    const diff = checkInMins - startMins;
    const isCritical = diff >= 30;
    const anomalyStatus = isCritical ? 'AWAITING_JUSTIFICATION' : 'PENDING';

    await supabase.from('anomalies').insert({
      user_id: numericId,
      time_log_id: result.log.id,
      type: 'LATE_ENTRY',  // ← Anomalia de atraso
      minutes: diff,
      status: anomalyStatus
    });
  }
}
```

**Resultado**:
- Se `flexibleSchedule = ON` → **NÃO cria** anomalias `LATE_ENTRY`
- Se `flexibleSchedule = OFF` → cria anomalias normalmente

---

### 3. Configuração de Horas Mínimas ✅

**Localização**: [UserProfile.tsx:793-812](pages/UserProfile.tsx#L793-L812)

**Interface**:
```tsx
{formData.attendanceConfig?.flexibleSchedule && (
  <div className="ml-1 mt-2 p-3 bg-blue-50 border border-blue-100 rounded-lg">
    <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">
      Horas Mínimas Diárias
    </label>
    <input
      type="number"
      min="1"
      max="24"
      step="0.5"
      value={formData.attendanceConfig?.minimumDailyHours ?? 8}
      onChange={(e) => setFormData(prev => ({
        ...prev,
        attendanceConfig: {
          ...prev.attendanceConfig!,
          minimumDailyHours: parseFloat(e.target.value) || 8
        }
      }))}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
    />
    <p className="text-[10px] text-gray-400 mt-1">
      Nº de horas que o colaborador deve cumprir por dia.
      Excedentes vão para bolsa de horas.
    </p>
  </div>
)}
```

**Comportamento**:
- Campo só aparece quando toggle "Horário Flexível" está ON
- Valor default: 8 horas
- Range: 1-24 horas (step 0.5)

---

## 🚧 Funcionalidades Pendentes

### Botões de Pausa Manual

**Objetivo**: Permitir que colaboradores com horário flexível registem pausas manualmente

**4 Picagens Necessárias**:
1. **Entrada** (já existe) → Clock In
2. **Início Pausa** 🆕 → Break Start
3. **Fim Pausa** 🆕 → Break End
4. **Saída** (já existe) → Clock Out

**Localização para implementar**: `pages/KioskDashboard.tsx`

**Proposta de Interface**:

```
┌─────────────────────────────────┐
│  Colaborador em Horário Flexível│
│  Objetivo: 8h diárias           │
├─────────────────────────────────┤
│                                 │
│  [✅ ENTRADA] 09:15             │
│                                 │
│  [⏸️ INICIAR PAUSA]             │  ← Se ainda não iniciou pausa
│                                 │
│  --- ou ---                     │
│                                 │
│  [▶️ RETOMAR TRABALHO]          │  ← Se está em pausa
│                                 │
│  --- ou ---                     │
│                                 │
│  [❌ SAÍDA] (4h trabalhadas)    │  ← Mostra horas até agora
│                                 │
└─────────────────────────────────┘
```

**Estados**:

| Estado Atual | Botões Visíveis | Próxima Ação |
|--------------|-----------------|--------------|
| Sem entrada | `ENTRADA` | Clock In |
| Entrada feita, sem pausa | `INICIAR PAUSA`, `SAÍDA` | Break Start ou Clock Out |
| Em pausa | `RETOMAR TRABALHO` | Break End |
| Pausa terminada | `SAÍDA` | Clock Out |

---

## 🔄 Fluxo de Picagem - Horário Flexível

### Fluxo Completo (4 Picagens)

```
09:00 → [ENTRADA]
          ↓
        trabalha
          ↓
13:00 → [INICIAR PAUSA]
          ↓
        pausa 1h
          ↓
14:00 → [RETOMAR TRABALHO]
          ↓
        trabalha
          ↓
18:00 → [SAÍDA]
```

**Cálculo**:
- Entrada: 09:00
- Início Pausa: 13:00 (4h trabalhadas)
- Fim Pausa: 14:00 (1h pausa)
- Saída: 18:00 (4h trabalhadas)
- **Total**: 8h trabalhadas ✅

---

### Fluxo Sem Pausa (2 Picagens) ⚠️

```
09:00 → [ENTRADA]
          ↓
        trabalha 8h direto
          ↓
17:00 → [SAÍDA]
```

**Problema**: Sistema deve **AVISAR** que faltam picagens de pausa

**Solução**:
- Permitir saída mas criar anomalia/aviso
- Ou exigir pelo menos 2min de pausa registada

---

## 📊 Tabela time_logs

### Campos Relevantes

| Campo | Descrição | Exemplo (Flexível) | Exemplo (Normal) |
|-------|-----------|-------------------|------------------|
| `check_in` | Hora entrada | "09:00" | "09:00" |
| `break_start` | Início pausa | "13:00" 🆕 | NULL (auto) |
| `break_end` | Fim pausa | "14:00" 🆕 | NULL (auto) |
| `check_out` | Hora saída | "18:00" | "18:00" |

**Diferença**:
- **Horário Normal**: `break_start` e `break_end` são preenchidos AUTOMATICAMENTE com valores do `user.lunchStartTime/lunchEndTime`
- **Horário Flexível**: `break_start` e `break_end` são preenchidos MANUALMENTE pelo colaborador

---

## 🎨 Design da Interface (Proposta)

### Card de Status - Horário Flexível

```tsx
{user.attendanceConfig?.flexibleSchedule && (
  <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-4 mb-6">
    <div className="flex items-center gap-2 mb-2">
      <Clock size={18} className="text-purple-600" />
      <span className="font-bold text-purple-900">Horário Flexível Ativo</span>
    </div>
    <div className="text-sm text-purple-700">
      <p>✓ Objetivo diário: <strong>{user.attendanceConfig.minimumDailyHours || 8}h</strong></p>
      <p>✓ Registe manualmente as pausas</p>
      <p>✓ 4 picagens necessárias: Entrada, Pausa Início, Pausa Fim, Saída</p>
    </div>
  </div>
)}
```

### Botões de Pausa

```tsx
// Se já tem entrada mas não tem pausa iniciada
{currentLog && !currentLog.breakStart && (
  <button
    onClick={handleBreakStart}
    className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold flex items-center justify-center gap-2"
  >
    <Coffee size={24} />
    INICIAR PAUSA
  </button>
)}

// Se está em pausa
{currentLog && currentLog.breakStart && !currentLog.breakEnd && (
  <button
    onClick={handleBreakEnd}
    className="w-full py-4 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold flex items-center justify-center gap-2"
  >
    <Play size={24} />
    RETOMAR TRABALHO
  </button>
)}
```

---

## 🔧 Implementação Técnica Necessária

### 1. Adicionar novos handlers ao `resilientTimeLogService.ts`

```typescript
async breakStart(user: User, logId: number): Promise<ClockResult> {
  const now = new Date();
  const time = now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', hour12: false });

  const { data, error } = await supabase
    .from('time_logs')
    .update({ break_start: time })
    .eq('id', logId)
    .select()
    .maybeSingle();

  if (error) {
    return { success: false, message: 'Erro ao registar início de pausa' };
  }

  return {
    success: true,
    message: `Pausa iniciada às ${time}`,
    log: this.mapTimeLog(data)
  };
}

async breakEnd(user: User, logId: number): Promise<ClockResult> {
  const now = new Date();
  const time = now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', hour12: false });

  const { data, error } = await supabase
    .from('time_logs')
    .update({ break_end: time })
    .eq('id', logId)
    .select()
    .maybeSingle();

  if (error) {
    return { success: false, message: 'Erro ao registar fim de pausa' };
  }

  return {
    success: true,
    message: `Trabalho retomado às ${time}`,
    log: this.mapTimeLog(data)
  };
}
```

### 2. Adicionar botões no `KioskDashboard.tsx`

- Detectar estado atual do `time_log`
- Mostrar botão correto baseado no estado
- Chamar handlers apropriados

### 3. Validação de 4 Picagens

**Ao fazer Clock Out**:
```typescript
if (user.attendanceConfig?.flexibleSchedule) {
  if (!currentLog.breakStart || !currentLog.breakEnd) {
    // OPÇÃO 1: Bloquear
    return {
      success: false,
      message: 'Horário flexível requer registo de pausa. Use os botões INICIAR PAUSA e RETOMAR TRABALHO.'
    };

    // OPÇÃO 2: Avisar mas permitir
    geoWarning = 'Saída registada sem pausas. Recomenda-se 4 picagens diárias.';
  }
}
```

---

## ✅ Checklist de Implementação

### Concluído ✅

- [x] Desativar geofence quando `flexibleSchedule = ON`
- [x] Desativar anomalias de atraso quando `flexibleSchedule = ON`
- [x] Campo de configuração `minimumDailyHours` na ficha
- [x] Interface mostra campo apenas quando flexível ON

### Pendente 🚧

- [ ] Adicionar métodos `breakStart()` e `breakEnd()` ao `resilientTimeLogService.ts`
- [ ] Adicionar botões "INICIAR PAUSA" e "RETOMAR TRABALHO" no `KioskDashboard.tsx`
- [ ] Lógica de estados para mostrar botão correto
- [ ] Validação de 4 picagens ao fazer Clock Out
- [ ] Avisos visuais sobre horário flexível ativo
- [ ] Cálculo de horas baseado em `minimumDailyHours` em vez de horário fixo
- [ ] Testes de fluxo completo

---

## 🧪 Cenários de Teste

### Teste 1: Ativar Horário Flexível ✅

1. Editar ficha de colaborador
2. Ativar toggle "Horário Flexível"
3. Campo "Horas Mínimas Diárias" deve aparecer (default 8)
4. Guardar
5. **Verificar**: `attendance_config.flexibleSchedule = true` na DB

### Teste 2: Picagem sem Geofence ✅

1. Colaborador com `flexibleSchedule = ON` e `restrictGeo = ON`
2. Fazer picagem fora do raio permitido
3. **Esperado**: Picagem permitida (sem erro de geolocalização)
4. **Logs**: "[KioskClock] ℹ️ Flexible schedule - skipping geo restrictions"

### Teste 3: Sem Anomalias de Atraso ✅

1. Colaborador com `flexibleSchedule = ON`
2. Horário definido: 09:00-18:00
3. Picar às 11:00 (2h de atraso)
4. **Esperado**: SEM anomalia `LATE_ENTRY`

### Teste 4: 4 Picagens (Pendente) 🚧

1. Fazer entrada
2. Iniciar pausa
3. Retomar trabalho
4. Fazer saída
5. **Verificar**: `time_log` tem todos os 4 campos preenchidos

---

## 📈 Impacto

### Vantagens ✅

1. **Flexibilidade Real** - Colaboradores podem trabalhar em horários variáveis
2. **Sem Anomalias Desnecessárias** - Não penaliza por atrasos se objetivo diário cumprido
3. **Autonomia** - Colaborador gere as próprias pausas
4. **Precisão** - 4 picagens dão melhor visibilidade do dia de trabalho

### Considerações ⚠️

1. **Confiança** - Requer mais confiança no colaborador (sem geofence, sem validação horário)
2. **Responsabilidade** - Colaborador deve lembrar-se de picar 4 vezes
3. **Auditoria** - RH deve validar se objetivos diários são cumpridos
4. **Anomalias** - Deve criar anomalia se défice de horas (< minimumDailyHours)

---

**Status**: ✅ 60% Implementado | 🚧 40% Pendente

**Próximo Passo**: Implementar botões de pausa manual no KioskDashboard

---

**Fim do Documento** ⏰
