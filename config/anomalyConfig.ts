/**
 * ⚙️ CONFIGURAÇÃO CENTRALIZADA DE ANOMALIAS
 *
 * Este arquivo controla TODO o comportamento do sistema de anomalias.
 * Alterar estas flags NÃO afeta a picagem normal.
 *
 * 🔒 SEGURANÇA: Feature flags desativadas por padrão
 */

export const ANOMALY_CONFIG = {
  // ========================================
  // 🎚️ MASTER SWITCHES (Controlo Global)
  // ========================================

  /**
   * ⚡ Master Kill Switch
   * Se false, DESATIVA completamente o sistema de anomalias
   * Recomendado: false até validação completa
   */
  ENABLED: false,

  /**
   * 🔍 Deteção Automática
   * Cria anomalias silenciosamente quando deteta problemas
   */
  ENABLE_AUTO_DETECTION: false,

  /**
   * 🔔 Notificações Automáticas
   * IMPORTANTE: Deve ser false no novo workflow!
   * Colaboradores só recebem notificação quando gestor pedir justificação
   */
  ENABLE_AUTO_NOTIFICATIONS: false,

  // ========================================
  // 📊 REGRAS DE DETEÇÃO
  // ========================================

  /**
   * Tipos de anomalias que o sistema deteta automaticamente
   */
  DETECTION_RULES: {
    // Atrasos na entrada
    LATE_ENTRY: {
      enabled: false,
      threshold_minutes: 30,      // Atraso > 30min = anomalia
      severity_critical: 30,       // >= 30min = CRITICAL
      severity_high: 15,           // >= 15min = HIGH
      severity_medium: 5           // >= 5min = MEDIUM
    },

    // Saídas antecipadas
    EARLY_EXIT: {
      enabled: false,
      threshold_minutes: 30
    },

    // Sessões não fechadas (já implementado em sessionChecker.ts)
    UNCLOSED_SESSION: {
      enabled: true,  // Este já funciona separadamente
      hours_threshold: 16
    },

    // Ausências de pausa/almoço
    MISSING_BREAK: {
      enabled: false,
      min_work_hours: 6  // Se trabalhar > 6h sem pausa
    }
  },

  // ========================================
  // 🎯 ESTADOS DO WORKFLOW
  // ========================================

  /**
   * Estado inicial quando anomalia é criada
   * NOVO WORKFLOW: 'DETECTED' (silencioso)
   * ANTIGO: 'PENDING' (notificava)
   */
  DEFAULT_STATUS: 'DETECTED',

  /**
   * Mapeamento de estados do workflow
   */
  STATUSES: {
    DETECTED: 'DETECTED',                     // Sistema detetou (invisível ao colaborador)
    AWAITING_JUSTIFICATION: 'AWAITING_JUSTIFICATION',  // Gestor pediu justificação
    DISMISSED: 'DISMISSED',                   // Gestor ignorou (falso positivo)
    RESOLVED: 'RESOLVED',                     // Resolvido (justificação aceite)
    UNRESOLVED: 'UNRESOLVED'                  // Rejeitado (problema confirmado)
  },

  // ========================================
  // 🚨 LIMITES E SEGURANÇA
  // ========================================

  /**
   * Rate limiting para evitar sobrecarga
   */
  RATE_LIMITS: {
    max_anomalies_per_batch: 10,      // Máximo de anomalias criadas por vez
    batch_delay_ms: 2000,              // Delay entre batches
    max_anomalies_per_user_per_day: 5 // Limite por utilizador/dia
  },

  /**
   * Processamento
   */
  PROCESSING: {
    debounce_ms: 5000,          // Aguardar 5s antes de processar
    process_only_recent: true,  // Apenas últimos 7 dias
    days_to_process: 7
  },

  // ========================================
  // 🐛 DEBUG E LOGS
  // ========================================

  /**
   * Nível de logging
   */
  DEBUG: {
    enabled: true,
    log_creation: true,
    log_skipped: false,
    log_performance: true
  }
};

/**
 * 🔒 VALIDAÇÃO DE SEGURANÇA
 * Garante que configurações perigosas não estão ativas
 */
export function validateAnomalyConfig(): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  // Aviso se sistema estiver ativo
  if (ANOMALY_CONFIG.ENABLED) {
    warnings.push('⚠️  Sistema de anomalias ATIVO');
  }

  // Aviso crítico se notificações automáticas estiverem ativas
  if (ANOMALY_CONFIG.ENABLE_AUTO_NOTIFICATIONS) {
    warnings.push('🚨 ATENÇÃO: Notificações automáticas ATIVAS! Colaboradores serão notificados!');
  }

  // Verificar se rate limits estão configurados
  if (ANOMALY_CONFIG.ENABLED && ANOMALY_CONFIG.RATE_LIMITS.max_anomalies_per_batch > 50) {
    warnings.push('⚠️  Rate limit muito alto - pode causar sobrecarga');
  }

  return {
    valid: warnings.filter(w => w.includes('🚨')).length === 0,
    warnings
  };
}

/**
 * 📊 Obter configuração para um tipo específico
 */
export function getDetectionRule(type: keyof typeof ANOMALY_CONFIG.DETECTION_RULES) {
  return ANOMALY_CONFIG.DETECTION_RULES[type];
}

/**
 * 🎚️ Verificar se uma funcionalidade está ativa
 */
export function isFeatureEnabled(feature: 'detection' | 'notifications' | 'system'): boolean {
  switch (feature) {
    case 'system':
      return ANOMALY_CONFIG.ENABLED;
    case 'detection':
      return ANOMALY_CONFIG.ENABLED && ANOMALY_CONFIG.ENABLE_AUTO_DETECTION;
    case 'notifications':
      return ANOMALY_CONFIG.ENABLED && ANOMALY_CONFIG.ENABLE_AUTO_NOTIFICATIONS;
    default:
      return false;
  }
}
