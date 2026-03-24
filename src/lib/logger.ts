type LogLevel = 'debug' | 'info' | 'warn' | 'error'

function baseLog(level: LogLevel, scope: string, message: string, meta?: unknown) {
  const ts = new Date().toISOString()
  // eslint-disable-next-line no-console
  console[level](
    `[${ts}] [${scope}] ${message}`,
    meta !== undefined ? meta : ''
  )
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

