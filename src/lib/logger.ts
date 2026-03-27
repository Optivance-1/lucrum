type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  timestamp: string
  level: LogLevel
  scope: string
  message: string
  meta?: unknown
  requestId?: string
  userId?: string
}

function baseLog(level: LogLevel, scope: string, message: string, meta?: unknown) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    scope,
    message,
    ...(meta !== undefined && { meta }),
  }

  // In production, output JSON for log aggregation (Datadog, LogDNA, etc.)
  if (process.env.NODE_ENV === 'production') {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(entry))
  } else {
    // In development, pretty print
    // eslint-disable-next-line no-console
    console[level](
      `[${entry.timestamp}] [${scope}] ${message}`,
      meta !== undefined ? meta : ''
    )
  }
}

export const logger = {
  debug(scope: string, message: string, meta?: unknown) {
    if (process.env.NODE_ENV === 'production') return
    baseLog('debug', scope, message, meta)
  },
  info(scope: string, message: string, meta?: unknown) {
    baseLog('info', scope, message, meta)
  },
  warn(scope: string, message: string, meta?: unknown) {
    baseLog('warn', scope, message, meta)
  },
  error(scope: string, message: string, meta?: unknown) {
    baseLog('error', scope, message, meta)
  },
}

// Export for middleware to attach request context
export function withRequestContext(requestId: string, userId?: string) {
  return {
    info: (scope: string, message: string, meta?: unknown) =>
      baseLog('info', scope, message, { ...(typeof meta === 'object' && meta !== null ? meta : {}), requestId, userId }),
    warn: (scope: string, message: string, meta?: unknown) =>
      baseLog('warn', scope, message, { ...(typeof meta === 'object' && meta !== null ? meta : {}), requestId, userId }),
    error: (scope: string, message: string, meta?: unknown) =>
      baseLog('error', scope, message, { ...(typeof meta === 'object' && meta !== null ? meta : {}), requestId, userId }),
  }
}

