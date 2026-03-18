import { ANOMALY_CONFIG, validateAnomalyConfig, isFeatureEnabled } from './config/anomalyConfig';

console.log('🔧 TESTE DE CONFIGURAÇÃO DE ANOMALIAS');
console.log('='.repeat(60));

// Validar configuração
const validation = validateAnomalyConfig();

console.log('\n📊 Estado Atual:');
console.log('   Sistema:', isFeatureEnabled('system') ? '✅ ATIVO' : '🔴 DESATIVADO');
console.log('   Deteção:', isFeatureEnabled('detection') ? '✅ ATIVO' : '🔴 DESATIVADO');
console.log('   Notificações:', isFeatureEnabled('notifications') ? '✅ ATIVO' : '🔴 DESATIVADO');

console.log('\n⚠️  Avisos:');
if (validation.warnings.length === 0) {
  console.log('   ✅ Nenhum aviso - Configuração segura!');
} else {
  validation.warnings.forEach(w => console.log('   ' + w));
}

console.log('\n🎚️  Configurações:');
console.log('   Status padrão:', ANOMALY_CONFIG.DEFAULT_STATUS);
console.log('   Max anomalias/batch:', ANOMALY_CONFIG.RATE_LIMITS.max_anomalies_per_batch);
console.log('   Atraso crítico:', ANOMALY_CONFIG.DETECTION_RULES.LATE_ENTRY.threshold_minutes, 'min');

console.log('\n✅ Configuração carregada com sucesso!');
console.log('='.repeat(60));
