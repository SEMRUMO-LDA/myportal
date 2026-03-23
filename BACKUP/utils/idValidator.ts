/**
 * Sistema de Validação e Proteção de IDs
 * Garante que o problema UUID vs BigInt NUNCA volte a acontecer
 */

/**
 * Verifica se um valor é UUID
 */
export function isUUID(value: any): boolean {
  if (typeof value !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * Verifica se um valor é BigInt válido
 */
export function isValidBigInt(value: any): boolean {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value > 0;
  }
  if (typeof value === 'string') {
    const num = Number(value);
    return !isNaN(num) && Number.isInteger(num) && num > 0;
  }
  return false;
}

/**
 * Classe para validação estrita de IDs
 * FALHA RUIDOSAMENTE se detectar problemas
 */
export class IdValidator {
  private static errors: string[] = [];
  private static readonly MAX_ERRORS = 100;

  /**
   * Valida ID de usuário - DEVE ser número
   * @throws Error se não for válido
   */
  static validateUserId(id: any, context: string = ''): number {
    const location = context ? ` em ${context}` : '';

    // FALHA 1: ID é undefined ou null
    if (id === undefined || id === null) {
      const error = `❌ CRITICAL: ID de usuário é ${id}${location}`;
      this.logError(error);
      throw new Error(error);
    }

    // FALHA 2: ID é UUID (string formato UUID)
    if (isUUID(id)) {
      const error = `❌ CRITICAL: ID de usuário é UUID "${id}"${location}. DEVE ser número (BigInt)!`;
      this.logError(error);
      throw new Error(error);
    }

    // FALHA 3: ID é string não numérica
    if (typeof id === 'string' && !/^\d+$/.test(id)) {
      const error = `❌ CRITICAL: ID de usuário é string inválida "${id}"${location}`;
      this.logError(error);
      throw new Error(error);
    }

    // Converter para número se for string numérica
    const numericId = typeof id === 'number' ? id : Number(id);

    // FALHA 4: ID não é inteiro válido
    if (!Number.isInteger(numericId) || numericId <= 0) {
      const error = `❌ CRITICAL: ID de usuário não é inteiro válido: ${numericId}${location}`;
      this.logError(error);
      throw new Error(error);
    }

    // Log de sucesso em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ [IdValidator] ID válido: ${numericId} (tipo: ${typeof numericId})${location}`);
    }

    return numericId;
  }

  /**
   * Valida objeto User completo
   */
  static validateUser(user: any, context: string = ''): void {
    if (!user) {
      throw new Error(`❌ CRITICAL: Objeto user é null/undefined em ${context}`);
    }

    // Validar ID principal
    this.validateUserId(user.id, `user.id ${context}`);

    // Verificar se não há UUIDs escondidos
    if (user.authId && !isUUID(user.authId)) {
      console.warn(`⚠️ WARNING: user.authId deveria ser UUID mas é: ${user.authId}`);
    }

    if (user.authUuid && !isUUID(user.authUuid)) {
      console.warn(`⚠️ WARNING: user.authUuid deveria ser UUID mas é: ${user.authUuid}`);
    }
  }

  /**
   * Valida TimeLog
   */
  static validateTimeLog(log: any, context: string = ''): void {
    if (!log) return;

    // ID do log deve ser número
    if (log.id !== undefined && log.id !== null) {
      if (!isValidBigInt(log.id)) {
        throw new Error(`❌ CRITICAL: TimeLog.id inválido: ${log.id} em ${context}`);
      }
    }

    // user_id/userId deve ser número
    const userId = log.user_id || log.userId;
    if (userId !== undefined && userId !== null) {
      this.validateUserId(userId, `timeLog.userId ${context}`);
    }
  }

  /**
   * Valida Anomaly
   */
  static validateAnomaly(anomaly: any, context: string = ''): void {
    if (!anomaly) return;

    // ID da anomalia
    if (anomaly.id !== undefined && anomaly.id !== null) {
      if (!isValidBigInt(anomaly.id)) {
        throw new Error(`❌ CRITICAL: Anomaly.id inválido: ${anomaly.id} em ${context}`);
      }
    }

    // user_id deve ser número
    const userId = anomaly.user_id || anomaly.userId;
    if (userId !== undefined && userId !== null) {
      this.validateUserId(userId, `anomaly.userId ${context}`);
    }

    // time_log_id deve ser número
    const timeLogId = anomaly.time_log_id || anomaly.timeLogId;
    if (timeLogId !== undefined && timeLogId !== null) {
      if (!isValidBigInt(timeLogId)) {
        throw new Error(`❌ CRITICAL: Anomaly.timeLogId inválido: ${timeLogId} em ${context}`);
      }
    }
  }

  /**
   * Intercepta e valida operações do Supabase
   */
  static validateSupabaseOperation(table: string, operation: string, data: any): void {
    const context = `${table}.${operation}`;

    switch (table) {
      case 'users':
        if (Array.isArray(data)) {
          data.forEach(item => this.validateUser(item, context));
        } else {
          this.validateUser(data, context);
        }
        break;

      case 'time_logs':
        if (Array.isArray(data)) {
          data.forEach(item => this.validateTimeLog(item, context));
        } else {
          this.validateTimeLog(data, context);
        }
        break;

      case 'anomalies':
        if (Array.isArray(data)) {
          data.forEach(item => this.validateAnomaly(item, context));
        } else {
          this.validateAnomaly(data, context);
        }
        break;
    }
  }

  /**
   * Log de erros com limite
   */
  private static logError(error: string): void {
    console.error(error);

    this.errors.push({
      timestamp: new Date().toISOString(),
      error
    } as any);

    // Limitar tamanho do array de erros
    if (this.errors.length > this.MAX_ERRORS) {
      this.errors.shift();
    }

    // Em desenvolvimento, alertar imediatamente
    if (process.env.NODE_ENV === 'development') {
      console.trace('Stack trace do erro de ID:');
    }

    // Enviar para monitoring (se configurado)
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(new Error(error));
    }
  }

  /**
   * Obter histórico de erros
   */
  static getErrorHistory(): string[] {
    return [...this.errors];
  }

  /**
   * Limpar histórico
   */
  static clearErrors(): void {
    this.errors = [];
  }

  /**
   * Verificar saúde do sistema
   */
  static healthCheck(): { healthy: boolean; errors: number; lastError?: string } {
    return {
      healthy: this.errors.length === 0,
      errors: this.errors.length,
      lastError: this.errors[this.errors.length - 1]
    };
  }
}

