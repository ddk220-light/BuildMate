/**
 * CORS Middleware Configuration
 *
 * Configures Cross-Origin Resource Sharing for the API.
 */

import { cors } from 'hono/cors';

/**
 * Development CORS configuration
 * Allows requests from local development servers
 */
export const corsMiddleware = cors({
  origin: [
    'http://localhost:5173', // Vite dev server
    'http://localhost:3000', // Alternative dev server
    'http://localhost:8787', // Wrangler dev server
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:8787',
    'https://buildmate.pages.dev', // Cloudflare Pages production
  ],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposeHeaders: ['X-Request-ID'],
  maxAge: 86400, // 24 hours
  credentials: true,
});

/**
 * Production CORS configuration
 * Should be updated with production domain
 */
export const productionCorsMiddleware = cors({
  origin: ['https://buildmate.dev', 'https://www.buildmate.dev'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposeHeaders: ['X-Request-ID'],
  maxAge: 86400,
  credentials: true,
});
