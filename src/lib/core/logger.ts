/**
 * Structured logging system
 */

export interface LogContext {
  userId?: string;
  requestId?: string;
  action?: string;
  resource?: string;
  ip?: string;
  userAgent?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
}

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: Error | unknown, context?: LogContext): void;
}

class ConsoleLogger implements Logger {
  private formatLogEntry(entry: LogEntry): string {
    return JSON.stringify(entry, null, process.env.NODE_ENV === 'development' ? 2 : 0);
  }

  private createLogEntry(
    level: LogEntry['level'],
    message: string,
    context?: LogContext,
    error?: Error | unknown
  ): LogEntry {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context
    };

    if (error) {
      if (error instanceof Error) {
        entry.error = {
          name: error.name,
          message: error.message,
          stack: error.stack,
          code: (error as { code?: string }).code
        };
      } else {
        entry.error = {
          name: 'UnknownError',
          message: String(error)
        };
      }
    }

    return entry;
  }

  debug(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV === 'development') {
      const entry = this.createLogEntry('debug', message, context);
      console.debug(this.formatLogEntry(entry));
    }
  }

  info(message: string, context?: LogContext): void {
    const entry = this.createLogEntry('info', message, context);
    console.info(this.formatLogEntry(entry));
  }

  warn(message: string, context?: LogContext): void {
    const entry = this.createLogEntry('warn', message, context);
    console.warn(this.formatLogEntry(entry));
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const entry = this.createLogEntry('error', message, context, error);
    console.error(this.formatLogEntry(entry));
  }
}

class DatabaseLogger implements Logger {
  constructor(private fallbackLogger: Logger) {}

  private async persistToDatabase(entry: LogEntry): Promise<void> {
    try {
      // Implementation will be added when we have the database service layer
      // For now, we'll use the fallback logger
      this.fallbackLogger.error('Database logging not implemented yet', undefined, {
        originalEntry: entry
      });
    } catch (error) {
      this.fallbackLogger.error('Failed to persist log to database', error);
    }
  }

  debug(message: string, context?: LogContext): void {
    this.fallbackLogger.debug(message, context);
  }

  info(message: string, context?: LogContext): void {
    this.fallbackLogger.info(message, context);
    // Don't persist info logs to database to avoid noise
  }

  warn(message: string, context?: LogContext): void {
    this.fallbackLogger.warn(message, context);
    const entry = this.createLogEntry('warn', message, context);
    this.persistToDatabase(entry).catch(() => {
      // Already handled in persistToDatabase
    });
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    this.fallbackLogger.error(message, error, context);
    const entry = this.createLogEntry('error', message, context, error);
    this.persistToDatabase(entry).catch(() => {
      // Already handled in persistToDatabase
    });
  }

  private createLogEntry(
    level: LogEntry['level'],
    message: string,
    context?: LogContext,
    error?: Error | unknown
  ): LogEntry {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context
    };

    if (error) {
      if (error instanceof Error) {
        entry.error = {
          name: error.name,
          message: error.message,
          stack: error.stack,
          code: (error as { code?: string }).code
        };
      } else {
        entry.error = {
          name: 'UnknownError',
          message: String(error)
        };
      }
    }

    return entry;
  }
}

// Singleton logger instance
let loggerInstance: Logger | null = null;

export function createLogger(): Logger {
  if (!loggerInstance) {
    const consoleLogger = new ConsoleLogger();
    
    if (process.env.NODE_ENV === 'production') {
      loggerInstance = new DatabaseLogger(consoleLogger);
    } else {
      loggerInstance = consoleLogger;
    }
  }
  
  return loggerInstance;
}

export const logger = createLogger();

/**
 * Utility functions for common logging patterns
 */
export const LogUtils = {
  /**
   * Logs the start of an operation
   */
  logOperationStart: (operation: string, context?: LogContext) => {
    logger.info(`Starting ${operation}`, { ...context, operation });
  },

  /**
   * Logs the success of an operation
   */
  logOperationSuccess: (operation: string, context?: LogContext) => {
    logger.info(`Successfully completed ${operation}`, { ...context, operation });
  },

  /**
   * Logs the failure of an operation
   */
  logOperationError: (operation: string, error: Error | unknown, context?: LogContext) => {
    logger.error(`Failed to complete ${operation}`, error, { ...context, operation });
  },

  /**
   * Creates a context object for a user action
   */
  createUserActionContext: (
    userId: string,
    action: string,
    resource?: string,
    additionalContext?: Record<string, string | number | boolean>
  ): LogContext => ({
    userId,
    action,
    resource,
    ...additionalContext
  }),

  /**
   * Creates a context object from a request
   */
  createRequestContext: (
    request: Request,
    additionalContext?: Record<string, string | number | boolean>
  ): LogContext => ({
    requestId: crypto.randomUUID(),
    ip: request.headers.get('x-forwarded-for') || 'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown',
    method: request.method,
    url: request.url,
    ...additionalContext
  })
};