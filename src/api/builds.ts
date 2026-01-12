/**
 * Builds API Routes
 *
 * Handles CRUD operations for builds and build workflow.
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import type { Env, Variables } from '../types';

const builds = new Hono<{ Bindings: Env; Variables: Variables }>();

// Validation schemas
const createBuildSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  budgetMin: z.number().positive('Budget minimum must be positive'),
  budgetMax: z.number().positive('Budget maximum must be positive'),
}).refine((data) => data.budgetMin < data.budgetMax, {
  message: 'Budget minimum must be less than maximum',
  path: ['budgetMin'],
});

const selectOptionSchema = z.object({
  optionId: z.string().min(1, 'Option ID is required'),
});

// Get all builds
builds.get('/', async (c) => {
  try {
    const result = await c.env.DB.prepare(
      'SELECT * FROM builds ORDER BY created_at DESC'
    ).all();

    const builds = result.results.map((b) => ({
      id: b.id,
      description: b.description,
      budget: {
        min: b.budget_min,
        max: b.budget_max,
      },
      status: b.status,
      currentStep: b.current_step,
      structure: b.structure_json ? JSON.parse(b.structure_json as string) : null,
      createdAt: b.created_at,
      updatedAt: b.updated_at,
      completedAt: b.completed_at,
    }));

    return c.json({ builds });
  } catch (error) {
    console.error('Error fetching builds:', error);
    return c.json(
      {
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to fetch builds',
        },
        requestId: c.get('requestId'),
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

// Get single build with items
builds.get('/:id', async (c) => {
  const buildId = c.req.param('id');

  try {
    const build = await c.env.DB.prepare(
      'SELECT * FROM builds WHERE id = ?'
    ).bind(buildId).first();

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
    const items = await c.env.DB.prepare(
      'SELECT * FROM build_items WHERE build_id = ? ORDER BY step_index'
    ).bind(buildId).all();

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

// Create new build
builds.post('/', zValidator('json', createBuildSchema), async (c) => {
  const data = c.req.valid('json');
  const buildId = uuidv4();
  const sessionId = uuidv4();

  try {
    await c.env.DB.prepare(
      `INSERT INTO builds (id, user_session_id, description, budget_min, budget_max, status, current_step)
       VALUES (?, ?, ?, ?, ?, 'in_progress', 0)`
    ).bind(
      buildId,
      sessionId,
      data.description.trim(),
      data.budgetMin,
      data.budgetMax
    ).run();

    return c.json(
      {
        buildId,
        sessionId,
        description: data.description.trim(),
        budget: {
          min: data.budgetMin,
          max: data.budgetMax,
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

// Initialize build structure (triggers Structure Generator AI)
builds.post('/:id/init', async (c) => {
  const buildId = c.req.param('id');

  // TODO: Implement Structure Generator agent call
  return c.json(
    {
      message: 'Structure generation not yet implemented',
      buildId,
      requestId: c.get('requestId'),
    },
    501
  );
});

// Get options for step
builds.get('/:id/step/:n/options', async (c) => {
  const buildId = c.req.param('id');
  const stepIndex = parseInt(c.req.param('n'), 10);

  // TODO: Implement Option Generator agent call
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

// Select option for step
builds.post('/:id/step/:n/select', zValidator('json', selectOptionSchema), async (c) => {
  const buildId = c.req.param('id');
  const stepIndex = parseInt(c.req.param('n'), 10);
  const { optionId } = c.req.valid('json');

  // TODO: Implement selection logic
  return c.json(
    {
      message: 'Selection not yet implemented',
      buildId,
      stepIndex,
      optionId,
      requestId: c.get('requestId'),
    },
    501
  );
});

// Complete build
builds.post('/:id/complete', async (c) => {
  const buildId = c.req.param('id');

  try {
    await c.env.DB.prepare(
      `UPDATE builds SET status = 'completed', completed_at = datetime('now'), updated_at = datetime('now')
       WHERE id = ? AND status = 'in_progress'`
    ).bind(buildId).run();

    return c.json({
      buildId,
      status: 'completed',
      completedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error completing build:', error);
    return c.json(
      {
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to complete build',
        },
        requestId: c.get('requestId'),
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

// Get assembly instructions
builds.get('/:id/instructions', async (c) => {
  const buildId = c.req.param('id');

  // TODO: Implement Instruction Generator agent call
  return c.json(
    {
      message: 'Instruction generation not yet implemented',
      buildId,
      requestId: c.get('requestId'),
    },
    501
  );
});

// Export build as JSON
builds.get('/:id/export', async (c) => {
  const buildId = c.req.param('id');

  try {
    const build = await c.env.DB.prepare(
      'SELECT * FROM builds WHERE id = ?'
    ).bind(buildId).first();

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
    const items = await c.env.DB.prepare(
      'SELECT * FROM build_items WHERE build_id = ? ORDER BY step_index'
    ).bind(buildId).all();

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

export { builds as buildsRoutes };
