/**
 * BuildMate - Main Worker Entry Point
 *
 * AI-powered shopping assistant for complex product builds.
 * This is the main entry point for the Cloudflare Workers application.
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { apiRoutes } from './api';
import { requestIdMiddleware } from './middleware/requestId';
import type { Env, Variables } from './types';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Global middleware
app.use('*', logger());
app.use('*', secureHeaders());
app.use('*', requestIdMiddleware);

// CORS for API routes
app.use('/api/*', cors({
  origin: [
    'https://buildmate.pages.dev',
    'http://localhost:8787',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposeHeaders: ['X-Request-ID'],
  maxAge: 86400,
  credentials: true,
}));

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: c.env.APP_VERSION,
  });
});

// API routes
app.route('/api', apiRoutes);

// Root endpoint
app.get('/', async (c) => {
  // Workers Assets will handle static files automatically
  // This returns index.html for the root path
  return c.env.ASSETS.fetch(new Request(new URL('/index.html', c.req.url)));
});

// Fallback to index.html for SPA routing
app.get('*', async (c) => {
  // First try to serve static assets
  const url = new URL(c.req.url);

  // If the path has a file extension, try to serve it as a static file
  if (url.pathname.includes('.')) {
    return c.env.ASSETS.fetch(c.req.raw);
  }

  // Otherwise, return index.html for SPA client-side routing
  return c.env.ASSETS.fetch(new Request(new URL('/index.html', c.req.url)));
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
