/**
 * Request Logging Middleware
 *
 * Logs all incoming requests with timing information.
 */

import { createMiddleware } from 'hono/factory';
import type { Env, Variables } from '../types/env';

export const loggingMiddleware = createMiddleware<{
  Bindings: Env;
  Variables: Variables;
}>(async (c, next) => {
  const start = c.get('requestStart') ?? Date.now();
  const requestId = c.get('requestId') ?? 'unknown';
  const method = c.req.method;
  const path = c.req.path;

  await next();

  const duration = Date.now() - start;
  const status = c.res.status;

  // Log in structured format
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      requestId,
      method,
      path,
      status,
      durationMs: duration,
    })
  );
});
