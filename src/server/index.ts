import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env variables
dotenv.config();

import type { Env, Variables } from './types/env';
import { requestIdMiddleware, corsMiddleware, loggingMiddleware } from './middleware';
import routes from './routes';
import { getDbPool, D1ToPgAdapter } from './db';

// Create Hono app with typed bindings
const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Inject environment variables from Node process.env to c.env
app.use('*', async (c, next) => {
  if (!c.env) {
    (c.env as any) = {};
  }
  c.env.ENVIRONMENT = process.env.ENVIRONMENT || 'development';
  c.env.GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
  c.env.GEMINI_API_BASE_URL = process.env.GEMINI_API_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';
  c.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
  c.env.APP_VERSION = process.env.APP_VERSION || '1.0.0';

  // Inject the PostgreSQL dummy D1 Database adapter
  c.env.DB = new D1ToPgAdapter(getDbPool()) as any;

  await next();
});

// Apply middleware stack
app.use('*', requestIdMiddleware);
app.use('*', corsMiddleware);
app.use('*', loggingMiddleware);

// Mount API routes under /api prefix
app.route('/api', routes);

// Serve static frontend files from 'dist/client'
app.use('/*', serveStatic({ root: './dist/client' }));

// For any other route, fallback to index.html for React Router SPA
app.get('*', serveStatic({ path: './dist/client/index.html' }));

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

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 8787;
console.log(`Server starting on port ${port}...`);

serve({
  fetch: app.fetch,
  port
});

export default app;
