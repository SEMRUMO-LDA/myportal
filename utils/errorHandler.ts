/**
 * Error Handler - Sistema centralizado de tratamento de erros
 * Normaliza erros, mostra mensagens user-friendly e faz logging
 */

import toast from 'react-hot-toast';

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public severity: 'error' | 'warning' | 'info' = 'error',
    public userMessage?: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const errorHandler = {
  /**
   * Handle error and show user feedback
   */
  handle(error: unknown, context?: string): AppError {
    const appError = this.normalizeError(error);

    // Log para desenvolvimento/monitoring
    this.logError(appError, context);

    // Mostrar ao usuário
    const userMsg = appError.userMessage || this.getUserFriendlyMessage(appError);

    if (appError.severity === 'error') {
      toast.error(userMsg, { duration: 5000 });
    } else if (appError.severity === 'warning') {
      toast.error(userMsg, {
        duration: 4000,
        icon: '⚠️'
      });
    } else {
      toast(userMsg, { duration: 3000 });
    }

    return appError;
  },

  /**
   * Handle error silently (only log, don't show toast)
   */
  handleSilent(error: unknown, context?: string): AppError {
    const appError = this.normalizeError(error);
    this.logError(appError, context);
    return appError;
  },

  /**
   * Normalize any error to AppError
   */
  normalizeError(error: unknown): AppError {
    if (error instanceof AppError) {
      return error;
    }

    // Supabase/PostgreSQL errors
    if (error && typeof error === 'object' && 'code' in error) {
      const pgError = error as any;
      return new AppError(
        pgError.code || 'DB_ERROR',
        pgError.message || String(error),
        'error',
        this.getSupabaseUserMessage(pgError.code),
        error
      );
    }

    // Network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return new AppError(
        'NETWORK_ERROR',
        error.message,
        'error',
        'Erro de conexão. Verifique sua internet e tente novamente.',
        error
      );
    }

    // Generic error
    return new AppError(
      'UNKNOWN',
      String(error),
      'error',
      'Ocorreu um erro inesperado. Por favor, tente novamente.',
      error
    );
  },

  /**
   * Get user-friendly message based on error code
   */
  getUserFriendlyMessage(error: AppError): string {
    const messages: Record<string, string> = {
      // PostgreSQL errors
      'PGRST116': 'Registo não encontrado.',
      '23505': 'Este registo já existe no sistema.',
      '23503': 'Não é possível eliminar este item pois está a ser utilizado.',
      '42501': 'Não tem permissão para realizar esta ação.',
      '42P01': 'Erro de configuração da base de dados.',

      // Network
      'NETWORK_ERROR': 'Erro de conexão. Verifique sua internet.',
      'TIMEOUT': 'O servidor demorou muito tempo a responder.',

      // Auth
      'AUTH_ERROR': 'Erro de autenticação. Por favor, faça login novamente.',
      'INVALID_CREDENTIALS': 'Credenciais inválidas.',

      // Validation
      'VALIDATION_ERROR': 'Por favor, verifique os dados introduzidos.',
      'REQUIRED_FIELD': 'Por favor, preencha todos os campos obrigatórios.',
    };

    return messages[error.code] || 'Ocorreu um erro. Se persistir, contacte o suporte técnico.';
  },

  /**
   * Map Supabase/PostgreSQL error codes to Portuguese messages
   */
  getSupabaseUserMessage(code: string): string {
    const map: Record<string, string> = {
      // Constraint violations
      '23505': 'Este registo já existe no sistema. Por favor, verifique os dados.',
      '23503': 'Não é possível eliminar este item pois está a ser utilizado noutras partes do sistema.',
      '23502': 'Campo obrigatório em falta.',
      '23514': 'Valor inválido para este campo.',

      // Permissions
      '42501': 'Não tem permissão para aceder a este recurso.',

      // Not found
      'PGRST116': 'O registo que procura não foi encontrado.',

      // Table/column errors
      '42P01': 'Erro de configuração. Por favor, contacte o administrador.',
      '42703': 'Campo não reconhecido.',

      // RPC errors
      'PGRST202': 'Operação não permitida.',
      '404': 'Recurso não encontrado.',
    };

    return map[code] || '';
  },

  /**
   * Log error (development console, production monitoring)
   */
  logError(error: AppError, context?: string) {
    const isDev = import.meta.env.DEV;

    if (isDev) {
      console.group(`🔴 Error ${context ? `[${context}]` : ''}`);
      console.error('Code:', error.code);
      console.error('Message:', error.message);
      console.error('Severity:', error.severity);
      if (error.userMessage) console.error('User Message:', error.userMessage);
      if (error.originalError) console.error('Original:', error.originalError);
      console.groupEnd();
    } else {
      // Production: Send to monitoring service (Sentry, LogRocket, etc)
      // if (window.Sentry) {
      //   window.Sentry.captureException(error, {
      //     contexts: {
      //       app: {
      //         context,
      //         code: error.code,
      //         severity: error.severity
      //       }
      //     }
      //   });
      // }

      // Fallback: only log critical errors
      if (error.severity === 'error') {
        console.error(`[${context}]`, error.code, error.message);
      }
    }
  },

  /**
   * Create AppError with specific type
   */
  create(
    code: string,
    message: string,
    userMessage: string,
    severity: 'error' | 'warning' | 'info' = 'error'
  ): AppError {
    return new AppError(code, message, severity, userMessage);
  },

  /**
   * Validation error helper
   */
  validation(message: string): AppError {
    return new AppError(
      'VALIDATION_ERROR',
      message,
      'warning',
      message
    );
  },

  /**
   * Permission error helper
   */
  permission(action: string): AppError {
    return new AppError(
      'PERMISSION_DENIED',
      `Permission denied: ${action}`,
      'error',
      'Não tem permissão para realizar esta ação.'
    );
  },

  /**
   * Not found error helper
   */
  notFound(resource: string): AppError {
    return new AppError(
      'NOT_FOUND',
      `${resource} not found`,
      'warning',
      `${resource} não encontrado.`
    );
  }
};

/**
 * Async error wrapper - catches and handles errors automatically
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context?: string
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      throw errorHandler.handle(error, context || fn.name);
    }
  }) as T;
}

/**
 * Type guard for AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
