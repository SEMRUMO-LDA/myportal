# 🗺️ IMPLEMENTAÇÃO DE GEOLOCALIZAÇÃO OBRIGATÓRIA

**Data**: 2026-03-19
**Build**: #13
**Status**: ✅ IMPLEMENTADO E FUNCIONAL

---

## 🎯 FUNCIONALIDADES IMPLEMENTADAS

### **1. Geolocalização SEMPRE Obrigatória**
- ✅ **TODA picagem** (entrada E saída) **REQUER localização GPS**
- ✅ Pede permissão ao utilizador **em cada picagem** (não usa cache)
- ✅ Timeout de 15 segundos para obter localização
- ✅ Se falhar: **BLOQUEIA a picagem** com mensagem de erro clara

### **2. Validação de Restrições Geográficas (restrictGeo)**
- ✅ Se `user.attendanceConfig.restrictGeo === true`: Valida localização
- ✅ Compara com `allowedLocations` configuradas para o utilizador
- ✅ Calcula distância usando **fórmula de Haversine** (precisão GPS)
- ✅ Permite picagem **APENAS** se estiver dentro do raio permitido

### **3. Informação Guardada na Base de Dados**
Cada picagem guarda:
- ✅ `check_in_coordinates`: `{ lat: number, lng: number }`
- ✅ `check_in_location`: Nome do local (ex: "Lisboa, Portugal")
- ✅ `check_out_coordinates`: `{ lat: number, lng: number }`
- ✅ `check_out_location`: Nome do local

---

## 📋 FLUXO DE PICAGEM (Build #13)

### **Entrada (Clock In):**

```
1. Utilizador faz login (ID + PIN)
2. Sistema pede geolocalização
   ↓
   Browser mostra popup: "Permitir acesso à localização?"
   ↓
   Utilizador clica "Permitir"
   ↓
3. Sistema obtém coordenadas GPS (lat, lng)
4. Verifica restrictGeo:
   - Se restrictGeo = false → Continua (guarda localização)
   - Se restrictGeo = true → Valida:
     • Compara com allowedLocations
     • Calcula distância
     • Se dentro do raio → Continua
     • Se fora do raio → BLOQUEIA com mensagem de erro
5. Obtém nome do local (reverse geocoding)
6. Regista entrada na BD com todas as informações
7. Mostra mensagem de sucesso
```

### **Saída (Clock Out):**
Mesmo fluxo da entrada - geolocalização obrigatória e validada.

---

## 🚨 MENSAGENS DE ERRO

### **Permissão Negada:**
```
Geolocalização obrigatória: Permissão de localização negada.
Por favor, permita o acesso à localização nas definições do browser.
```

**Como resolver:**
- Chrome: Clica no cadeado → Permissões → Localização → Permitir
- Safari: Settings → Safari → Location → Allow
- Firefox: Clica no ícone 🎯 → Allow Location

### **GPS Desligado/Indisponível:**
```
Geolocalização obrigatória: Localização indisponível.
Verifique se o GPS está ativado e se está num local com sinal.
```

**Como resolver:**
- Ativar GPS no dispositivo
- Sair para exterior (se estiver em cave/interior sem sinal)
- Ligar WiFi (ajuda na localização)

### **Timeout (>15 segundos):**
```
Geolocalização obrigatória: Timeout ao obter localização (15000ms).
Tente novamente.
```

**Como resolver:**
- Tentar novamente
- Verificar ligação à Internet
- Reiniciar browser

### **Fora da Localização Permitida:**
```
Não está numa localização permitida.
Localização mais próxima: Escritório Lisboa (523m de distância)
```

**Significado:**
- O utilizador tem `restrictGeo: true`
- Está fora do raio permitido
- Mostra a localização mais próxima e distância

---

## ⚙️ CONFIGURAÇÃO DE UTILIZADORES

### **Como ativar restrição geográfica:**

```typescript
// Na tabela users, campo attendance_config:
{
  "restrictGeo": true,
  "allowedLocations": [
    {
      "id": 1,
      "name": "Escritório Lisboa",
      "latitude": 38.7223,
      "longitude": -9.1393,
      "radius": 100,  // 100 metros
      "address": "Av. da Liberdade, Lisboa"
    },
    {
      "id": 2,
      "name": "Escritório Porto",
      "latitude": 41.1579,
      "longitude": -8.6291,
      "radius": 150,  // 150 metros
      "address": "Av. dos Aliados, Porto"
    }
  ]
}
```

