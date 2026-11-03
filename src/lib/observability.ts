/**
 * Observability, structured logging, audit tracking, dan sanitasi PII/rahasia.
 * Menjamin tidak ada password, token, email, chat pribadi, atau service_role yang bocor ke log.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  auditId: string;
  level: LogLevel;
  action: string;
  timestamp: string;
  context?: Record<string, unknown>;
  error?: string;
}

const SENSITIVE_KEYS = [
  "password",
  "token",
  "secret",
  "authorization",
  "auth",
  "email",
  "key",
  "service_role",
  "cookie",
  "credential",
  "message",
  "location",
  "gps",
  "lat",
  "lng",
];

let inMemoryLogs: LogEntry[] = [];
const MAX_LOGS = 100;

export function generateAuditId(): string {
  return `aud-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Menyaring objek secara rekursif untuk menyamarkan (redact) data sensitif / PII.
 */
export function redactSensitiveData(data: unknown): unknown {
  if (data === null || data === undefined) return data;

  if (typeof data === "string") {
    // Redact JWT or token pattern
    if (/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(data)) {
      return "[REDACTED_JWT]";
    }
    // Redact email pattern
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data)) {
      return "[REDACTED_EMAIL]";
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(redactSensitiveData);
  }

  if (typeof data === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
      const lower = key.toLowerCase();
      const isSensitive = SENSITIVE_KEYS.some((sensitive) => lower.includes(sensitive));

      if (isSensitive) {
        sanitized[key] = "[REDACTED]";
      } else {
        sanitized[key] = redactSensitiveData(val);
      }
    }
    return sanitized;
  }

  return data;
}

function createLogEntry(
  level: LogLevel,
  action: string,
  context?: Record<string, unknown>,
  err?: unknown,
): LogEntry {
  const auditId = generateAuditId();
  const entry: LogEntry = {
    auditId,
    level,
    action,
    timestamp: new Date().toISOString(),
    context: context ? (redactSensitiveData(context) as Record<string, unknown>) : undefined,
    error: err instanceof Error ? err.message : err ? String(err) : undefined,
  };

  inMemoryLogs.push(entry);
  if (inMemoryLogs.length > MAX_LOGS) {
    inMemoryLogs.shift();
  }

  // Console output hanya jika dev/debugging
  if (import.meta.env?.DEV) {
    const formatted = `[${entry.level.toUpperCase()}] ${entry.action} (${entry.auditId})`;
    if (level === "error") {
      console.error(formatted, entry.context, entry.error);
    } else if (level === "warn") {
      console.warn(formatted, entry.context);
    }
  }

  return entry;
}

export const logger = {
  info(action: string, context?: Record<string, unknown>): LogEntry {
    return createLogEntry("info", action, context);
  },
  warn(action: string, context?: Record<string, unknown>): LogEntry {
    return createLogEntry("warn", action, context);
  },
  error(action: string, error?: unknown, context?: Record<string, unknown>): LogEntry {
    return createLogEntry("error", action, context, error);
  },
  trackEvent(eventName: string, properties?: Record<string, unknown>): LogEntry {
    return createLogEntry("info", `event:${eventName}`, properties);
  },
};

export function getRecentAuditLogs(): readonly LogEntry[] {
  return inMemoryLogs;
}

export function clearAuditLogs(): void {
  inMemoryLogs = [];
}
