# 📱 Automação WhatsApp via Telemóvel

## Android - Tasker/Automate

### Configuração:
1. Instalar app Tasker ou Automate
2. Criar perfil de localização
3. Trigger: Entrar/Sair da zona da empresa
4. Ação: Enviar WhatsApp automático

### Exemplo Tasker:
```
Profile: Entrada Trabalho
  Trigger: Location (Empresa, 50m radius)

  Task: Enviar Picagem
    1. Get Location (GPS)
    2. Open WhatsApp
    3. Send to: +351XXX (Número da empresa)
    4. Text: "ENTRADA"
    5. Attach Location
    6. Send
```

## iPhone - Shortcuts + Automations

### Configuração:
1. Criar Shortcut "Picagem Entrada"
2. Criar Automation baseada em localização
3. Trigger: Chegada ao trabalho
4. Run Shortcut automaticamente

### Shortcut iOS:
```
Shortcut: Picagem Automática
1. Get Current Location
2. Get Contents of URL:
   - URL: wa.me/351XXX?text=ENTRADA
3. Open URL
4. (Semi-automático - user confirma envio)
```

## Alternativa: Widget de 1-Toque

### Android Widget:
- Widget no home screen
- 1 toque = Envia localização + ENTRADA
- App: "WhatsApp Business API Widget"

### iOS Widget:
- Widget no Today View
- 1 toque = Abre WhatsApp com tudo pronto
- Só precisa confirmar envio

## Vantagens:
✅ Pode ser 100% automático (Android)
✅ Usa o WhatsApp oficial
✅ Configuração única por colaborador
✅ Grátis

## Limitações:
⚠️ Cada colaborador tem que configurar
⚠️ iOS tem mais restrições
⚠️ Pode falhar se WhatsApp atualizar