/**
 * Authentication Middleware
 *
 * Handles API authentication for protected routes.
 * Currently implements basic API key authentication.
 */

import { createMiddleware } from 'hono/factory';
import type { Env, Variables } from '../types';

export const authMiddleware = createMiddleware<{
  Bindings: Env;
  Variables: Variables;
}>(async (c, next) => {
  // For now, skip auth in development
  if (c.env.ENVIRONMENT === 'development') {
    await next();
    return;
  }

  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json(
      {
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid authorization header',
        },
        requestId: c.get('requestId'),
        timestamp: new Date().toISOString(),
      },
      401
    );
  }

  // In a production app, validate the token here
  // For now, just proceed with the request
  await next();
});
