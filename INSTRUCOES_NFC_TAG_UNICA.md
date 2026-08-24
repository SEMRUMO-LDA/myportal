# 📱 Sistema NFC com Tag Única no Escritório

## ✅ Como Funciona

### 1️⃣ **Uma Tag NFC no Escritório**
- Colocada na entrada/recepção
- Todos os colaboradores usam a mesma tag
- Tag programada com URL única

### 2️⃣ **Fluxo de Picagem**
1. **Colaborador aproxima telemóvel** à tag NFC
2. **Abre automaticamente** a página de picagem móvel
3. **Colaborador digita:**
   - Código de colaborador (ID)
   - PIN pessoal
4. **Escolhe** Entrada 🟢 ou Saída 🔴
5. **Sistema regista** e faz logout automático

---

## 🔧 Configuração da Tag NFC

### O que precisa:
- 1 tag NFC (sticker, cartão ou chaveiro)
- App para programar NFC (NFC Tools, TagWriter)

### URL para programar na tag:
```
https://semrumo.eu/app/myportal/picagem-mobile.html
```

Ou para teste local:
```
file:///Users/tiagopacheco/Desktop/MYPORTAL/picagem-mobile.html
```

### Como programar:
1. Abrir app **NFC Tools**
2. Selecionar **Write** → **Add a record** → **URL/URI**
3. Colar o link acima
4. Aproximar tag NFC
5. Gravar

---

## 📍 Instalação no Escritório

### Opção 1: Sticker NFC na Parede
```
┌─────────────────────────┐
│                         │
│    📱 PICAGEM NFC      │
│                         │
│  Aproxime o telemóvel   │
│                         │
└─────────────────────────┘
```

### Opção 2: Placa/Suporte de Mesa
- Colocar na recepção
- Suporte vertical com tag NFC
- Instruções visíveis

### Opção 3: Terminal Dedicado (Opcional)
- Tablet/PC com `terminal-nfc-unico.html` aberto
- Mostra relógio e últimas picagens
- Puramente visual/informativo

---

## 👤 Dados dos Colaboradores

### Cada colaborador precisa saber:
1. **Seu código** (ID numérico)
2. **Seu PIN** (6 dígitos)

### Exemplos:
- Tiago Pacheco: Código **73**, PIN **123456**
- João Silva: Código **100**, PIN **654321**

---

## ✅ Vantagens do Sistema

### Para Colaboradores:
- ✅ **Usa o próprio telemóvel** - Sem cartões extras
- ✅ **Rápido** - 10 segundos para picar
- ✅ **Seguro** - PIN pessoal protege
- ✅ **Intuitivo** - Interface simples

### Para Empresa:
- ✅ **Uma tag apenas** - Custo mínimo (€2)
- ✅ **Sem hardware especial** - Só um sticker
- ✅ **Identificação garantida** - ID + PIN
- ✅ **Logout automático** - Próximo usa limpo

---

## 🔒 Segurança

### Implementado:
- **Autenticação dupla** - ID + PIN
- **Logout automático** - Após 3 segundos
- **Sem dados em cache** - Limpa ao sair
- **HTTPS em produção** - Comunicação segura

### Boas Práticas:
- Cada colaborador tem PIN único
- Alterar PINs periodicamente
- Não partilhar credenciais
- Tag em local visível/supervisionado

---

## 📱 Requisitos

### Telemóveis Compatíveis:
- **iPhone**: 7 ou superior (iOS 11+)
- **Android**: Com NFC (maioria desde 2015)

### Como verificar NFC:
- **iPhone**: Sempre ativo (modelos compatíveis)
- **Android**: Configurações → Conexões → NFC

---

## 🚀 Teste Rápido

### Para testar agora:
1. Abrir `picagem-mobile.html` no telemóvel
2. Digitar código: **73**
3. Digitar PIN: **123456**
4. Testar botões Entrada/Saída

### Para simular NFC:
1. Criar atalho no telemóvel para a página
2. Colocar no ecrã inicial
3. Um toque abre a picagem

---

## 📊 Monitorização

### Dashboard de Picagens:
- Ver em tempo real no Supabase
- Filtrar por colaborador/data
- Exportar relatórios

### Logs do Sistema:
- Método: `NFC_MOBILE`
- Local: `Escritório - Terminal NFC`
- Timestamp preciso

---

## 🆘 Resolução de Problemas

### "NFC não funciona"
- Verificar se NFC está ativo
- Aproximar mais o telemóvel
- Tentar zona diferente do telemóvel
- Limpar cache do browser

### "Página não abre"
- Verificar conexão internet
- Tentar outro browser
- Reprogramar tag com URL

### "PIN incorreto"
- Verificar com RH
- Reset de PIN se necessário

---

## 💡 Melhorias Futuras

1. **Biometria** - Face ID/Fingerprint em vez de PIN
2. **QR Code backup** - Alternativa se NFC falhar
3. **Notificações** - Confirmar picagem por push
4. **Modo offline** - Guardar e sincronizar depois

---

## 📞 Suporte

**Problemas técnicos:**
- Email: suporte@semrumo.pt
- WhatsApp: [número]

**Questões RH:**
- Email: rh@semrumo.pt
- Extensão: [número]

---

**Implementação:** MyPortal Team
**Data:** 23/03/2024
**Versão:** 1.0 - Tag Única