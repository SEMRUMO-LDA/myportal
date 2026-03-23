/**
 * Production-Safe Logger Service
 *
 * Replaces console.log with environment-aware logging
 * Prevents sensitive data leaks in production
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: string;
  context?: string;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;
  private logBuffer: LogEntry[] = [];
  private maxBufferSize = 100;

  private shouldLog(level: LogLevel): boolean {
    if (this.isDevelopment) return true;

    // In production, only log warnings and errors
    return level === 'warn' || level === 'error';
  }

  private sanitizeData(data: any): any {
    if (!data) return data;

    // Remove sensitive fields
    const sanitized = { ...data };
    const sensitiveFields = ['password', 'pin', 'token', 'auth', 'key', 'secret', 'api_key'];

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    // Sanitize nested objects
    Object.keys(sanitized).forEach(key => {
      if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeData(sanitized[key]);
      }
    });

    return sanitized;
  }

  private log(level: LogLevel, message: string, data?: any, context?: string) {
    const entry: LogEntry = {
      level,
      message,
      data: this.sanitizeData(data),
      timestamp: new Date().toISOString(),
      context
    };

    // Add to buffer for debugging
    this.logBuffer.push(entry);
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift();
    }

    if (!this.shouldLog(level)) return;

    const prefix = context ? `[${context}]` : '';
    const logMessage = `${prefix} ${message}`;

    switch (level) {
      case 'debug':
        console.log(logMessage, data || '');
        break;
      case 'info':
        console.info(logMessage, data || '');
        break;
      case 'warn':
        console.warn(logMessage, data || '');
        break;
      case 'error':
        console.error(logMessage, data || '');
        break;
    }
  }

  debug(message: string, data?: any, context?: string) {
    this.log('debug', message, data, context);
  }

  info(message: string, data?: any, context?: string) {
    this.log('info', message, data, context);
  }

  warn(message: string, data?: any, context?: string) {
    this.log('warn', message, data, context);
  }

  error(message: string, data?: any, context?: string) {
    this.log('error', message, data, context);
  }

  /**
   * Get recent logs for debugging (even in production)
   * Useful for error reports
   */
  getRecentLogs(): LogEntry[] {
    return [...this.logBuffer];
  }

  /**
   * Clear log buffer
   */
  clearLogs() {
    this.logBuffer = [];
  }

  /**
   * Export logs for debugging
   */
  exportLogs(): string {
    return JSON.stringify(this.logBuffer, null, 2);
  }
}

export const logger = new Logger();

// Backwards compatibility (gradual migration)
export const log = {
  debug: (msg: string, data?: any) => logger.debug(msg, data),
  info: (msg: string, data?: any) => logger.info(msg, data),
  warn: (msg: string, data?: any) => logger.warn(msg, data),
  error: (msg: string, data?: any) => logger.error(msg, data),
};