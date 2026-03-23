# 🔧 BUILD #18 - CHANGELOG

**Data**: 2026-03-19 10:29:12
**Build anterior**: #17
**Tipo**: Correção crítica (bugfix)

---

## 🐛 PROBLEMA IDENTIFICADO

No **Build #17**, foi descoberto que o utilizador era **automaticamente desconectado** após registar entrada ou saída no **KioskDashboard**.

### **Comportamento incorreto (Build #17):**

```typescript
// pages/KioskDashboard.tsx - Linha 999 (ENTRADA)
await onClockIn(user);
await new Promise(resolve => setTimeout(resolve, 500));
onLogout(); // ❌ LOGOUT AUTOMÁTICO

// pages/KioskDashboard.tsx - Linha 1039 (SAÍDA)
await onClockOut(user);
await new Promise(resolve => setTimeout(resolve, 500));
onLogout(); // ❌ LOGOUT AUTOMÁTICO
```

### **Impacto:**
- Utilizador faz login
- Regista entrada/saída
- **É imediatamente desconectado**
- Volta ao ecrã de login
- Tem que fazer login novamente para aceder ao portal

**Isto contradiz o requisito** de sessão persistente de 12 horas e a intenção de manter o utilizador autenticado no portal.

---

## ✅ CORREÇÃO APLICADA

Removido o `onLogout()` após picagem e substituído por toast de sucesso.

### **Comportamento correto (Build #18):**

```typescript
// pages/KioskDashboard.tsx - Linha 999 (ENTRADA)
await onClockIn(user);
await new Promise(resolve => setTimeout(resolve, 500));
// CORREÇÃO: NÃO fazer logout - utilizador fica no portal
addToast('success', 'Entrada registada com sucesso!');

// pages/KioskDashboard.tsx - Linha 1041 (SAÍDA)
await onClockOut(user);
await new Promise(resolve => setTimeout(resolve, 500));
// CORREÇÃO: NÃO fazer logout - utilizador fica no portal
addToast('success', 'Saída registada com sucesso!');
```

---

## 📝 ALTERAÇÕES DETALHADAS

### **Ficheiro modificado:**
- [pages/KioskDashboard.tsx](pages/KioskDashboard.tsx)

### **Linhas alteradas:**

#### **Botão ENTRADA (linha ~991-1006):**

**ANTES:**
```typescript
await onClockIn(user);
await new Promise(resolve => setTimeout(resolve, 500));
onLogout(); // ❌ Faz logout automático
```

**DEPOIS:**
```typescript
await onClockIn(user);
await new Promise(resolve => setTimeout(resolve, 500));
// CORREÇÃO: NÃO fazer logout - utilizador fica no portal
addToast('success', 'Entrada registada com sucesso!'); // ✅ Apenas toast
```

#### **Botão SAÍDA (linha ~1032-1047):**

**ANTES:**
```typescript
await onClockOut(user);
await new Promise(resolve => setTimeout(resolve, 500));
onLogout(); // ❌ Faz logout automático
```

**DEPOIS:**
```typescript
await onClockOut(user);
await new Promise(resolve => setTimeout(resolve, 500));
// CORREÇÃO: NÃO fazer logout - utilizador fica no portal
addToast('success', 'Saída registada com sucesso!'); // ✅ Apenas toast
```

---

## 🎯 FLUXO ESPERADO (Build #18)

### **Fluxo de ENTRADA:**

1. ✅ Utilizador faz login (ID + PIN)
2. ✅ Entra no KioskDashboard
3. ✅ Clica no botão "ENTRADA" (verde)
4. ✅ Sistema pede geolocalização (obrigatória)
5. ✅ Utilizador permite permissão GPS
6. ✅ Sistema valida restrições geográficas (se `restrictGeo: true`)
7. ✅ Picagem de entrada é registada
8. ✅ **Toast verde aparece**: "Entrada registada com sucesso!"
9. ✅ **Utilizador PERMANECE no portal** (dashboard atualiza para mostrar "Em trabalho")
10. ✅ Sessão mantém-se ativa

### **Fluxo de SAÍDA:**

1. ✅ Utilizador já está autenticado no KioskDashboard
2. ✅ Estado mostra "Em trabalho" (botão SAÍDA visível, vermelho)
3. ✅ Clica no botão "SAÍDA" (vermelho)
4. ✅ Sistema pede geolocalização (obrigatória)
5. ✅ Utilizador permite permissão GPS
6. ✅ Picagem de saída é registada
7. ✅ **Toast verde aparece**: "Saída registada com sucesso!"
8. ✅ **Utilizador PERMANECE no portal** (dashboard atualiza para mostrar "Fora de trabalho")
9. ✅ Sessão mantém-se ativa

---

## 🔒 QUANDO O LOGOUT ACONTECE

O logout **apenas** acontece nas seguintes situações:

### **1. Logout manual:**
- Utilizador clica no botão de logout (canto superior direito)
- Ícone: `<LogOut />` (vermelho)

### **2. Inatividade (Idle Timeout):**
- Após **5 minutos** de inatividade
- Aviso aparece **30 segundos antes**
- Implementado em `useIdleTimeout` hook

### **3. Logout voluntário:**
- Utilizador sai da aplicação intencionalmente
- Clica em "Sair" no menu

**Logout NÃO acontece em:**
- ✅ Após picagem de entrada
- ✅ Após picagem de saída
- ✅ Após navegar entre páginas
- ✅ Após fechar e reabrir browser (sessão persistente 12h)

