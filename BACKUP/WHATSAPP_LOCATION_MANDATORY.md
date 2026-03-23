# 📍 WhatsApp Clock - Localização Obrigatória

## ⚠️ IMPORTANTE: Localização agora é OBRIGATÓRIA

### 🔒 Regras de Segurança:

1. **SEM LOCALIZAÇÃO = SEM PICAGEM**
2. **Identificação automática** pelo número WhatsApp
3. **Cada um só pode picar por si próprio**
4. **GPS sempre registado** na base de dados

## 📱 Como fazer picagem:

### Passo 1: Enviar Localização (OBRIGATÓRIO)
1. Abrir WhatsApp
2. Clicar no 📎 (anexo)
3. Escolher 📍 **Localização**
4. Enviar **localização atual**

### Passo 2: Enviar Comando
- `ENTRADA` - Para registar entrada
- `SAIDA` - Para registar saída

## ❌ O que acontece sem localização?

Se tentar enviar `ENTRADA` ou `SAIDA` sem primeiro enviar localização:

```
📍 Localização obrigatória!

Para registar ENTRADA, deve primeiro:
1. Clicar no 📎 (anexo)
2. Escolher 📍 Localização
3. Enviar localização atual
4. Depois enviar ENTRADA

⚠️ A localização é obrigatória para controlo de presença.
```

## ✅ Comandos disponíveis:

| Comando | Localização | Descrição |
|---------|-------------|-----------|
| `STATUS` | ❌ Não precisa | Ver estado atual |
| `ENTRADA` | ✅ OBRIGATÓRIA | Registar entrada |
| `SAIDA` | ✅ OBRIGATÓRIA | Registar saída |
| `AJUDA` | ❌ Não precisa | Ver comandos |

## 🗺️ O que é registado:

- **Latitude e Longitude** exactas
- **Nome do local** (se disponível)
- **Hora exacta** da picagem
- **Fonte**: WhatsApp

## 📊 Exemplo de registo completo:

```
✅ Tiago Jorge da Silva Pacheco
Entrada registada às 16:45
📍 Local: Rua da Empresa 123, Porto
```

Na base de dados:
- `check_in_lat`: 41.1579
- `check_in_lng`: -8.6291
- `check_in_location`: "Rua da Empresa 123, Porto"
- `check_in`: "16:45:00"
- `source`: "whatsapp"

## 🚀 Deploy no Supabase:

1. Aceda a **Edge Functions** > `whatsapp-webhook`
2. **Substitua o código** pelo ficheiro atualizado
3. Mantenha **"Verify JWT" DESATIVADO**
4. **Deploy**

## 💼 Benefícios para a empresa:

1. **Prova de presença física** - GPS confirma localização
2. **Auditoria completa** - Todos os dados guardados
3. **Previne fraudes** - Impossível picar remotamente
4. **Relatórios detalhados** - Mapas de picagens
5. **Conformidade legal** - Registo completo para inspeções

## 🔐 Privacidade garantida:

- Localização só usada no momento da picagem
- Apagada da memória temporária após uso
- Cada colaborador só vê os seus dados
- Administradores têm acesso para gestão

---

**Sistema WhatsApp Clock v3.0** - Com Localização Obrigatória
SEMRUMO-LDA © 2024