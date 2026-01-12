/**
 * Request ID Middleware
 *
 * Generates a unique ID for each request and attaches it to the context.
 * Also adds the X-Request-ID header to all responses.
 */

import { createMiddleware } from 'hono/factory';
import { v4 as uuidv4 } from 'uuid';
import type { Env, Variables } from '../types';

export const requestIdMiddleware = createMiddleware<{
  Bindings: Env;
  Variables: Variables;
}>(async (c, next) => {
  // Generate a unique request ID
  const requestId = uuidv4();

  // Store in context for use by other middleware/handlers
  c.set('requestId', requestId);
  c.set('requestStart', Date.now());

  // Add to response headers
  c.header('X-Request-ID', requestId);

  await next();
});
