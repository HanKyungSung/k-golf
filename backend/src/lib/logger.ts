import pino, { Logger } from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Shared pino logger instance.
 *
 * - Production: JSON to stdout (captured by Docker json-file driver)
 * - Development: pretty-printed via pino-pretty
 *
 * LOG_LEVEL env var overrides the default level (info).
 * Sensitive headers are automatically redacted.
 */
const logger: Logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie'],
    censor: '[REDACTED]',
  },
  ...(isProduction
    ? {} // JSON to stdout — fastest, Docker captures it
    : { transport: { target: 'pino-pretty', options: { colorize: true } } }),
});

export default logger;
