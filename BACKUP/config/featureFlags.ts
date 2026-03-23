/**
 * Feature Flags Configuration
 * Controlo central de funcionalidades da aplicação
 *
 * IMPORTANTE: Anomalias desabilitadas temporariamente para estabilidade
 * Data: 2026-03-18
 */

export const FEATURE_FLAGS = {
    // ===================================
    // MÓDULO DE ANOMALIAS
    // ===================================
    ANOMALIES: {
        // Master switch - desabilita TODO o módulo
        ENABLED: false, // 🔴 DESABILITADO - Problemas de CORS

        // Sub-features (só funcionam se ENABLED = true)
        AUTO_CREATE: false,         // Criar anomalias automaticamente
        SHOW_IN_DASHBOARD: false,    // Mostrar no dashboard
        SHOW_NOTIFICATIONS: false,   // Mostrar notificações
        ALLOW_JUSTIFICATIONS: false, // Permitir justificações
        FETCH_ON_LOGIN: false,       // Buscar ao fazer login
    },

    // ===================================
    // MÓDULO DE FROTA (FLEET)
    // ===================================
    FLEET: {
        ENABLED: true,              // ✅ Funcional
        SHOW_IN_KIOSK: true,        // Mostrar no Kiosk
        ALLOW_BOOKINGS: true,       // Permitir reservas
        TRACK_EXPENSES: false,      // 🔴 DESABILITADO - Despesas desativadas temporariamente
    },

    // ===================================
    // MÓDULO DE DESPESAS
    // ===================================
    EXPENSES: {
        ENABLED: false,             // 🔴 DESABILITADO - Por estabilidade
        SHOW_IN_SIDEBAR: false,     // Não mostrar no menu
        ALLOW_QUICK_ENTRY: false,   // Desabilitar entrada rápida
        SHOW_IN_KIOSK: false,       // Não mostrar no Kiosk
        ALLOW_SUBMISSION: false,    // Não permitir submissão
        ALLOW_APPROVAL: false,      // Não permitir aprovação
    },

    // ===================================
    // PERFORMANCE & DEBUG
    // ===================================
    PERFORMANCE: {
        USE_CACHE: true,            // Usar cache local
        PARALLEL_QUERIES: true,     // Queries em paralelo
        TIMEOUT_MS: 5000,           // Timeout padrão (ms)
        MIN_LOADING_TIME: 1500,     // Tempo mínimo de loading (UX)
    },

    DEBUG: {
        LOG_QUERIES: false,         // Log todas as queries
        LOG_ERRORS: true,           // Log erros
        SHOW_DEV_TOOLS: false,      // Mostrar ferramentas dev
    },

    // ===================================
    // KIOSK ESPECÍFICO
    // ===================================
    KIOSK: {
        IDLE_TIMEOUT: 5 * 60 * 1000,     // 5 minutos
        IDLE_WARNING: 30 * 1000,          // 30 segundos antes
        SHOW_PROFILE_COMPLETION: true,    // Modal de completar perfil
        SHOW_PULSE_SURVEY: true,          // Inquérito semanal
        AUTO_LOGOUT_ON_ERROR: false,     // Logout automático em erro
    },

    // ===================================
    // SEGURANÇA
    // ===================================
    SECURITY: {
        REQUIRE_PIN: true,          // Exigir PIN
        FORCE_NEW_PIN: true,        // Forçar mudança de PIN
        SESSION_CHECK: true,        // Verificar sessões abertas
        VALIDATE_IP: false,         // Validar IP (pode causar problemas)
    },
};

/**
 * Helper para verificar se uma feature está ativa
 */
export const isFeatureEnabled = (feature: string): boolean => {
    const parts = feature.split('.');
    let current: any = FEATURE_FLAGS;

    for (const part of parts) {
        current = current?.[part];
        if (current === undefined) return false;
    }

    return current === true;
};

/**
 * Helper para obter valor de configuração
 */
export const getConfig = (path: string, defaultValue: any = null): any => {
    const parts = path.split('.');
    let current: any = FEATURE_FLAGS;

    for (const part of parts) {
        current = current?.[part];
        if (current === undefined) return defaultValue;
    }

    return current;
};

// Exportar estado das anomalias para fácil verificação
export const ANOMALIES_ENABLED = FEATURE_FLAGS.ANOMALIES.ENABLED;

// Log do estado atual (apenas em desenvolvimento)
if (import.meta.env.DEV) {
    console.log('🎛️ Feature Flags:', {
        Anomalies: ANOMALIES_ENABLED ? '✅ Enabled' : '🔴 Disabled',
        Fleet: FEATURE_FLAGS.FLEET.ENABLED ? '✅ Enabled' : '🔴 Disabled',
        Debug: FEATURE_FLAGS.DEBUG.LOG_QUERIES ? '✅ Verbose' : '🔇 Silent'
    });
}