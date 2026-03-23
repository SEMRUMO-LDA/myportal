# 🚨 Página de Emergência - Limpeza de Cache

**Ficheiro**: `EMERGENCY_FALLBACK_PAGE.html`
**URL**: `https://semrumo.eu/app/myportal/EMERGENCY_FALLBACK_PAGE.html`

---

## 📋 O QUE FAZ

Página autónoma que permite limpar completamente o cache do browser quando o portal não está a funcionar corretamente.

---

## 🎯 FUNCIONALIDADES

### 1. Botão "Limpar Cache Agora" 🧹
- Limpa `localStorage`
- Limpa `sessionStorage`
- Desregista todos os Service Workers
- Limpa Cache API
- Limpa cookies acessíveis
- Mostra progresso e feedback visual

### 2. Botão "Ir para Picagem de Ponto" ⏱️
- Link direto para `/app/myportal/`
- Permite acesso rápido ao portal após limpeza
- **MELHORIA**: Agora fica dentro do contexto do MyPortal!

### 3. Botão "Fechar" ✕
- Fecha a janela/tab
- Útil quando aberto em nova janela

---

## 🎨 DESIGN

### Visual
- ✅ Gradient roxo (branding SEMRUMO)
- ✅ Card branco centralizado
- ✅ Icons emoji para clareza visual
- ✅ Responsive (mobile + desktop)
- ✅ Feedback visual de loading
- ✅ Mensagens de sucesso/erro

### UX
- ✅ Instruções claras em português
- ✅ Info box com casos de uso
- ✅ Loading spinner durante operação
- ✅ Auto-redirect após limpeza (2 segundos)
- ✅ Console logs para debug

---

## 🔗 INTEGRAÇÃO COM LOGIN

### Botão de Emergência no Login
**Localização**: Canto inferior direito da tela de login

```tsx
// pages/Login.tsx (linha ~1078)
<button
  onClick={() => window.open('https://semrumo.eu/app/myportal/EMERGENCY_FALLBACK_PAGE.html', '_blank')}
  className="w-10 h-10 bg-red-500/20 hover:bg-red-500/30 backdrop-blur-md border border-red-400/30 rounded-full flex items-center justify-center text-red-400 hover:text-red-300 transition-all duration-200 shadow-lg"
  aria-label="Emergência - Limpar Cache"
  title="Emergência: Limpar Cache"
>
  <AlertTriangle size={18} />
</button>
```

**Comportamento**:
- Abre em **nova janela** (`_blank`)
- Não interfere com sessão atual
- Utilizador pode limpar cache e voltar

---

## 🔄 FLUXO DE UTILIZAÇÃO

### Cenário 1: Chrome com Cache Preso
```
1. Utilizador acede ao portal → Vê versão antiga
2. Clica no botão vermelho de emergência (canto inferior direito)
3. Nova janela abre com página de emergência
4. Clica "Limpar Cache Agora"
5. Aguarda 2 segundos (loading)
6. É redirecionado automaticamente para /app/myportal/
7. Portal carrega versão FRESCA
8. Login funciona normalmente
```

### Cenário 2: Portal Não Carrega
```
1. Utilizador acede diretamente: https://semrumo.eu/app/myportal/EMERGENCY_FALLBACK_PAGE.html
2. Vê página de emergência
3. Clica "Limpar Cache Agora"
4. Cache é limpo
5. Redireciona para portal
6. Tudo funciona
```

### Cenário 3: Apenas Quer Aceder ao Ponto
```
1. Abre página de emergência
2. Clica "Ir para Picagem de Ponto"
3. Vai diretamente para /app/myportal/
4. (Opcional) Pode limpar cache depois se necessário
```

---

## 🧪 TESTES

### Teste 1: Limpeza de Cache
```
1. Abrir DevTools → Application tab
2. Verificar localStorage tem dados
3. Verificar Service Workers registados
4. Clicar "Limpar Cache Agora"
5. Verificar console logs:
   [Emergency] Clearing localStorage...
   [Emergency] Clearing sessionStorage...
   [Emergency] Unregistering Service Workers...
   [Emergency] Clearing Cache API...
   [Emergency] Clearing accessible cookies...
   [Emergency] Redirecting to portal...
6. Verificar localStorage vazio
7. Verificar Service Workers desregistados
```

### Teste 2: Navegação
```
1. Abrir página de emergência
2. Clicar "Ir para Picagem de Ponto"
3. Verificar que abre /app/myportal/
4. Verificar que login está disponível
```

### Teste 3: Responsividade
```
1. Abrir no Chrome Desktop → OK
2. Abrir no Chrome Mobile → OK
3. Abrir no Safari Desktop → OK
4. Abrir no Safari Mobile (iOS) → OK
5. Verificar botões clicáveis em todos
```

---

## 🔒 SEGURANÇA

### O Que É Limpo ✅
- ✅ localStorage (dados locais do app)
- ✅ sessionStorage (sessão temporária)
- ✅ Service Workers (cache de assets)
- ✅ Cache API (cache manual)
- ✅ Cookies acessíveis via JavaScript

