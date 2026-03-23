# ✅ Permissões Default para Novos Colaboradores

**Data**: 2026-03-20
**Status**: ✅ **IMPLEMENTADO**

---

## 🎯 Objetivo

Configurar para que **todos os novos colaboradores** criados no sistema tenham automaticamente as seguintes permissões **ATIVADAS** por defeito:

- ✅ **Picagem manual** (`manualEntry`)
- ✅ **Pedidos Férias** (`vacationRequests`)
- ✅ **Bolsa de Horas** (`hourBank`)

---

## 📝 Alterações Realizadas

### 1. `constants.ts` - DEFAULT_ATTENDANCE_CONFIG

**Localização**: [constants.ts:11-30](constants.ts#L11-L30)

**Antes**:
```typescript
export const DEFAULT_ATTENDANCE_CONFIG: AttendanceConfig = {
  restriction: 'NONE',
  allowedIps: [],
  allowedLocations: []
};
```

**Depois**:
```typescript
export const DEFAULT_ATTENDANCE_CONFIG: AttendanceConfig = {
  restriction: 'NONE',
  allowedIps: [],
  allowedLocations: [],

  // Defaults para novos colaboradores
  manualEntry: true,        // ✅ Picagem manual ON
  vacationRequests: true,   // ✅ Pedidos Férias ON
  hourBank: true,            // ✅ Bolsa de Horas ON

  // Outros defaults
  desktopWebEntry: true,
  mobileWebEntry: true,
  appEntry: true,
  disableAnomalies: false,
  blockEntry: false,
  flexibleSchedule: false,
  restrictIp: false,
  restrictGeo: false
};
```

---

### 2. `pages/UserProfile.tsx` - Form Initial State

**Localização**: [UserProfile.tsx:100-115](pages/UserProfile.tsx#L100-L115)

**Antes**:
```typescript
attendanceConfig: {
  restriction: 'NONE',
  allowedIps: [],
  allowedLocations: [],
  manualEntry: false,       // ❌ OFF
  desktopWebEntry: true,
  mobileWebEntry: true,
  appEntry: true,
  vacationRequests: true,   // ✅ Já estava ON
  disableAnomalies: false,
  hourBank: false,          // ❌ OFF
  blockEntry: false,
  flexibleSchedule: false,
  isRemote: false,
  homeCoordinates: { lat: 0, lng: 0, radius: 100 }
},
```

**Depois**:
```typescript
attendanceConfig: {
  restriction: 'NONE',
  allowedIps: [],
  allowedLocations: [],
  manualEntry: true,        // ✅ ON por defeito
  desktopWebEntry: true,
  mobileWebEntry: true,
  appEntry: true,
  vacationRequests: true,   // ✅ Já estava ON
  disableAnomalies: false,
  hourBank: true,            // ✅ ON por defeito
  blockEntry: false,
  flexibleSchedule: false,
  isRemote: false,
  homeCoordinates: { lat: 0, lng: 0, radius: 100 }
},
```

---

## 🔄 Onde São Aplicados os Defaults

### 1. **Criação de Novo Colaborador**

Quando RH clica em "Criar Nova Ficha":

```
UserProfile.tsx (linha 100-115)
  ↓
Formulário exibe toggles ATIVADOS:
  ✅ Picagem manual = ON
  ✅ Pedidos Férias = ON
  ✅ Bolsa de Horas = ON
  ↓
Ao guardar → App.tsx handleAddUser
  ↓
Grava na DB com valores ON
```

### 2. **Carregamento de Colaboradores Existentes**

Quando carrega colaboradores da base de dados:

```
App.tsx linha 895
  ↓
attendanceConfig: u.attendance_config || DEFAULT_ATTENDANCE_CONFIG
  ↓
Se attendance_config = NULL na DB
  → usa DEFAULT_ATTENDANCE_CONFIG (com as 3 opções ON)
```

### 3. **Merge de Configurações**

Quando edita colaborador existente:

```
UserProfile.tsx linha 166
  ↓
attendanceConfig: {
  ...DEFAULT_ATTENDANCE_CONFIG,  // ← Aplica defaults primeiro
  ...foundUser.attendanceConfig  // ← Sobrescreve com valores da DB
}
```

**Resultado**: Se um campo está `undefined` na DB, usa o default (ON).

---

## 📊 Tabela de Permissões Default

| Permissão | Campo (`attendanceConfig`) | Valor Default | Antes | Depois |
|-----------|----------------------------|---------------|-------|--------|
| **Picagem manual** | `manualEntry` | `true` | ❌ OFF | ✅ **ON** |
| **Pedidos Férias** | `vacationRequests` | `true` | ✅ ON | ✅ **ON** |
| **Bolsa de Horas** | `hourBank` | `true` | ❌ OFF | ✅ **ON** |
| Picagem Web Desktop | `desktopWebEntry` | `true` | ✅ ON | ✅ ON |
| Picagem Web Mobile | `mobileWebEntry` | `true` | ✅ ON | ✅ ON |
| Picagem App | `appEntry` | `true` | ✅ ON | ✅ ON |
| Desativar Anomalias | `disableAnomalies` | `false` | ❌ OFF | ❌ OFF |
| Bloquear Picagem | `blockEntry` | `false` | ❌ OFF | ❌ OFF |
| Horário Flexível | `flexibleSchedule` | `false` | ❌ OFF | ❌ OFF |
| Restrição IP | `restrictIp` | `false` | ❌ OFF | ❌ OFF |
| Restrição Geo | `restrictGeo` | `false` | ❌ OFF | ❌ OFF |

---

## ✅ O Que Cada Permissão Faz

### 1. Picagem Manual (`manualEntry: true`)

**Permite**: Gestor/RH fazer picagem manual para o colaborador no backoffice

**Quando usar**:
- Colaboradores esqueceram-se de picar
- Ajustes de horário autorizados
- Correções de anomalias

**Interface**: Menu "Administração" → "Picagem Manual"

---

### 2. Pedidos Férias (`vacationRequests: true`)

**Permite**: Colaborador submeter pedidos de férias através do portal

**Quando usar**:
- Colaboradores normais que podem pedir férias
- Requer aprovação de gestor/RH

**Interface**: Menu "Ausências" → "Pedidos de Férias" (botão visível)

**Se OFF**: Botão "Pedir Férias" fica oculto/desativado

---

### 3. Bolsa de Horas (`hourBank: true`)

**Permite**: Sistema calcular e acumular horas extra na bolsa de horas do colaborador

**Quando usar**:
- Colaboradores que podem acumular horas extra
- Horas acima do horário são creditadas
- Horas abaixo são debitadas

**Interface**: Dashboard mostra "Bolsa de Horas" com saldo

**Cálculo**:
```
Horas Trabalhadas - Horas Esperadas = Diferença
  → Se positivo: adiciona à bolsa
  → Se negativo: deduz da bolsa
```

---

## 🎯 Cenários de Uso

### Cenário 1: Novo Colaborador Padrão ✅

**Situação**: Contratar novo colaborador normal

**Ação**: Criar nova ficha → preencher dados → guardar

**Resultado**:
- ✅ Pode picar normalmente
- ✅ Pode pedir férias
- ✅ Acumula bolsa de horas
- ✅ RH pode fazer picagem manual se necessário

---

### Cenário 2: Colaborador Especial (Sem Bolsa de Horas) ⚙️

**Situação**: Diretor/CEO que não acumula bolsa de horas

**Ação**:
1. Criar ficha (defaults aplicados)
2. Ir para tab "Acesso"
3. Desativar "Bolsa de Horas" manualmente
4. Guardar

**Resultado**:
- ✅ Pode picar normalmente
- ✅ Pode pedir férias
- ❌ NÃO acumula bolsa de horas
- ✅ RH pode fazer picagem manual

---

### Cenário 3: Estagiário (Sem Pedidos Férias) ⚙️

**Situação**: Estagiário que não tem direito a pedidos de férias

**Ação**:
1. Criar ficha
2. Desativar "Pedidos Férias"
3. Guardar

**Resultado**:
- ✅ Pode picar normalmente
- ❌ Botão "Pedir Férias" não aparece
- ✅ Acumula bolsa de horas
- ✅ RH pode fazer picagem manual

---

## 🔄 Migração de Colaboradores Existentes

### Colaboradores Criados ANTES desta Alteração

**Comportamento**:
- Se `attendance_config` está NULL na DB → aplica defaults (3 opções ON)
- Se `attendance_config` existe mas falta campo → usa default do campo
- Se `attendance_config` tem valores explícitos → mantém valores

**Exemplo**:

```json
// Colaborador antigo com attendance_config = NULL
{
  "id": 123,
  "name": "João Silva",
  "attendance_config": null
}
```

**Ao carregar**:
```typescript
attendanceConfig: u.attendance_config || DEFAULT_ATTENDANCE_CONFIG
// Resultado: aplica defaults (3 opções ON)
```

---

### Colaboradores Criados DEPOIS desta Alteração

**Comportamento**: Sempre criados com as 3 opções ON

```json
{
  "id": 456,
  "name": "Maria Santos",
  "attendance_config": {
    "manualEntry": true,
    "vacationRequests": true,
    "hourBank": true,
    ...
  }
}
```

---

## 🧪 Testes Recomendados

### Teste 1: Criar Novo Colaborador ✅

1. Ir para "Administração" → "Gestão de Utilizadores"
2. Clicar "Criar Nova Ficha"
3. Preencher dados básicos
4. Ir para tab "Acesso"
5. **Verificar**: Os 3 toggles devem estar AZUIS (ON):
   - ✅ Picagem manual
   - ✅ Pedidos Férias
   - ✅ Bolsa de Horas
6. Guardar
7. Refresh e reabrir → verificar que continuam ON

---

### Teste 2: Editar Colaborador Antigo (sem attendance_config) ✅

1. Abrir ficha de colaborador antigo
2. Ir para tab "Acesso"
3. **Verificar**: Toggles devem estar ON (defaults aplicados)
4. Modificar alguma opção (ex: desativar Bolsa de Horas)
5. Guardar
6. Reabrir → verificar que mudança foi mantida

---

### Teste 3: Desativar Permissão Manualmente ✅

1. Criar novo colaborador
2. Desativar "Pedidos Férias"
3. Guardar
4. Fazer login como esse colaborador
5. **Verificar**: Botão "Pedir Férias" não aparece no menu

---

## 📝 Notas Técnicas

### Ordem de Prioridade

```
1. Valores explícitos na DB (se existirem)
2. DEFAULT_ATTENDANCE_CONFIG (se DB = NULL ou campo missing)
3. UserProfile initial state (apenas para formulário vazio)
```

### Merge Strategy

```typescript
{
  ...DEFAULT_ATTENDANCE_CONFIG,  // Base
  ...foundUser.attendanceConfig  // Override
}
```

**Resultado**:
- Campos definidos na DB → usa valor da DB
- Campos undefined na DB → usa default
- attendance_config = NULL → usa todos os defaults

---

## ✅ Checklist Final

- [x] `DEFAULT_ATTENDANCE_CONFIG` atualizado com 3 opções ON
- [x] `UserProfile` initial state atualizado
- [x] Merge strategy mantida (não afeta colaboradores existentes com configs explícitas)
- [x] Novos colaboradores criados com 3 opções ON automaticamente
- [x] Colaboradores antigos sem config recebem defaults ao carregar

---

## 🎉 Resultado Final

**Todos os novos colaboradores** criados a partir de agora terão automaticamente:

- ✅ **Picagem manual** = ON
- ✅ **Pedidos Férias** = ON
- ✅ **Bolsa de Horas** = ON

RH pode desativar manualmente qualquer opção conforme necessário para casos especiais (diretores, estagiários, etc).

---

**Status**: ✅ **PRONTO PARA PRODUÇÃO**

**Ficheiros Alterados**:
- [constants.ts](constants.ts) - linha 11-30
- [pages/UserProfile.tsx](pages/UserProfile.tsx) - linha 100-115

---

**Fim do Resumo** ✅
