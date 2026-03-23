# 📍 GPS Opcional - Picagem sem Bloqueio

**Data**: 2026-03-20
**Versão**: BUILD 51 (proposta)
**Status**: ✅ **IMPLEMENTADO**

---

## 🎯 Objetivo

Permitir que colaboradores façam picagem de entrada/saída **MESMO SEM GPS**, criando apenas um alerta/anomalia quando a geolocalização falha, em vez de bloquear completamente a operação.

---

## 📊 Resumo das Alterações

| Ficheiro | Mudanças | Impacto |
|----------|----------|---------|
| `services/kioskClockService.ts` | GPS agora é OPCIONAL | 🟢 Não bloqueia picagem |
| `services/resilientTimeLogService.ts` | Cria anomalias quando GPS falha | 🟡 Regista falhas GPS |
| `services/anomalyService.ts` | Novo tipo: `MISSING_GPS` | 🔵 Novo tipo de anomalia |
| `components/ResilientKioskWrapper.tsx` | Mostra aviso ao utilizador | 🟡 Feedback visual |

---

## 🔧 Alterações Detalhadas

### 1. `services/kioskClockService.ts` - GPS OPCIONAL ✅

**Antes**: GPS era **OBRIGATÓRIO** - bloqueava picagem se falhasse

```typescript
// STEP 1: ALWAYS request geolocation (MANDATORY)
const geoResult = await geolocationService.getCurrentLocation(15000);

if (!geoResult.success) {
  console.error('[KioskClock] ❌ Geolocation FAILED:', geoResult.error);
  return {
    success: false,  // ❌ BLOQUEAVA A PICAGEM
    message: `Geolocalização obrigatória: ${geoResult.error}`,
    error: geoResult.error
  };
}
```

**Depois**: GPS é **OPCIONAL** - continua mesmo se falhar

```typescript
// STEP 1: Try to get geolocation (OPTIONAL - não bloqueia picagem)
let lat: number | undefined;
let lng: number | undefined;
let locationName: string = 'Localização não disponível';
let geoWarning: string | undefined;

const geoResult = await geolocationService.getCurrentLocation(15000);

if (!geoResult.success) {
  console.warn('[KioskClock] ⚠️ Geolocation FAILED (will create anomaly):', geoResult.error);
  geoWarning = `Picagem registada sem GPS: ${geoResult.error}`;
  // ✅ NÃO BLOQUEIA - continua sem GPS
} else {
  lat = geoResult.coords!.lat;
  lng = geoResult.coords!.lng;
  // Valida restrições GEO apenas se tiver coordenadas
}
```

**Lógica**:
- ✅ Tenta obter GPS (timeout 15 segundos)
- ✅ Se **falhar**: continua sem GPS, cria `geoWarning`
- ✅ Se **funcionar**: valida restrições geográficas (se configuradas)
- ✅ Passa `__tempGeoWarning` para criar anomalia

---

### 2. `services/resilientTimeLogService.ts` - Criação de Anomalias ✅

**Adicionado** suporte ao campo `__tempGeoWarning`:

```typescript
interface KioskSubmissionUser extends User {
  __tempLocation?: string;
  __tempIp?: string | null;
  __tempCoords?: { lat: number; lng: number } | null;
  __tempGeoWarning?: string; // ✅ NOVO: Warning message when GPS fails
}
```

**Criação automática de anomalia** quando GPS falha:

```typescript
// CRIAR ANOMALIA se GPS falhou
if (user.__tempGeoWarning && data?.id) {
  console.warn(`⚠️ [ClockIn] Creating anomaly for missing GPS: ${user.__tempGeoWarning}`);
  await anomalyService.createAnomaly({
    userId: userId,
    userEmail: userArg.email,
    date: date,
    type: 'MISSING_GPS',         // ✅ Novo tipo
    description: user.__tempGeoWarning,
    timeLogId: data.id,
    detectedBy: 'SISTEMA_GPS',
    severity: 'LOW',              // ✅ Baixa severidade
    status: 'PENDING'
  }).catch(err => {
    console.error('[ClockIn] Failed to create GPS anomaly:', err);
    // ✅ Não falha a picagem se anomalia falhar
  });
}
```

**Aplicado em**:
- ✅ `clockIn()` - linha 72-89
- ✅ `clockOut()` - linha 181-199

---

### 3. `services/anomalyService.ts` - Novo Tipo de Anomalia ✅

