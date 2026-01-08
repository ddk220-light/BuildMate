/**
 * BuildMate API
 *
 * Main entry point for the Cloudflare Workers application.
 */

import { Hono } from 'hono';
import type { Env, Variables } from './types/env';
import { requestIdMiddleware, corsMiddleware, loggingMiddleware } from './middleware';
import routes from './routes';

// Create Hono app with typed bindings
const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Apply middleware stack
app.use('*', requestIdMiddleware);
app.use('*', corsMiddleware);
app.use('*', loggingMiddleware);

// Mount API routes under /api prefix
app.route('/api', routes);

// Root endpoint
app.get('/', (c) => {
  return c.json({
    name: 'BuildMate API',
    version: c.env.APP_VERSION,
    documentation: '/api/health',
  });
});

// 404 handler for unmatched routes
app.notFound((c) => {
  return c.json(
    {
      error: {
        code: 'NOT_FOUND',
        message: `Route ${c.req.method} ${c.req.path} not found`,
      },
      requestId: c.get('requestId'),
      timestamp: new Date().toISOString(),
    },
    404
  );
});

// Global error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json(
    {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
      requestId: c.get('requestId'),
      timestamp: new Date().toISOString(),
    },
    500
  );
});

export default app;
