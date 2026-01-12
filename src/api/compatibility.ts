/**
 * Compatibility API Routes
 *
 * Handles compatibility checks between products.
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Env, Variables } from '../types';
import { checkCompatibility } from '../services/compatibility';

const compatibility = new Hono<{ Bindings: Env; Variables: Variables }>();

// Validation schema
const checkSchema = z.object({
  productIds: z.array(z.string()).min(2, 'At least 2 product IDs required'),
});

// Check compatibility between products
compatibility.post('/check', zValidator('json', checkSchema), async (c) => {
  const { productIds } = c.req.valid('json');

  try {
    // Fetch products
    const placeholders = productIds.map(() => '?').join(',');
    const result = await c.env.DB.prepare(
      `SELECT * FROM products WHERE id IN (${placeholders})`
    ).bind(...productIds).all();

    const products = result.results;

    if (products.length !== productIds.length) {
      const foundIds = new Set(products.map((p) => p.id));
      const missingIds = productIds.filter((id) => !foundIds.has(id));

      return c.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: `Products not found: ${missingIds.join(', ')}`,
          },
          requestId: c.get('requestId'),
          timestamp: new Date().toISOString(),
        },
        404
      );
    }

    const compatibilityResult = await checkCompatibility(products, c.env);

    return c.json(compatibilityResult);
  } catch (error) {
    console.error('Error checking compatibility:', error);
    return c.json(
      {
        error: {
          code: 'COMPATIBILITY_ERROR',
          message: 'Failed to check compatibility',
        },
        requestId: c.get('requestId'),
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

// Get compatibility rules (for reference)
compatibility.get('/rules', (c) => {
  return c.json({
    rules: [
      {
        name: 'CPU-Motherboard Socket',
        description: 'CPU socket must match motherboard socket',
        components: ['CPU', 'Motherboard'],
      },
      {
        name: 'RAM-Motherboard Compatibility',
        description: 'RAM type must be supported by motherboard',
        components: ['RAM', 'Motherboard'],
      },
      {
        name: 'Power Supply Wattage',
        description: 'PSU wattage should be at least 20% above total system TDP',
        components: ['PSU', 'GPU', 'CPU'],
      },
      {
        name: 'GPU-Case Clearance',
        description: 'GPU length must fit within case GPU clearance',
        components: ['GPU', 'Case'],
      },
      {
        name: 'Cooler-Case Height',
        description: 'CPU cooler height must not exceed case CPU cooler clearance',
        components: ['CPU Cooler', 'Case'],
      },
    ],
  });
});

export { compatibility as compatibilityRoutes };
