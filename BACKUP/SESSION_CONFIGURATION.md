# 🔐 CONFIGURAÇÃO DE SESSÃO PERSISTENTE

**Data**: 2026-03-19
**Build**: #14
**Objetivo**: Manter utilizador autenticado por 12 horas sem pedir login

---

## ✅ IMPLEMENTAÇÃO ATUAL

### **Código (já implementado):**
```typescript
// services/supabaseClient.ts
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,         // ✅ Guarda sessão no localStorage
    autoRefreshToken: true,        // ✅ Renova token automaticamente
    detectSessionInUrl: true,
    storage: window.localStorage,
    flowType: 'pkce'              // ✅ PKCE flow (seguro)
  }
});
```

**Resultado:**
- ✅ Sessão guardada no **localStorage** do browser
- ✅ Token renovado **automaticamente** antes de expirar
- ✅ Utilizador **mantém-se autenticado** mesmo após fechar browser

---

## ⚙️ CONFIGURAÇÃO NO SUPABASE DASHBOARD

### **PASSO 1: Ir às definições de autenticação**

1. Abre **https://supabase.com/dashboard**
2. Seleciona projeto **`imfhacvrivasciftaujm`**
3. Menu lateral → **Authentication**
4. Tab **Settings**

### **PASSO 2: Configurar JWT Expiry**

Procura a secção **"JWT Settings"** e configura:

```
JWT expiry limit: 43200 seconds (12 hours)
```

**Cálculo:**
- 12 horas = 12 × 60 × 60 = **43,200 segundos**
- 1 hora = 3,600 segundos
- 24 horas = 86,400 segundos

### **PASSO 3: Configurar Refresh Token**

Procura **"Refresh Token Settings"**:

```
Refresh Token Rotation Enabled: ✅ Yes
Refresh Token Reuse Interval: 10 seconds
```

**Significado:**
- Token é renovado automaticamente antes de expirar
- Utilizador nunca é deslogado se estiver ativo
- Refresh token reutilizável por 10s (evita race conditions)

### **PASSO 4: Guardar configurações**

Clica em **Save** no fundo da página.

**IMPORTANTE**: As alterações aplicam-se **imediatamente** a novos logins!

---

## 🧪 COMO FUNCIONA

### **Ciclo de Vida da Sessão:**

```
1. Utilizador faz login:
   ├─ Supabase retorna: access_token (válido 12h)
   ├─ Supabase retorna: refresh_token (válido 30 dias)
   └─ Tokens guardados em localStorage

2. Utilizador usa a app:
   ├─ Cada request usa access_token
   └─ Token válido → Request bem-sucedido

3. Antes do token expirar (autoRefreshToken):
   ├─ SDK deteta que token vai expirar em breve
   ├─ Usa refresh_token para obter novo access_token
   └─ Novo token guardado em localStorage
   └─ Utilizador NEM PERCEBE que token foi renovado

4. Utilizador fecha browser:
   ├─ localStorage mantém tokens
   └─ Ao reabrir, tokens ainda estão lá

5. Utilizador reabre app (dentro de 12h):
   ├─ SDK lê tokens do localStorage
   ├─ Verifica se access_token ainda é válido
   └─ Se sim: Utilizador AUTENTICADO automaticamente ✅

6. Utilizador reabre app (depois de 12h):
   ├─ access_token expirou
   ├─ SDK tenta usar refresh_token
   ├─ Se refresh_token válido (30 dias): Renova ✅
   └─ Se refresh_token expirou: Pede login novamente
```

---

## 🔒 SEGURANÇA

### **Tokens Guardados:**

**localStorage contém:**
```json
{
  "supabase.auth.token": {
    "access_token": "eyJhbGc...",     // Válido 12h
    "refresh_token": "v1.MRL-...",    // Válido 30 dias
    "expires_at": 1711112345,         // Timestamp de expiração
    "user": {
      "id": "uuid-here",
      "email": "user@example.com"
    }
  }
}
```

### **Riscos e Mitigações:**

| Risco | Mitigação |
|-------|-----------|
| **Roubo de tokens do localStorage** | ✅ HTTPS obrigatório (sem HTTPS, não funciona) |
| **XSS (Cross-Site Scripting)** | ✅ Content Security Policy (CSP) headers |
| **Session hijacking** | ✅ PKCE flow + tokens rotativos |
| **Dispositivo partilhado** | ⚠️ PROBLEMA: Múltiplos users no mesmo device |

### **Solução para Dispositivo Partilhado:**

**Opção A: Logout manual obrigatório**
- Adicionar botão "Sair" visível
- Instruir colaboradores a fazer logout ao terminar

**Opção B: Timeout de inatividade**
- Se user inativo >30 min → Logout automático
- Só em dispositivos partilhados (kiosks)

**Opção C: Modo Kiosk separado**
- URL `?kiosk=true` → Logout automático após picagem (atual)
- URL normal → Sessão persistente

