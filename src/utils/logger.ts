export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export interface Logger {
  debug(message: string, data?: unknown): void;
  info(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
  error(message: string, data?: unknown): void;
}

export function createLogger(prefix: string, level?: LogLevel): Logger {
  const minLevel = LOG_LEVELS[level ?? (process.env.LOG_LEVEL as LogLevel) ?? 'info'];

  const log = (msgLevel: LogLevel, message: string, data?: unknown) => {
    if (LOG_LEVELS[msgLevel] < minLevel) return;
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] [${prefix}] ${msgLevel.toUpperCase()}: ${message}`;
    if (data !== undefined) {
      console.log(line, typeof data === 'string' ? data : JSON.stringify(data));
    } else {
      console.log(line);
    }
  };

  return {
    debug: (msg, data?) => log('debug', msg, data),
    info: (msg, data?) => log('info', msg, data),
    warn: (msg, data?) => log('warn', msg, data),
    error: (msg, data?) => log('error', msg, data),
  };
}
