/**
 * API Routes Index
 *
 * Defines all API endpoints for BuildMate.
 */

import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { productsRoutes } from './products';
import { buildsRoutes } from './builds';
import { compatibilityRoutes } from './compatibility';
import { geminiRoutes } from './gemini';

const api = new Hono<{ Bindings: Env; Variables: Variables }>();

// Mount route modules
api.route('/products', productsRoutes);
api.route('/builds', buildsRoutes);
api.route('/compatibility', compatibilityRoutes);
api.route('/ai', geminiRoutes);

// API info endpoint
api.get('/', (c) => {
  return c.json({
    name: 'BuildMate API',
    version: c.env.APP_VERSION,
    endpoints: ['/products', '/builds', '/compatibility', '/ai'],
    documentation: '/api/health',
  });
});

// Health check endpoint
api.get('/health', async (c) => {
  let dbStatus = 'unknown';

  // Check database connectivity
  try {
    await c.env.DB.prepare('SELECT 1').first();
    dbStatus = 'connected';
  } catch {
    dbStatus = 'disconnected';
  }

  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: c.env.ENVIRONMENT,
    version: c.env.APP_VERSION,
    database: dbStatus,
  });
});

export { api as apiRoutes };
