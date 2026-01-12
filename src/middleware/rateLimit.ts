/**
 * Rate Limiting Middleware
 *
 * Implements basic rate limiting using KV storage.
 */

import { createMiddleware } from 'hono/factory';
import type { Env, Variables } from '../types';

const RATE_LIMIT_WINDOW = 60; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 100;

export const rateLimitMiddleware = createMiddleware<{
  Bindings: Env;
  Variables: Variables;
}>(async (c, next) => {
  // Skip rate limiting if KV is not configured
  if (!c.env.CACHE) {
    await next();
    return;
  }

  // Get client identifier (IP address or fallback)
  const clientId = c.req.header('CF-Connecting-IP') ||
    c.req.header('X-Forwarded-For')?.split(',')[0] ||
    'unknown';

  const key = `ratelimit:${clientId}`;

  try {
    // Get current count
    const data = await c.env.CACHE.get(key);
    const count = data ? parseInt(data, 10) : 0;

    if (count >= MAX_REQUESTS_PER_WINDOW) {
      return c.json(
        {
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many requests. Please try again later.',
          },
          requestId: c.get('requestId'),
          timestamp: new Date().toISOString(),
        },
        429
      );
    }

    // Increment counter
    await c.env.CACHE.put(key, String(count + 1), {
      expirationTtl: RATE_LIMIT_WINDOW,
    });

    // Add rate limit headers
    c.header('X-RateLimit-Limit', String(MAX_REQUESTS_PER_WINDOW));
    c.header('X-RateLimit-Remaining', String(MAX_REQUESTS_PER_WINDOW - count - 1));

    await next();
  } catch (error) {
    // If rate limiting fails, proceed with the request
    console.error('Rate limiting error:', error);
    await next();
  }
});
