/**
 * Secure Logger - Prevents Information Leakage
 *
 * Replaces direct console.* usage to prevent sensitive data exposure
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  userId?: string;
  action?: string;
  ip?: string;
  userAgent?: string;
  [key: string]: unknown;
}

class SecureLogger {
  private isDevelopment = process.env.NODE_ENV === "development";

  /**
   * Sanitize sensitive data from logs
   */
  private sanitizeData(data: unknown): unknown {
    if (typeof data === "string") {
      // Remove potential passwords, tokens, keys
      return data
        .replace(/password[^&\s]*=([^&\s]*)/gi, "password=***")
        .replace(/token[^&\s]*=([^&\s]*)/gi, "token=***")
        .replace(/key[^&\s]*=([^&\s]*)/gi, "key=***")
        .replace(/secret[^&\s]*=([^&\s]*)/gi, "secret=***");
    }

    if (typeof data === "object" && data !== null) {
      const sanitized = { ...(data as Record<string, unknown>) };

      // Remove sensitive fields
      const sensitiveFields = [
        "password",
        "token",
        "key",
        "secret",
        "auth",
        "authorization",
        "cookie",
        "session",
        "csrf",
        "creditcard",
        "card",
        "cvv",
        "pin",
      ];

      sensitiveFields.forEach((field) => {
        Object.keys(sanitized).forEach((key) => {
          if (key.toLowerCase().includes(field)) {
            sanitized[key] = "***";
          }
        });
      });

      return sanitized;
    }

    return data;
  }

  /**
   * Create structured log entry
   */
  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: LogContext,
  ) {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: context ? this.sanitizeData(context) : undefined,
      environment: process.env.NODE_ENV,
    };
  }

  /**
   * Log debug information (development only)
   */
  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      const entry = this.createLogEntry("debug", message, context);
      console.debug("[DEBUG]", JSON.stringify(entry, null, 2));
    }
  }

  /**
   * Log informational messages
   */
  info(message: string, context?: LogContext): void {
    const entry = this.createLogEntry("info", message, context);
    console.info("[INFO]", JSON.stringify(entry));
  }

  /**
   * Log warnings
   */
  warn(message: string, context?: LogContext): void {
    const entry = this.createLogEntry("warn", message, context);
    console.warn("[WARN]", JSON.stringify(entry));
  }

  /**
   * Log errors (always logged, sanitized in production)
   */
  error(message: string, error?: unknown, context?: LogContext): void {
    const entry = this.createLogEntry("error", message, {
      ...context,
      error: this.isDevelopment ? error : this.sanitizeData(error),
    });
    console.error("[ERROR]", JSON.stringify(entry));
  }

  /**
   * Log security events (always logged with high priority)
   */
  security(message: string, context?: LogContext): void {
    const entry = this.createLogEntry(
      "error",
      `[SECURITY] ${message}`,
      context,
    );
    console.error("[SECURITY]", JSON.stringify(entry));

    // In production, could also send to external security monitoring
    if (!this.isDevelopment) {
      // TODO: Implement external security logging
      // await sendToSecurityService(entry);
    }
  }
}

export const secureLogger = new SecureLogger();

/**
 * Migration helper - gradually replace console.* usage
 */
export const logger = {
  debug: (message: string, context?: LogContext) =>
    secureLogger.debug(message, context),
  info: (message: string, context?: LogContext) =>
    secureLogger.info(message, context),
  warn: (message: string, context?: LogContext) =>
    secureLogger.warn(message, context),
  error: (message: string, error?: unknown, context?: LogContext) =>
    secureLogger.error(message, error, context),
  security: (message: string, context?: LogContext) =>
    secureLogger.security(message, context),
};
