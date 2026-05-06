type LogMeta = Record<string, unknown>;

const sensitiveKeyPattern = /(password|secret|token|key|authorization|cookie)/i;

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    };
  }

  return error;
}

function sanitize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitize);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as LogMeta).map(([key, nestedValue]) => [
        key,
        sensitiveKeyPattern.test(key) ? "[redacted]" : sanitize(nestedValue),
      ]),
    );
  }

  return value;
}

function write(level: "debug" | "info" | "warn" | "error", event: string, meta: LogMeta = {}) {
  if (level === "debug" && process.env.NODE_ENV !== "development") {
    return;
  }

  const sanitizedMeta = sanitize(meta) as LogMeta;
  const payload = {
    level,
    event,
    timestamp: new Date().toISOString(),
    service: "ethara-teams",
    ...sanitizedMeta,
  };

  const line = JSON.stringify(payload);

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.info(line);
}

export const logger = {
  debug: (event: string, meta?: LogMeta) => write("debug", event, meta),
  info: (event: string, meta?: LogMeta) => write("info", event, meta),
  warn: (event: string, meta?: LogMeta) => write("warn", event, meta),
  error: (event: string, error: unknown, meta: LogMeta = {}) =>
    write("error", event, { ...meta, error: serializeError(error) }),
};
