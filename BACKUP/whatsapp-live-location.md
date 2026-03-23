# 📍 WhatsApp Live Location - Solução Avançada

## Como funciona:

### 1. Colaborador partilha "Live Location" uma vez
- Duração: 15 minutos, 1 hora ou 8 horas
- WhatsApp envia atualizações contínuas da localização
- Webhook recebe múltiplas atualizações

### 2. Sistema deteta automaticamente:
```javascript
// Webhook recebe atualizações a cada ~30 segundos
{
  "type": "location",
  "live": true,
  "latitude": 41.1579,
  "longitude": -8.6291,
  "accuracy": 5,
  "speed": 0,
  "timestamp": 1234567890
}
```

### 3. Lógica de Geofencing:
- Se entrou na zona da empresa → ENTRADA automática
- Se saiu da zona da empresa → SAÍDA automática
- Sem interação adicional necessária!

## Implementação:

```javascript
// Zonas da empresa
const COMPANY_ZONES = [
  {
    name: "Escritório Porto",
    lat: 41.1579,
    lng: -8.6291,
    radius: 50 // metros
  },
  {
    name: "Armazém",
    lat: 41.1234,
    lng: -8.5678,
    radius: 100
  }
];

// Verificar se está dentro da zona
function isInsideZone(userLat, userLng, zone) {
  const distance = calculateDistance(userLat, userLng, zone.lat, zone.lng);
  return distance <= zone.radius;
}

// Processar live location
async function processLiveLocation(data) {
  const userInside = COMPANY_ZONES.some(zone =>
    isInsideZone(data.latitude, data.longitude, zone)
  );

  const lastStatus = await getLastUserStatus(data.phone);

  if (userInside && lastStatus === 'outside') {
    // Registar ENTRADA automática
    await registerClockIn(data.phone, data.latitude, data.longitude);
    await sendMessage(data.phone, "✅ Entrada registada automaticamente!");
  } else if (!userInside && lastStatus === 'inside') {
    // Registar SAÍDA automática
    await registerClockOut(data.phone, data.latitude, data.longitude);
    await sendMessage(data.phone, "🚪 Saída registada automaticamente!");
  }
}
```

## Vantagens:
✅ Totalmente automático após autorização inicial
✅ Funciona com WhatsApp normal
✅ Colaborador pode cancelar a qualquer momento
✅ Precisão de metros

## Limitações:
⚠️ Máximo 8 horas de partilha
⚠️ Consome bateria
⚠️ Colaborador tem que renovar diariamente