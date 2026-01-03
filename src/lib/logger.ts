/**
 * Structured Logger
 *
 * Provides consistent logging with context, timestamps, and environment awareness.
 * - In production: Only logs info, warn, error levels
 * - In development: Also logs debug level
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: string | number | boolean | null | undefined;
}

const isDev = process.env.NODE_ENV === 'development';

function formatMessage(level: LogLevel, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

  if (context && Object.keys(context).length > 0) {
    const contextStr = Object.entries(context)
      .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
      .join(' ');
    return `${prefix} ${message} | ${contextStr}`;
  }

  return `${prefix} ${message}`;
}

export const logger = {
  /**
   * Debug logs - only shown in development
   */
  debug(message: string, context?: LogContext): void {
    if (isDev) {
      console.log(formatMessage('debug', message, context));
    }
  },

  /**
   * Info logs - important operational events
   */
  info(message: string, context?: LogContext): void {
    console.log(formatMessage('info', message, context));
  },

  /**
   * Warning logs - potential issues that don't stop operation
   */
  warn(message: string, context?: LogContext): void {
    console.warn(formatMessage('warn', message, context));
  },

  /**
   * Error logs - failures and exceptions
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorMessage = error instanceof Error ? error.message : String(error || '');
    const fullContext = {
      ...context,
      ...(errorMessage && { error: errorMessage }),
    };
    console.error(formatMessage('error', message, fullContext));
  },
};

/**
 * Create a logger with a fixed prefix (e.g., for a specific module)
 */
export function createLogger(prefix: string) {
  return {
    debug: (message: string, context?: LogContext) =>
      logger.debug(`[${prefix}] ${message}`, context),
    info: (message: string, context?: LogContext) =>
      logger.info(`[${prefix}] ${message}`, context),
    warn: (message: string, context?: LogContext) =>
      logger.warn(`[${prefix}] ${message}`, context),
    error: (message: string, error?: Error | unknown, context?: LogContext) =>
      logger.error(`[${prefix}] ${message}`, error, context),
  };
}
