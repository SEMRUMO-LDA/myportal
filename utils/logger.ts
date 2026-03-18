/**
 * Production-Safe Logger
 * Console.logs são automaticamente removidos em produção pelo Vite
 * Este wrapper garante que logs críticos ainda funcionem via Sentry
 */

// Logger levels
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4
}

// Get current environment
const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

// Logger class
class Logger {
  private level: LogLevel;

  constructor() {
    this.level = isDevelopment ? LogLevel.DEBUG : LogLevel.WARN;
  }

  /**
   * Debug logging (only in development)
   */
  debug(...args: any[]) {
    if (isDevelopment && this.level <= LogLevel.DEBUG) {
      console.log('[DEBUG]', ...args);
    }
  }

  /**
   * Info logging (only in development)
   */
  info(...args: any[]) {
    if (isDevelopment && this.level <= LogLevel.INFO) {
      console.info('[INFO]', ...args);
    }
  }

  /**
   * Warning logging (development + production via Sentry)
   */
  warn(...args: any[]) {
    if (isDevelopment && this.level <= LogLevel.WARN) {
      console.warn('[WARN]', ...args);
    }

    // In production, send to Sentry (if configured)
    if (isProduction && window.Sentry) {
      window.Sentry.captureMessage(args.join(' '), 'warning');
    }
  }

  /**
   * Error logging (always, with Sentry in production)
   */
  error(...args: any[]) {
    if (isDevelopment && this.level <= LogLevel.ERROR) {
      console.error('[ERROR]', ...args);
    }

    // In production, send to Sentry
    if (isProduction && window.Sentry) {
      const error = args[0] instanceof Error ? args[0] : new Error(args.join(' '));
      window.Sentry.captureException(error);
    }
  }

  /**
   * Critical logging (always, triggers alerts)
   */
  critical(...args: any[]) {
    // Always log critical errors (even in production for debugging)
    if (this.level <= LogLevel.CRITICAL) {
      // Use console.error which won't be removed by Vite in critical cases
      const criticalError = new Error('[CRITICAL] ' + args.join(' '));

      if (isDevelopment) {
        console.error(criticalError);
      }

      // Send to Sentry with high priority
      if (window.Sentry) {
        window.Sentry.captureException(criticalError, {
          level: 'fatal',
          tags: {
            critical: true
          }
        });
      }
    }
  }

  /**
   * Performance logging (only in development)
   */
  time(label: string) {
    if (isDevelopment) {
      console.time(label);
    }
  }

  timeEnd(label: string) {
    if (isDevelopment) {
      console.timeEnd(label);
    }
  }

  /**
   * Group logging (only in development)
   */
  group(label: string) {
    if (isDevelopment) {
      console.group(label);
    }
  }

  groupEnd() {
    if (isDevelopment) {
      console.groupEnd();
    }
  }

  /**
   * Table logging (only in development)
   */
  table(data: any) {
    if (isDevelopment) {
      console.table(data);
    }
  }

  /**
   * Set logging level
   */
  setLevel(level: LogLevel) {
    this.level = level;
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience functions
export const log = logger.debug.bind(logger);
export const logInfo = logger.info.bind(logger);
export const logWarn = logger.warn.bind(logger);
export const logError = logger.error.bind(logger);
export const logCritical = logger.critical.bind(logger);

// Window declaration for Sentry
declare global {
  interface Window {
    Sentry: any;
  }
}

/**
 * USAGE EXAMPLES:
 *
 * import { logger } from '@/utils/logger';
 *
 * // Development only logs
 * logger.debug('User clicked button', { userId: 123 });
 * logger.info('API response received');
 *
 * // Production-safe logs (via Sentry)
 * logger.warn('Slow query detected', { time: 5000 });
 * logger.error('Failed to save', error);
 * logger.critical('Database connection lost!');
 *
 * // Performance monitoring
 * logger.time('api-call');
 * // ... do work ...
 * logger.timeEnd('api-call');
 */