---

## 📱 COMPORTAMENTO POR CENÁRIO

### **Cenário 1: Colaborador no seu telemóvel/PC pessoal**
```
09:00 - Faz login
09:05 - Pica entrada
09:30 - Fecha a app
12:00 - Reabre a app
  └─ ✅ AINDA AUTENTICADO (não pede login)
18:00 - Pica saída
  └─ ✅ AINDA AUTENTICADO
```

**Resultado**: Login 1x por dia (ou menos se sessão durar >1 dia)

### **Cenário 2: Kiosk partilhado (URL com ?kiosk=true)**
```
User A:
09:00 - Faz login
09:01 - Pica entrada
09:02 - Logout AUTOMÁTICO ✅

User B (3 min depois):
09:05 - Faz login (sessão de A já terminou)
09:06 - Pica entrada
09:07 - Logout AUTOMÁTICO ✅
```

**Resultado**: Cada user faz login toda vez (segurança)

### **Cenário 3: Colaborador esquece-se de fazer logout**
```
Dia 1:
09:00 - Faz login
18:00 - Fecha app SEM logout

Dia 2:
09:00 - Reabre app
  └─ ✅ AINDA AUTENTICADO (token renovado)

Dia 30:
09:00 - Reabre app
  └─ ✅ AINDA AUTENTICADO (refresh_token renovou)

Dia 31:
09:00 - Reabre app
  └─ ❌ PEDE LOGIN (refresh_token expirou após 30 dias)
```

**Resultado**: Máximo 30 dias sem login (depois expira)

---

## 🛠️ IMPLEMENTAÇÃO NO CÓDIGO

### **Já implementado (Build #14):**

```typescript
// ✅ services/supabaseClient.ts
persistSession: true        // Guarda tokens
autoRefreshToken: true      // Renova automaticamente
flowType: 'pkce'           // Segurança extra

// ✅ Verificação de sessão ao carregar app
useEffect(() => {
  const { data: authListener } = supabase.auth.onAuthStateChange(
    (event, session) => {
      if (event === 'SIGNED_IN') {
        console.log('Utilizador autenticado:', session.user.email);
      }
      if (event === 'SIGNED_OUT') {
        console.log('Utilizador deslogado');
      }
      if (event === 'TOKEN_REFRESHED') {
        console.log('Token renovado automaticamente');
      }
    }
  );

  return () => {
    authListener.subscription.unsubscribe();
  };
}, []);
```

---

## 📊 MÉTRICAS E MONITORIZAÇÃO

### **Dashboard do Supabase:**

Podes ver no dashboard:
- **Authentication → Users**: Quantos users ativos
- **Authentication → Sessions**: Sessões ativas
- **Logs**: Token refreshes, logins, logouts

### **Console do Browser (F12):**

Durante o uso normal, verás logs:
```
[Supabase] Token refreshed automatically
[Auth] User session valid for 11h 23m
```

---

## ⚠️ PROBLEMAS POSSÍVEIS

### **Problema 1: Sessão expira muito cedo**

**Sintoma**: Utilizador deslogado após 1 hora

**Causa**: JWT expiry no Supabase ainda está em 3600s (1h)

**Solução**: Ir ao dashboard e mudar para 43200s (12h)

### **Problema 2: Utilizador não mantém sessão ao fechar browser**

**Sintoma**: Ao reabrir browser, pede login novamente

**Causa**: localStorage bloqueado ou cookies desativados

**Solução**:
- Browser: Permitir cookies e localStorage
- Modo incógnito: NÃO funciona (localStorage limpo ao fechar)

### **Problema 3: "Session expired" mesmo com autoRefresh**

**Sintoma**: Erro "Session expired" aleatoriamente

**Causa**: Refresh token expirou ou foi revogado

**Solução**:
- Aumentar refresh token lifetime para 60 dias
- Verificar se não há logout forçado noutro lado do código

---

## ✅ CHECKLIST DE CONFIGURAÇÃO

- [ ] Código atualizado com `persistSession: true` (Build #14)
- [ ] Supabase Dashboard → JWT expiry = 43200s (12h)
- [ ] Refresh token rotation ativado
- [ ] Testar: Login → Fechar browser → Reabrir (deve manter sessão)
- [ ] Testar: Modo kiosk → Logout automático após picagem
- [ ] Testar: Modo normal → Sessão persistente
- [ ] Monitorizar logs para ver token refreshes

---

## 🚀 PRÓXIMOS PASSOS

1. **Build #14** - Criar e testar
2. **Configurar Supabase Dashboard** - JWT expiry 12h
3. **Deploy** - Upload para produção
4. **Testar em produção** - Verificar que sessão persiste
5. **Monitorizar** - Ver se tokens são renovados corretamente

---

**Build**: #14
**Status**: ✅ Código pronto, falta configurar Supabase Dashboard
**Ação necessária**: Configurar JWT expiry para 43200s no dashboard