### **Como desativar restrição (permitir qualquer local):**

```typescript
{
  "restrictGeo": false,
  // allowedLocations não é validado se restrictGeo = false
}
```

**IMPORTANTE**: Mesmo com `restrictGeo: false`, a **localização continua obrigatória** e é guardada!

---

## 🛠️ FICHEIROS CRIADOS/MODIFICADOS

### **Novos Ficheiros:**

1. **`services/geolocationService.ts`** (218 linhas)
   - Serviço principal de geolocalização
   - Funções: `getCurrentLocation()`, `isWithinAllowedLocations()`, `calculateDistance()`
   - Reverse geocoding (coordenadas → nome do local)

### **Ficheiros Modificados:**

2. **`services/kioskClockService.ts`** (247 linhas)
   - **ANTES**: Geolocalização opcional
   - **AGORA**: Geolocalização **SEMPRE obrigatória**
   - Valida `restrictGeo` antes de permitir picagem

3. **`pages/Login.tsx`**
   - Removido logout automático após picagem (Build #12)
   - Mantém utilizador no portal após picar

---

## 📊 DADOS GUARDADOS NA BASE DE DADOS

### **Estrutura da tabela time_logs:**

```sql
CREATE TABLE time_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  date DATE NOT NULL,

  -- ENTRADA
  check_in TIME NOT NULL,
  check_in_location TEXT,                    -- ✅ NOVO: "Lisboa, Portugal"
  check_in_coordinates JSONB,                -- ✅ NOVO: {"lat":38.7223,"lng":-9.1393}
  check_in_ip TEXT,

  -- SAÍDA
  check_out TIME,
  check_out_location TEXT,                   -- ✅ NOVO: "Lisboa, Portugal"
  check_out_coordinates JSONB,               -- ✅ NOVO: {"lat":38.7223,"lng":-9.1393}
  check_out_ip TEXT,

  status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **Exemplo de registo:**

```json
{
  "id": 12345,
  "user_id": 69,
  "date": "2026-03-19",
  "check_in": "09:05:23",
  "check_in_location": "Avenida da Liberdade, 1250-096 Lisboa, Portugal",
  "check_in_coordinates": {
    "lat": 38.722305,
    "lng": -9.139337
  },
  "check_in_ip": "192.168.1.10",
  "check_out": "18:02:15",
  "check_out_location": "Avenida da Liberdade, 1250-096 Lisboa, Portugal",
  "check_out_coordinates": {
    "lat": 38.722401,
    "lng": -9.139288
  },
  "check_out_ip": "192.168.1.10",
  "status": "COMPLETED"
}
```

---

## 🧪 COMO TESTAR

### **Teste 1: Picagem Normal (sem restrictGeo)**

```bash
# 1. Login com utilizador que NÃO tem restrictGeo ativado
ID: 69
PIN: 123456

# 2. Browser pede permissão de localização
Clicar: "Permitir"

# 3. Aguardar ~2-5 segundos (obtenção de GPS)

# 4. Mensagem de sucesso:
"Entrada registada às 09:05"

# 5. Verificar na BD:
SELECT check_in_location, check_in_coordinates
FROM time_logs
WHERE user_id = 69
ORDER BY created_at DESC
LIMIT 1;

# Resultado esperado:
# check_in_location: "Lisboa, Portugal" (ou coordenadas)
# check_in_coordinates: {"lat": 38.xxx, "lng": -9.xxx}
```

### **Teste 2: Picagem com restrictGeo ATIVADO (dentro do raio)**

```bash
# 1. Configurar user com restrictGeo
UPDATE users SET attendance_config = jsonb_set(
  attendance_config,
  '{restrictGeo}',
  'true'
) WHERE id = 69;

UPDATE users SET attendance_config = jsonb_set(
  attendance_config,
  '{allowedLocations}',
  '[{"name":"Escritório Lisboa","latitude":38.7223,"longitude":-9.1393,"radius":500}]'
) WHERE id = 69;

# 2. Estar FISICAMENTE perto do local permitido (dentro de 500m)

# 3. Login e picar
ID: 69
PIN: 123456

# 4. Permitir localização

# 5. Mensagem de sucesso (se dentro do raio):
"Entrada registada às 09:05"

# Console mostra:
"[KioskClock] ✅ Within allowed location: Escritório Lisboa (123m away)"
```

### **Teste 3: Picagem com restrictGeo ATIVADO (fora do raio)**

```bash
# 1. Configuração igual ao Teste 2

# 2. Estar FISICAMENTE longe do local permitido (>500m)

# 3. Login e picar
ID: 69
PIN: 123456

# 4. Permitir localização

# 5. Mensagem de ERRO:
"Não está numa localização permitida.
Localização mais próxima: Escritório Lisboa (1.2km de distância)"

# Console mostra:
"[KioskClock] ❌ GEO RESTRICTION FAILED"
```

### **Teste 4: Permissão Negada**

```bash
# 1. Login
ID: 69
PIN: 123456

# 2. Quando browser pedir permissão, clicar: "Bloquear" ou "Negar"

# 3. Mensagem de ERRO:
"Geolocalização obrigatória: Permissão de localização negada.
Por favor, permita o acesso à localização nas definições do browser."

# 4. Picagem BLOQUEADA - não permite continuar sem localização
```

---

## 📱 REQUISITOS DO BROWSER

### **HTTPS Obrigatório:**
- ✅ `https://semrumo.eu` - **FUNCIONA**
- ❌ `http://semrumo.eu` - **NÃO FUNCIONA** (geolocation API bloqueada)

### **Browsers Suportados:**
- ✅ Chrome 50+
- ✅ Safari 10+
- ✅ Firefox 50+
- ✅ Edge 14+
- ✅ Chrome Mobile (Android)
- ✅ Safari Mobile (iOS)

### **Permissões Necessárias:**
- GPS ativado no dispositivo
- Permissão de localização concedida ao browser
- Ligação à Internet (para reverse geocoding)

---

## 🔒 SEGURANÇA E PRIVACIDADE

### **Dados Guardados:**
- ✅ Coordenadas GPS exatas (lat, lng) com 6 casas decimais (~0.1m precisão)
- ✅ Nome do local obtido via OpenStreetMap (gratuito, sem API key)
- ✅ Timestamp de cada pedido de localização

### **Privacidade:**
- ⚠️ **ATENÇÃO**: Coordenadas GPS permitem tracking de movimentos
- ⚠️ Recomendação: Informar colaboradores sobre recolha de localização
- ⚠️ RGPD: Documentar no DPO que localização é recolhida

### **Limitações Técnicas:**
- GPS pode ter erro de 5-50m dependendo do dispositivo/sinal
- Em interior/caves, pode demorar >10s ou falhar completamente
- Reverse geocoding pode falhar sem Internet (usa coordenadas)

---

## 🚀 DEPLOY

### **Build #13 criado:**
```bash
npm run build
# ✓ built in 4.59s
```

### **Upload para produção:**
```bash
scp -r dist/* user@servidor:/app/myportal/
```

### **Verificar versão:**
```bash
curl https://semrumo.eu/app/myportal/version.json
# Deve mostrar: {"buildNumber": 13}
```

---

## 📈 PRÓXIMOS PASSOS (OPCIONAL)

### **Melhorias Futuras:**

1. **Dashboard de Localizações**
   - Mapa mostrando onde cada colaborador picou
   - Heatmap de localizações mais frequentes
   - Relatório de anomalias (picagens fora do local)

2. **Geofencing Automático**
   - Detetar quando utilizador entra/sai de zona permitida
   - Picagem automática ao entrar no escritório
   - Notificação se esquecer de picar

3. **Otimização de Bateria**
   - Usar cached location se recente (<5min)
   - Reduzir accuracy para poupar bateria
   - Fallback para WiFi/Cell tower location

4. **Análise de Padrões**
   - ML para detetar comportamentos anómalos
   - Alertas de picagens suspeitas
   - Relatório de compliance por utilizador

---

## ✅ RESUMO

### **ANTES (Build #12):**
- ❌ Geolocalização opcional (podia ser null)
- ❌ Sem validação de restrições
- ❌ Dados incompletos na BD

### **AGORA (Build #13):**
- ✅ **Geolocalização SEMPRE obrigatória**
- ✅ **Validação de restrictGeo implementada**
- ✅ **100% dos registos com localização GPS**
- ✅ **Reverse geocoding automático**
- ✅ **Mensagens de erro claras**
- ✅ **Timeout de 15s (não bloqueia forever)**
- ✅ **Cálculo de distância preciso (Haversine)**

**Status**: ✅ **PRONTO PARA PRODUÇÃO**

---

**Build**: #13
**Data**: 2026-03-19
**Implementado por**: Claude + Tiago
**Próxima ação**: Deploy e teste em produção