**Adicionado** novo tipo `MISSING_GPS`:

```typescript
export type AnomalyType =
  | 'LATE_ENTRY'           // Entrada tardia
  | 'EARLY_EXIT'           // Saída antecipada
  | 'HOURS_DEFICIT'        // Défice de horas
  | 'HOURS_SURPLUS'        // Excesso de horas
  | 'UNCLOSED_SESSION'     // Sessão não encerrada
  | 'MISSING_CLOCK_IN'     // Falta de entrada
  | 'MISSING_CLOCK_OUT'    // Falta de saída
  | 'MISSING_BREAK'        // Pausa não registada
  | 'INVALID_LOCATION'     // Localização inválida (fora do raio permitido)
  | 'MISSING_GPS';         // ✅ NOVO: GPS não disponível/falhou
```

**Diferença**:
- `INVALID_LOCATION`: GPS funciona MAS está fora do raio permitido (BLOQUEIA picagem)
- `MISSING_GPS`: GPS não funcionou/não disponível (NÃO bloqueia, cria anomalia)

---

### 4. `components/ResilientKioskWrapper.tsx` - Feedback Visual ✅

**Adicionado** toast de aviso quando GPS falha:

```typescript
const result = await kioskClockService.clockIn(submissionUser);

if (result.success && result.log) {
  addToast('success', `✅ ${result.message}`);

  // ✅ Mostrar aviso se GPS falhou
  if (result.warning) {
    addToast('warning', `⚠️ ${result.warning}`);
  }

  if (setTimeLogs) {
    setTimeLogs((prev: any) => [result.log, ...prev]);
  }
}
```

**Resultado para o utilizador**:
1. Toast **VERDE**: "✅ Entrada registada às 09:15"
2. Toast **AMARELO**: "⚠️ Picagem registada sem GPS: Geolocation timeout"

**Aplicado em**:
- ✅ `handleClockIn()` - linha 243-246
- ✅ `handleClockOut()` - linha 415-418

---

## 🎯 Comportamento Final

### Cenário 1: GPS Funciona ✅
1. Sistema obtém coordenadas GPS
2. Valida restrições geográficas (se configuradas)
3. Regista picagem COM coordenadas
4. **Sem anomalia**
5. Toast verde: "✅ Entrada registada às 09:15"

### Cenário 2: GPS Falha ⚠️
1. Sistema tenta obter GPS (timeout 15s)
2. GPS falha (timeout, permissões negadas, não disponível)
3. Regista picagem **SEM coordenadas**
4. **Cria anomalia** tipo `MISSING_GPS` (severidade LOW)
5. Toast verde: "✅ Entrada registada às 09:15"
6. Toast amarelo: "⚠️ Picagem registada sem GPS: Geolocation timeout"

### Cenário 3: GPS Funciona MAS Fora do Raio (restrictGeo ativo) ❌
1. Sistema obtém coordenadas GPS
2. Valida restrições geográficas
3. Coordenadas fora do raio permitido
4. **BLOQUEIA picagem**
5. Toast vermelho: "❌ Não está numa localização permitida. Localização mais próxima: Sede (2.3 km de distância)"

---

## 🔍 Tipos de Anomalia GPS

| Tipo | Quando Ocorre | Severidade | Bloqueia Picagem? | Descrição |
|------|---------------|------------|-------------------|-----------|
| `MISSING_GPS` | GPS não funciona/timeout | LOW | ❌ NÃO | GPS não disponível, negado ou timeout |
| `INVALID_LOCATION` | GPS funciona mas fora do raio | MEDIUM/HIGH | ✅ SIM | Coordenadas fora da área permitida |

---

## 📝 Mensagens de Erro GPS Possíveis

As mensagens vêm do `geolocationService.ts`:

1. **"Geolocation not supported by this browser"**
   - Browser não suporta GPS
   - Cria anomalia: "Picagem registada sem GPS: Geolocation not supported by this browser"

2. **"Geolocation timeout"**
   - GPS demorou mais de 15 segundos
   - Cria anomalia: "Picagem registada sem GPS: Geolocation timeout"

3. **"User denied the request for Geolocation"**
   - Utilizador recusou permissões
   - Cria anomalia: "Picagem registada sem GPS: User denied the request for Geolocation"

4. **"Location information is unavailable"**
   - GPS não conseguiu determinar posição
   - Cria anomalia: "Picagem registada sem GPS: Location information is unavailable"

