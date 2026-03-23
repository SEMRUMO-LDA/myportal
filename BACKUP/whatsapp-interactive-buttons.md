# 📍 WhatsApp Localização Automática - Métodos Possíveis

## 🚀 Método 1: Interactive Location Request Button

### Como funciona:
1. Empresa envia mensagem com botão "Compartilhar Localização"
2. Utilizador clica no botão
3. WhatsApp abre diretamente o seletor de localização
4. Um clique para enviar

### Implementação via Wassenger API:

```javascript
// Enviar mensagem com botão de localização
const sendLocationRequest = async (phone) => {
  const response = await fetch('https://api.wassenger.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_API_KEY'
    },
    body: JSON.stringify({
      phone: phone,
      message: "📍 Por favor, partilhe a sua localização para registar entrada:",
      buttons: [
        {
          type: "location_request",
          text: "📍 Enviar Localização"
        }
      ]
    })
  });
};
```

## 🤖 Método 2: WhatsApp Flows (Novo!)

WhatsApp Flows permite criar formulários interativos que podem:
- Solicitar localização automaticamente
- Criar fluxos de múltiplos passos
- Integração mais fluida

### Configuração:
1. Criar um Flow no WhatsApp Business
2. Adicionar step de "Location Request"
3. Processar no webhook

## 📱 Método 3: Link Direto WhatsApp com Geo

Criar links que abrem WhatsApp com localização pré-preenchida:

```javascript
// Gerar link para WhatsApp com localização
function generateWhatsAppGeoLink(lat, lng, message) {
  const text = encodeURIComponent(message);
  return `https://wa.me/351XXXXXX?text=${text}&location=${lat},${lng}`;
}
```

## 🔄 Método 4: Template Messages com Location Request

Templates pré-aprovados pelo WhatsApp que incluem:
- Botão de solicitação de localização
- Mensagem personalizada
- Aprovação mais rápida do WhatsApp

### Template Example:
```json
{
  "name": "clock_in_request",
  "language": "pt_PT",
  "components": [
    {
      "type": "body",
      "text": "Olá {{1}}, clique para registar entrada com localização:"
    },
    {
      "type": "button",
      "sub_type": "location_request",
      "text": "📍 Registar Entrada"
    }
  ]
}
```

## 🌐 Método 5: Progressive Web App (PWA)

Link enviado via WhatsApp que:
1. Abre uma webpage
2. Solicita permissão GPS
3. Captura localização automaticamente
4. Envia de volta via API

### Fluxo:
1. WhatsApp envia: "Clique para picar: https://app.empresa.pt/clock/TOKEN"
2. Link abre PWA
3. PWA pede GPS uma vez
4. Localização enviada automaticamente

## ⚡ Método 6: WhatsApp Web Device API

Para empresas com dispositivos fixos:
- Tablet/PC no local de trabalho
- WhatsApp Web sempre aberto
- Script que captura localização do dispositivo
- Envia automaticamente quando detecta proximidade

## 🎯 Recomendação: Hybrid Approach

Combinar múltiplos métodos:

1. **Primeira vez**: PWA para configurar
2. **Diariamente**: Interactive buttons
3. **Backup**: Método manual atual

---

## 📋 Próximos Passos:

1. **Verificar plano Wassenger** - Alguns recursos requerem plano Business
2. **Criar templates** - Submeter para aprovação do WhatsApp
3. **Implementar PWA** - Solução mais flexível
4. **Testar Interactive Messages** - Via Wassenger API