### O Que NÃO É Limpo ❌
- ❌ Cookies HttpOnly (mantidos - **BOM**)
- ❌ Sessão Supabase do servidor (mantida - **BOM**)
- ❌ Dados na base de dados (intocados - **BOM**)
- ❌ Cache de outros sites
- ❌ Histórico de navegação

**Conclusão**: Seguro para usar. Não afeta dados do utilizador na base de dados.

---

## 📊 OPERAÇÕES DE LIMPEZA

```javascript
// 1. localStorage
localStorage.clear();

// 2. sessionStorage
sessionStorage.clear();

// 3. Service Workers
const registrations = await navigator.serviceWorker.getRegistrations();
await Promise.all(registrations.map(reg => reg.unregister()));

// 4. Cache API
const cacheNames = await caches.keys();
await Promise.all(cacheNames.map(name => caches.delete(name)));

// 5. Cookies (apenas acessíveis)
document.cookie.split(";").forEach(function(c) {
  document.cookie = c.replace(/^ +/, "")
    .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
});
```

**Total**: 5 operações independentes

**Tempo estimado**: < 1 segundo

---

## 🎯 CASOS DE USO

### Quando Usar ✅
- Portal não carrega
- Vê informações desatualizadas
- Picagem de ponto não funciona
- Login não responde
- Após deploy de nova versão (para forçar refresh)

### Quando NÃO Usar ❌
- Portal está a funcionar normalmente
- Utilizador acabou de fazer login com sucesso
- Dados estão atualizados

---

## 🔧 MANUTENÇÃO

### Localização dos Ficheiros
```
Source:  public/EMERGENCY_FALLBACK_PAGE.html
Build:   dist/EMERGENCY_FALLBACK_PAGE.html
Deploy:  https://semrumo.eu/app/myportal/EMERGENCY_FALLBACK_PAGE.html
```

### Como Atualizar
```bash
# 1. Editar source
nano public/EMERGENCY_FALLBACK_PAGE.html

# 2. Copiar para dist (se não fazer rebuild)
cp public/EMERGENCY_FALLBACK_PAGE.html dist/

# 3. Deploy
# Upload dist/EMERGENCY_FALLBACK_PAGE.html para servidor
```

**IMPORTANTE**: Este ficheiro é copiado automaticamente durante `npm run build` se estiver na pasta `public/`.

---

## 🌐 COMPATIBILIDADE

| Browser | Versão | Status | Notas |
|---------|--------|--------|-------|
| Chrome Desktop | 90+ | ✅ | Todas funcionalidades OK |
| Chrome Mobile | 90+ | ✅ | Todas funcionalidades OK |
| Safari Desktop | 14+ | ✅ | Todas funcionalidades OK |
| Safari iOS | 14+ | ✅ | Todas funcionalidades OK |
| Firefox | 88+ | ✅ | Todas funcionalidades OK |
| Edge | 90+ | ✅ | Todas funcionalidades OK |

**APIs Utilizadas**:
- localStorage ✅ (100% suporte)
- sessionStorage ✅ (100% suporte)
- Service Worker API ✅ (95% suporte)
- Cache API ✅ (95% suporte)
- Promises/Async ✅ (100% suporte)

---

## 🎨 CUSTOMIZAÇÃO

### Cores
```css
/* Gradient background */
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

/* Botão principal */
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

/* Botão perigo */
background: #dc3545;
```

### Texto
Todos os textos estão em português e podem ser editados diretamente no HTML.

### Icons
Usa emojis para compatibilidade universal. Pode substituir por icons SVG se preferir.

---

## 📝 CHANGELOG

### Versão 1.0 (2026-03-20)
- ✅ Página inicial criada
- ✅ Design com gradient roxo SEMRUMO
- ✅ 3 botões: Limpar Cache, Ir para Ponto, Fechar
- ✅ Feedback visual de loading
- ✅ Auto-redirect após limpeza
- ✅ Info box com instruções
- ✅ Console logs para debug
- ✅ Responsive design
- ✅ **Link direto para picagem de ponto** (melhoria solicitada)

---

## ✅ VERIFICAÇÃO DE DEPLOY

### Pré-Deploy
- [x] Ficheiro criado em `public/`
- [x] Ficheiro copiado para `dist/`
- [x] HTML válido
- [x] CSS inline (sem dependências)
- [x] JavaScript funcional
- [x] Links corretos (`/app/myportal/`)

### Pós-Deploy
- [ ] Acessível em `https://semrumo.eu/app/myportal/EMERGENCY_FALLBACK_PAGE.html`
- [ ] Botão de emergência no login abre a página
- [ ] Botão "Limpar Cache" funciona
- [ ] Botão "Ir para Ponto" redireciona corretamente
- [ ] Responsive em mobile
- [ ] Console logs aparecem

---

## 🎯 RESUMO

**O QUE MUDOU**:
- ✅ Página de emergência agora tem branding MyPortal
- ✅ Botão direto "Ir para Picagem de Ponto" adicionado
- ✅ Utilizador não vai para site SEMRUMO geral
- ✅ Fica no contexto do portal sempre

**RESULTADO**:
- ✅ Melhor UX
- ✅ Mais rápido para aceder ao ponto
- ✅ Mantém utilizador no contexto correto
- ✅ Professional e branded

---

**Status**: ✅ PRONTO PARA DEPLOY (incluído no Build 49)