/**
 * Função helper para garantir ID numérico
 * USAR EM TODO LUGAR QUE PRECISE DE ID
 */
export function ensureNumericId(id: any, context?: string): number {
  return IdValidator.validateUserId(id, context);
}

/**
 * Type guard para verificar se é ID válido
 */
export function isValidId(id: any): id is number {
  try {
    IdValidator.validateUserId(id);
    return true;
  } catch {
    return false;
  }
}

/**
 * Decorator para validar IDs automaticamente (TypeScript)
 */
export function ValidateId(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;

  descriptor.value = async function(...args: any[]) {
    // Validar primeiro argumento se parecer ser um ID
    if (args[0] && (propertyKey.includes('ById') || propertyKey.includes('UserId'))) {
      IdValidator.validateUserId(args[0], `${target.constructor.name}.${propertyKey}`);
    }

    return originalMethod.apply(this, args);
  };

  return descriptor;
}

/**
 * Middleware para Express/API (exemplo)
 */
export function idValidationMiddleware(req: any, res: any, next: any) {
  try {
    // Validar params
    if (req.params.userId) {
      req.params.userId = IdValidator.validateUserId(req.params.userId, 'request.params.userId');
    }
    if (req.params.id) {
      req.params.id = IdValidator.validateUserId(req.params.id, 'request.params.id');
    }

    // Validar body
    if (req.body?.userId) {
      req.body.userId = IdValidator.validateUserId(req.body.userId, 'request.body.userId');
    }
    if (req.body?.user_id) {
      req.body.user_id = IdValidator.validateUserId(req.body.user_id, 'request.body.user_id');
    }

    next();
  } catch (error: any) {
    res.status(400).json({
      error: 'Invalid ID format',
      message: error.message
    });
  }
}

// Auto-verificação ao carregar o módulo
if (typeof window !== 'undefined') {
  console.log('🛡️ [IdValidator] Sistema de proteção de IDs ativo');

  // Expor globalmente para debugging
  (window as any).IdValidator = IdValidator;
  (window as any).checkIdHealth = () => IdValidator.healthCheck();
}