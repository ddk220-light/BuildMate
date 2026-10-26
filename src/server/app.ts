import { Hono } from 'hono';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env variables
dotenv.config();

import type { Env, Variables } from './types/env.js';
import { requestIdMiddleware, corsMiddleware, loggingMiddleware } from './middleware/index.js';
import routes from './routes/index.js';
import { getDbPool, D1ToPgAdapter } from './db.js';
import { initializeRegistry } from './lib/skills/index.js';

// Initialize domain skill registry before routes are registered.
// The registry gracefully handles a missing directory with a warning.
initializeRegistry(resolve(process.cwd(), 'src/server/lib/skills/domains'));

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
