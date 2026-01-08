/**
 * API Routes
 *
 * Defines all API endpoints for BuildMate.
 */

import { Hono } from 'hono';
import { v4 as uuidv4 } from 'uuid';
import type { Env, Variables } from '../types/env';

// Create router with typed bindings
const routes = new Hono<{ Bindings: Env; Variables: Variables }>();

/**
 * Health Check Endpoint
 * GET /api/health
 */
routes.get('/health', async (c) => {
  const env = c.env;
  let dbStatus = 'unknown';

  // Check database connectivity
  try {
    await env.DB.prepare('SELECT 1').first();
    dbStatus = 'connected';
  } catch {
    dbStatus = 'disconnected';
  }

  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: env.ENVIRONMENT,
    version: env.APP_VERSION,
    database: dbStatus,
  });
});

/**
 * Create New Build
 * POST /api/builds
 */
routes.post('/builds', async (c) => {
  const env = c.env;
  const buildId = uuidv4();
  const sessionId = uuidv4(); // In experiment phase, generate anonymous session

  try {
    const body = await c.req.json<{
      description: string;
      budgetMin: number;
      budgetMax: number;
    }>();

    // Validate input
    if (!body.description || body.description.trim().length === 0) {
      return c.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Description is required',
          },
          requestId: c.get('requestId'),
          timestamp: new Date().toISOString(),
        },
        400
      );
    }

    if (body.budgetMin >= body.budgetMax) {
      return c.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Budget minimum must be less than maximum',
          },
          requestId: c.get('requestId'),
          timestamp: new Date().toISOString(),
        },
        400
      );
    }

    // Insert into database
    await env.DB.prepare(
      `INSERT INTO builds (id, user_session_id, description, budget_min, budget_max, status, current_step)
       VALUES (?, ?, ?, ?, ?, 'in_progress', 0)`
    )
      .bind(buildId, sessionId, body.description.trim(), body.budgetMin, body.budgetMax)
      .run();

    return c.json(
      {
        buildId,
        sessionId,
        description: body.description.trim(),
        budget: {
          min: body.budgetMin,
          max: body.budgetMax,
        },
        status: 'in_progress',
        currentStep: 0,
        createdAt: new Date().toISOString(),
      },
      201
    );
  } catch (error) {
    console.error('Error creating build:', error);
    return c.json(
      {
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to create build',
        },
        requestId: c.get('requestId'),
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

/**
 * Get Build State
 * GET /api/builds/:id
 */
routes.get('/builds/:id', async (c) => {
  const env = c.env;
  const buildId = c.req.param('id');

  try {
    const build = await env.DB.prepare(
      `SELECT * FROM builds WHERE id = ?`
    )
      .bind(buildId)
      .first();

    if (!build) {
      return c.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Build not found',
          },
          requestId: c.get('requestId'),
          timestamp: new Date().toISOString(),
        },
        404
      );
    }

    // Get build items
    const items = await env.DB.prepare(
      `SELECT * FROM build_items WHERE build_id = ? ORDER BY step_index`
    )
      .bind(buildId)
      .all();

    return c.json({
      build: {
        id: build.id,
        description: build.description,
        budget: {
          min: build.budget_min,
          max: build.budget_max,
        },
        status: build.status,
        currentStep: build.current_step,
        structure: build.structure_json ? JSON.parse(build.structure_json as string) : null,
        createdAt: build.created_at,
        updatedAt: build.updated_at,
        completedAt: build.completed_at,
      },
      items: items.results,
    });
  } catch (error) {
    console.error('Error fetching build:', error);
    return c.json(
      {
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to fetch build',
        },
        requestId: c.get('requestId'),
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

/**
 * Initialize Build Structure
 * POST /api/builds/:id/init
 *
 * Triggers the Structure Generator AI to determine 3 components
 */
routes.post('/builds/:id/init', async (c) => {
  const buildId = c.req.param('id');

  // TODO: Implement Structure Generator agent call
  // For now, return a stub response
  return c.json(
    {
      message: 'Structure generation not yet implemented',
      buildId,
      requestId: c.get('requestId'),
    },
    501
  );
});

/**
 * Get Options for Step
 * GET /api/builds/:id/step/:n/options
 *
 * Returns 3 product options for the specified step
 */
routes.get('/builds/:id/step/:n/options', async (c) => {
  const buildId = c.req.param('id');
  const stepIndex = parseInt(c.req.param('n'), 10);

  // TODO: Implement Option Generator agent call
  // For now, return a stub response
  return c.json(
    {
      message: 'Option generation not yet implemented',
      buildId,
      stepIndex,
      requestId: c.get('requestId'),
    },
    501
  );
});

/**
 * Select Option for Step
 * POST /api/builds/:id/step/:n/select
 *
 * Saves the selected option and advances to next step
 */
routes.post('/builds/:id/step/:n/select', async (c) => {
  const buildId = c.req.param('id');
  const stepIndex = parseInt(c.req.param('n'), 10);

  // TODO: Implement selection logic
  // For now, return a stub response
  return c.json(
    {
      message: 'Selection not yet implemented',
      buildId,
      stepIndex,
      requestId: c.get('requestId'),
    },
    501
  );
});

/**
 * Complete Build
 * POST /api/builds/:id/complete
 *
 * Marks the build as complete
 */
routes.post('/builds/:id/complete', async (c) => {
  const buildId = c.req.param('id');

  // TODO: Implement completion logic
  // For now, return a stub response
  return c.json(
    {
      message: 'Completion not yet implemented',
      buildId,
      requestId: c.get('requestId'),
    },
    501
  );
});

/**
 * Get Assembly Instructions
 * GET /api/builds/:id/instructions
 *
 * Returns the AI-generated assembly guide
 */
routes.get('/builds/:id/instructions', async (c) => {
  const buildId = c.req.param('id');

  // TODO: Implement Instruction Generator agent call
  // For now, return a stub response
  return c.json(
    {
      message: 'Instruction generation not yet implemented',
      buildId,
      requestId: c.get('requestId'),
    },
    501
  );
});

/**
 * Export Build as JSON
 * GET /api/builds/:id/export
 *
 * Returns the build in exportable JSON format
 */
routes.get('/builds/:id/export', async (c) => {
  const env = c.env;
  const buildId = c.req.param('id');

  try {
    const build = await env.DB.prepare(
      `SELECT * FROM builds WHERE id = ?`
    )
      .bind(buildId)
      .first();

    if (!build) {
      return c.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Build not found',
          },
          requestId: c.get('requestId'),
          timestamp: new Date().toISOString(),
        },
        404
      );
    }

    // Get build items
    const items = await env.DB.prepare(
      `SELECT * FROM build_items WHERE build_id = ? ORDER BY step_index`
    )
      .bind(buildId)
      .all();

    // Format for export
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      build: {
        id: build.id,
        category: build.structure_json
          ? JSON.parse(build.structure_json as string).buildCategory
          : null,
        description: build.description,
        budget: {
          min: build.budget_min,
          max: build.budget_max,
        },
        totalCost: items.results.reduce(
          (sum, item) => sum + ((item.product_price as number) || 0),
          0
        ),
        items: items.results.map((item) => ({
          step: item.step_index,
          componentType: item.component_type,
          product: {
            name: item.product_name,
            brand: item.product_brand,
            price: item.product_price,
            keySpec: item.product_specs,
            url: item.product_url,
          },
        })),
        createdAt: build.created_at,
        completedAt: build.completed_at,
      },
    };

    return c.json(exportData);
  } catch (error) {
    console.error('Error exporting build:', error);
    return c.json(
      {
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to export build',
        },
        requestId: c.get('requestId'),
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

export default routes;
