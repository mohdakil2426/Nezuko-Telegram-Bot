/**
 * Structured logging utility for Next.js web application.
 *
 * Features:
 * - Browser-safe console logging with JSON format option
 * - Context enrichment (user_id, session_id, page)
 * - Log levels (debug, info, warn, error)
 * - API endpoint logging integration
 * - Performance-safe (no-op in production for debug logs)
 *
 * Usage:
 *   import { logger, logPageView, logError } from '@/lib/logger';
 *
 *   logger.info('User action', { action: 'click', button: 'submit' });
 *   logError('Failed to load data', error, { page: '/dashboard' });
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  [key: string]: unknown;
  user_id?: string | number;
  session_id?: string;
  page?: string;
  request_id?: string;
  component?: string;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  app: string;
  environment: string;
  source: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

// Environment detection
const isDevelopment = process.env.NODE_ENV === "development";
const isClient = typeof window !== "undefined";

/**
 * Get current environment
 */
function getEnvironment(): string {
  return process.env.NODE_ENV || "development";
}

/**
 * Format log entry as JSON or pretty print
 */
function formatLogEntry(entry: LogEntry, pretty: boolean): string {
  if (pretty) {
    const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]`;
    const contextStr = entry.context ? ` ${JSON.stringify(entry.context)}` : "";
    const errorStr = entry.error ? `\n  Error: ${entry.error.name}: ${entry.error.message}` : "";
    return `${prefix} ${entry.message}${contextStr}${errorStr}`;
  }
  return JSON.stringify(entry);
}

/**
 * Core logging class
 */
class Logger {
  private source: string;
  private context: LogContext;

  constructor(source: string = "web", context: LogContext = {}) {
    this.source = source;
    this.context = context;
  }

  /**
   * Create a child logger with additional context
   */
  child(context: LogContext): Logger {
    return new Logger(this.source, { ...this.context, ...context });
  }

  /**
   * Internal log method
   */
  private log(level: LogLevel, message: string, context?: LogContext): void {
    // Skip debug logs in production
    if (level === "debug" && !isDevelopment) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      app: "nezuko-web",
      environment: getEnvironment(),
      source: this.source,
      context: { ...this.context, ...context },
    };

    const formatted = formatLogEntry(entry, isDevelopment);

    // Use appropriate console method
    switch (level) {
      case "debug":
        console.debug(formatted);
        break;
      case "info":
        console.info(formatted);
        break;
      case "warn":
        console.warn(formatted);
        break;
      case "error":
        console.error(formatted);
        break;
    }

    // In production, could also send to API endpoint
    if (!isDevelopment && level !== "debug") {
      this.sendToApi(entry);
    }
  }

  /**
   * Send log entry to API (for production logging)
   */
  private async sendToApi(entry: LogEntry): Promise<void> {
    // Only send errors and warnings to API in production
    if (entry.level === "debug" || entry.level === "info") {
      return;
    }

    try {
      // Write to InsForge admin_logs table via SDK
      if (isClient) {
        const { insforge } = await import("@/lib/insforge");
        await insforge.database.from("admin_logs").insert({
          level: entry.level.toUpperCase(),
          message: entry.message,
          extra: entry.context ?? null,
        });
      }
    } catch {
      // Silently fail - don't crash the app for logging issues
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log("debug", message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log("info", message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log("warn", message, context);
  }

  error(message: string, error?: Error, context?: LogContext): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: "error",
      message,
      app: "nezuko-web",
      environment: getEnvironment(),
      source: this.source,
      context: { ...this.context, ...context },
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    const formatted = formatLogEntry(entry, isDevelopment);
    console.error(formatted);

    if (!isDevelopment) {
      this.sendToApi(entry);
    }
  }
}

// Default logger instance
export const logger = new Logger("web");

// ====================
// Pre-defined Log Functions
// ====================

/**
 * Log page view event
 */
export function logPageView(path: string, userId?: string | number): void {
  logger.info("Page view", {
    page: path,
    user_id: userId,
  });
}

/**
 * Log navigation event
 */
export function logNavigation(from: string, to: string, userId?: string | number): void {
  logger.debug("Navigation", {
    from,
    to,
    user_id: userId,
  });
}

/**
 * Log user action
 */
export function logUserAction(action: string, target: string, context?: LogContext): void {
  logger.info(`User action: ${action}`, {
    action,
    target,
    ...context,
  });
}

/**
 * Log authentication event
 */
export function logAuth(
  event: "login" | "logout" | "session_refresh" | "session_expired",
  userId?: string | number,
  context?: LogContext
): void {
  logger.info(`Auth: ${event}`, {
    event,
    user_id: userId,
    ...context,
  });
}

/**
 * Log API call
 */
export function logApiCall(
  method: string,
  endpoint: string,
  statusCode?: number,
  durationMs?: number,
  context?: LogContext
): void {
  const level = statusCode && statusCode >= 400 ? "warn" : "debug";
  const message = `API ${method} ${endpoint}${statusCode ? ` -> ${statusCode}` : ""}`;

  if (level === "warn") {
    logger.warn(message, {
      method,
      endpoint,
      status_code: statusCode,
      duration_ms: durationMs,
      ...context,
    });
  } else {
    logger.debug(message, {
      method,
      endpoint,
      status_code: statusCode,
      duration_ms: durationMs,
      ...context,
    });
  }
}

/**
 * Log error with full context
 */
export function logError(message: string, error: Error, context?: LogContext): void {
  logger.error(message, error, context);
}

/**
 * Log component mount/unmount for debugging
 */
export function logComponent(
  event: "mount" | "unmount" | "render" | "error",
  componentName: string,
  context?: LogContext
): void {
  logger.debug(`Component ${event}: ${componentName}`, {
    component: componentName,
    event,
    ...context,
  });
}

/**
 * Log performance metric
 */
export function logPerformance(
  metric: string,
  value: number,
  unit: string = "ms",
  context?: LogContext
): void {
  logger.info(`Performance: ${metric}`, {
    metric,
    value,
    unit,
    ...context,
  });
}

// ====================
// React Error Boundary Integration
// ====================

/**
 * Error handler for React Error Boundaries
 */
export function handleReactError(error: Error, errorInfo: { componentStack: string }): void {
  logger.error("React component error", error, {
    component_stack: errorInfo.componentStack,
  });
}

// ====================
// Console Overrides for Development
// ====================

/**
 * Create a logger with component context
 */
export function createComponentLogger(componentName: string): Logger {
  return logger.child({ component: componentName });
}

export default logger;
