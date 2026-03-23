# 🎯 Solução Super Simples - WhatsApp Clock

## Opção A: Auto-Reply no Wassenger (Sem Código!)

### 1. Configurar Auto-Respostas no Wassenger

No painel Wassenger, procura por:
- **Automation** / **Auto-Reply** / **Chatbot**
- **Quick Replies** / **Respostas Automáticas**

### 2. Criar Regras:

```
Palavra-chave: AJUDA
Resposta: 📱 Comandos disponíveis:
• ENTRADA [seu_id]
• SAIDA [seu_id]
• STATUS [seu_id]
```

```
Palavra-chave: ENTRADA
Resposta: ✅ Para registar entrada, aceda a:
https://semrumo.eu/kiosk
```

## Opção B: Google Sheets + Zapier/Make

### 1. Conectar Wassenger ao Google Sheets via Zapier
- Trigger: Nova mensagem WhatsApp
- Action: Adicionar linha ao Google Sheets

### 2. Google Sheets processa e responde
- Script simples que verifica comandos
- Envia resposta via Wassenger API

## Opção C: Script Local Simples

### 1. Criar um script Node.js que roda no teu PC:

```javascript
// whatsapp-bot.js
const express = require('express');
const app = express();

app.post('/webhook', (req, res) => {
  const { from, body } = req.body.data;

  if (body === 'AJUDA') {
    // Enviar resposta via Wassenger API
    sendMessage(from, 'Comandos: ENTRADA, SAIDA, STATUS');
  }

  res.json({ ok: true });
});

app.listen(3000, () => {
  console.log('Bot rodando em http://localhost:3000');
});
```

### 2. Usar ngrok para expor localmente:
```bash
npx ngrok http 3000
```

### 3. Configurar o webhook do Wassenger para o URL do ngrok

## Opção D: Usar n8n (Visual Workflow)

### 1. Instalar n8n (ferramenta no-code)
```bash
npx n8n
```

### 2. Criar workflow visual:
- Webhook trigger
- Switch para comandos
- HTTP Request para Supabase
- Resposta via Wassenger

### Interface visual, sem código!

## Opção E: WhatsApp Business API Oficial

Se tiveres WhatsApp Business:
1. Usa a API oficial do WhatsApp
2. Mais fiável e com mais features
3. Integração direta sem intermediários

## 🎯 Recomendação

**Para já, o mais rápido:**

1. **Testa com webhook.site** para ver se o Wassenger está a enviar
2. **Usa Auto-Reply** do Wassenger para respostas básicas
3. **Depois** implementa solução completa

## 💡 Dica Final

O problema atual pode ser simplesmente:
- Wassenger precisa de plano pago para webhooks
- Webhook está desativado
- Formato do evento é diferente

Verificar primeiro com webhook.site resolve 90% dos casos!