---

## 🧪 TESTES NECESSÁRIOS

### **Teste 1: Entrada sem logout**

```
1. Login com ID + PIN
2. Clicar "ENTRADA"
3. Permitir geolocalização
4. ✅ VERIFICAR: Toast "Entrada registada com sucesso!" aparece
5. ✅ VERIFICAR: Dashboard mostra "Em trabalho"
6. ✅ VERIFICAR: Utilizador CONTINUA no portal (não volta ao login)
7. ✅ VERIFICAR: Pode navegar para outras páginas
```

### **Teste 2: Saída sem logout**

```
1. Utilizador já está "Em trabalho"
2. Clicar "SAÍDA"
3. Permitir geolocalização
4. ✅ VERIFICAR: Toast "Saída registada com sucesso!" aparece
5. ✅ VERIFICAR: Dashboard mostra "Fora de trabalho"
6. ✅ VERIFICAR: Utilizador CONTINUA no portal
7. ✅ VERIFICAR: Pode registar nova entrada sem fazer login novamente
```

### **Teste 3: Sessão persistente após picagem**

```
1. Login + Picar entrada
2. Fechar browser completamente
3. Reabrir browser
4. Ir para https://semrumo.eu/app/myportal/
5. ✅ VERIFICAR: Entra automaticamente (sem pedir login)
6. ✅ VERIFICAR: Estado correto ("Em trabalho" se ainda não saiu)
```

---

## 📊 COMPARAÇÃO DE COMPORTAMENTO

| Ação | Build #17 (ERRADO) | Build #18 (CORRETO) |
|------|-------------------|---------------------|
| **Após ENTRADA** | ❌ Logout automático | ✅ Permanece no portal |
| **Após SAÍDA** | ❌ Logout automático | ✅ Permanece no portal |
| **Toast de sucesso** | ❌ Não aparecia | ✅ Aparece verde |
| **Navegação pós-picagem** | ❌ Impossível (logout) | ✅ Totalmente funcional |
| **Sessão persistente** | ⚠️ Interrompida pela picagem | ✅ Mantida (12h) |
| **Idle timeout** | ✅ 5 minutos | ✅ 5 minutos (inalterado) |

---

## 🔍 VERIFICAÇÃO NO CÓDIGO

Para confirmar que a correção foi aplicada, verificar:

```bash
# Procurar por onLogout após clock
grep -A5 "onClockIn\|onClockOut" pages/KioskDashboard.tsx

# NÃO deve aparecer "onLogout()" após as picagens
# Deve aparecer "addToast('success'" em vez disso
```

**Resultado esperado:**
```typescript
await onClockIn(user);
// ...
addToast('success', 'Entrada registada com sucesso!'); // ✅

await onClockOut(user);
// ...
addToast('success', 'Saída registada com sucesso!'); // ✅
```

---

## ⚠️ NOTAS IMPORTANTES

### **1. Login.tsx NÃO foi afetado**

O ficheiro [pages/Login.tsx](pages/Login.tsx) **já estava correto** desde Build #12.

Na linha 284-290, o código já **NÃO fazia logout** após picagem no modo Kiosk:

```typescript
// Login.tsx - Linha 284-290 (JÁ CORRETO)
if (result.success) {
  setShowKioskSuccess(true);

  // CORREÇÃO: NÃO fazer logout - utilizador fica no portal após picagem
  setTimeout(() => {
    setShowKioskSuccess(false);
    setKioskSuccessUser('');
  }, 3000);
}
```

**O problema estava APENAS em KioskDashboard.tsx**, onde havia botões de entrada/saída que faziam logout.

### **2. Dois locais de picagem**

A aplicação tem **dois locais** onde o utilizador pode picar:

#### **A) Login.tsx - Modo Kiosk**
- Ecrã de login com "Modo Kiosk" ativado
- Utilizador pica **sem entrar** no portal completo
- ✅ **JÁ estava correto** (Build #12)

#### **B) KioskDashboard.tsx - Portal completo**
- Utilizador faz login completo (ID + PIN)
- Entra no dashboard e pica de dentro do portal
- ❌ **Estava errado** (Build #17) → ✅ **Corrigido** (Build #18)

---

## 📚 DOCUMENTAÇÃO RELACIONADA

- [RESUMO_BUILD_17.md](RESUMO_BUILD_17.md) - Funcionalidades do Build #17
- [SESSION_CONFIGURATION.md](SESSION_CONFIGURATION.md) - Configuração de sessão persistente
- [GEOLOCATION_IMPLEMENTATION.md](GEOLOCATION_IMPLEMENTATION.md) - Sistema de geolocalização
- [DEPLOY_BUILD_17.md](DEPLOY_BUILD_17.md) - Instruções de deploy (aplicam-se também ao #18)

---

## ✅ ESTADO FINAL

**Build #18** mantém TODAS as funcionalidades do Build #17, MAIS a correção:

✅ Sessão persistente de 12 horas
✅ Geolocalização SEMPRE obrigatória
✅ Validação de restrições geográficas (restrictGeo)
✅ Login ultra-rápido (< 3 segundos)
✅ Performance otimizada (86% menos queries)
✅ **Utilizador NÃO é desconectado após picagem** ← **NOVO**

---

**Build #18** está **pronto para produção** e resolve completamente o problema de logout indesejado após picagem.

