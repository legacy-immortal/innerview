/**
 * Request logging middleware with per-request timing.
 *
 * Logs one line per request: method, path, status, and duration.
 * Adds `X-Request-Id` (echoed from the client when present) and
 * `X-Response-Time` headers so clients can correlate logs.
 */
import type { MiddlewareHandler } from 'hono';
import { randomUUID } from 'node:crypto';
import { createLogger } from '../logger.js';

const logger = createLogger('http');

export const requestLogger = (): MiddlewareHandler => {
  return async (c, next) => {
    const startedAt = performance.now();
    const requestId = c.req.header('X-Request-Id')?.trim() || randomUUID();
    c.set('requestId', requestId);

    await next();

    const durationMs = Math.max(0, Math.round(performance.now() - startedAt));
    const status = c.res.status;
    const method = c.req.method;
    const path = c.req.path;

    // Health checks are polled frequently; keep them at debug level.
    if (path === '/health' && status < 400) {
      logger.debug(
        '%s %s %s %sms id=%s',
        method,
        path,
        status,
        durationMs,
        requestId
      );
    } else if (status >= 500) {
      logger.error(
        '%s %s %s %sms id=%s',
        method,
        path,
        status,
        durationMs,
        requestId
      );
    } else if (status >= 400) {
      logger.warn(
        '%s %s %s %sms id=%s',
        method,
        path,
        status,
        durationMs,
        requestId
      );
    } else {
      logger.info(
        '%s %s %s %sms id=%s',
        method,
        path,
        status,
        durationMs,
        requestId
      );
    }

    c.res.headers.set('X-Request-Id', requestId);
    c.res.headers.set('X-Response-Time', `${durationMs}ms`);
  };
};