---

## ✅ Vantagens da Implementação

1. **Não Bloqueia Operação** ✅
   - Colaboradores podem picar mesmo sem GPS funcional
   - Evita frustração e bloqueios operacionais

2. **Rastreabilidade** ✅
   - Todas as picagens sem GPS ficam registadas como anomalias
   - RH pode auditar e investigar padrões

3. **Baixa Severidade** ✅
   - Anomalias GPS são marcadas como `LOW`
   - Não geram alertas críticos

4. **Feedback Imediato** ✅
   - Utilizador vê aviso amarelo mas pode continuar
   - Transparência sobre o que aconteceu

5. **Validação Condicional** ✅
   - Se `restrictGeo` ativo e GPS funciona → valida raio
   - Se GPS falha → não valida (não pode validar sem coordenadas)

---

## ⚠️ Considerações Importantes

### Segurança

- ⚠️ Colaboradores com `restrictGeo` ativo podem picar sem GPS se este falhar
- ✅ Anomalias permitem auditoria posterior
- ✅ RH pode identificar padrões de falhas GPS suspeitas

### Restrições Geográficas

**Quando `restrictGeo: true`**:
- Se GPS **funcionar** → valida raio (BLOQUEIA se fora)
- Se GPS **falhar** → permite picagem (cria anomalia)

**Recomendação**: Para ambientes críticos, considerar backup como:
- Validação de IP em conjunto (`restrictIp: true`)
- Análise de padrões de anomalias GPS

---

## 🧪 Testes Recomendados

### Teste 1: GPS Normal ✅
1. Dispositivo com GPS ativo
2. Permissões concedidas
3. Fazer picagem
4. **Esperado**: Sucesso + GPS registado + sem anomalia

### Teste 2: GPS Bloqueado pelo Utilizador ⚠️
1. Negar permissões de localização
2. Fazer picagem
3. **Esperado**: Sucesso + sem GPS + anomalia `MISSING_GPS` + toast amarelo

### Teste 3: GPS Timeout ⚠️
1. Dispositivo sem sinal GPS (indoor profundo)
2. Fazer picagem
3. **Esperado**: Sucesso após 15s + sem GPS + anomalia `MISSING_GPS`

### Teste 4: GPS OK mas Fora do Raio (restrictGeo) ❌
1. Utilizador com `restrictGeo: true`
2. GPS funciona mas longe do local permitido
3. Fazer picagem
4. **Esperado**: FALHA + mensagem de erro + sem anomalia (bloqueio esperado)

### Teste 5: GPS Offline e restrictGeo ⚠️
1. Utilizador com `restrictGeo: true`
2. GPS falha (sem permissões)
3. Fazer picagem
4. **Esperado**: Sucesso + sem GPS + anomalia `MISSING_GPS`
5. ⚠️ **NOTA**: Bypass da restrição geográfica por falha técnica

---

## 📊 Impacto na Base de Dados

### Tabela `time_logs`
- `check_in_coordinates`: pode ser `NULL` quando GPS falha
- `check_out_coordinates`: pode ser `NULL` quando GPS falha
- `check_in_location`: mostra "Localização não disponível" quando GPS falha

### Tabela `anomalies`
Novos registos do tipo:
```json
{
  "type": "MISSING_GPS",
  "description": "Picagem registada sem GPS: Geolocation timeout",
  "severity": "LOW",
  "status": "PENDING",
  "detected_by": "SISTEMA_GPS"
}
```

---

## 🚀 Próximos Passos

1. ✅ **COMPLETO** - Implementação GPS opcional
2. 🎯 **RECOMENDADO** - Testar cenários acima
3. 🎯 **RECOMENDADO** - Build e deploy
4. 🎯 **OPCIONAL** - Dashboard de anomalias GPS para RH
5. 🎯 **OPCIONAL** - Alertas automáticos se utilizador tem muitas anomalias GPS

---

## 📈 Métricas de Anomalias GPS

**Monitorização sugerida**:
- Nº de picagens sem GPS por utilizador/mês
- % de falhas GPS por dispositivo
- Padrões temporais (GPS falha sempre à mesma hora?)
- Locais com mais falhas GPS

**Ações corretivas**:
- Utilizadores com >30% falhas GPS → verificar dispositivo
- Padrão de falhas sempre no mesmo local → investigar
- GPS sempre negado → formação do utilizador

---

**Fim do Resumo** 🎉
