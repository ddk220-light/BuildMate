/**
 * Products API Routes
 *
 * Handles CRUD operations for products.
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Env, Variables } from '../types';

const products = new Hono<{ Bindings: Env; Variables: Variables }>();

// Validation schemas
const productSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  category: z.string().min(1, 'Category is required'),
  price: z.number().positive('Price must be positive'),
  specs: z.record(z.union([z.string(), z.number()])).default({}),
  compatibilityTags: z.array(z.string()).default([]),
});

const querySchema = z.object({
  category: z.string().optional(),
  search: z.string().optional(),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).optional(),
  offset: z.string().transform(Number).pipe(z.number().min(0)).optional(),
});

// Get all products with optional filtering
products.get('/', async (c) => {
  const { category, search, limit = '50', offset = '0' } = c.req.query();

  let query = 'SELECT * FROM products WHERE 1=1';
  const params: (string | number)[] = [];

  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }

  if (search) {
    query += ' AND name LIKE ?';
    params.push(`%${search}%`);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit, 10), parseInt(offset, 10));

  try {
    const result = await c.env.DB.prepare(query).bind(...params).all();

    // Parse JSON fields
    const products = result.results.map((p) => ({
      ...p,
      specs: typeof p.specs === 'string' ? JSON.parse(p.specs) : p.specs,
      compatibilityTags: typeof p.compatibility_tags === 'string'
        ? JSON.parse(p.compatibility_tags)
        : p.compatibility_tags,
    }));

    return c.json({
      products,
      meta: {
        total: result.results.length,
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
      },
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return c.json(
      {
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to fetch products',
        },
        requestId: c.get('requestId'),
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

// Get single product
products.get('/:id', async (c) => {
  const id = c.req.param('id');

  try {
    const result = await c.env.DB.prepare(
      'SELECT * FROM products WHERE id = ?'
    ).bind(id).first();

    if (!result) {
      return c.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Product not found',
          },
          requestId: c.get('requestId'),
          timestamp: new Date().toISOString(),
        },
        404
      );
    }

    // Parse JSON fields
    const product = {
      ...result,
      specs: typeof result.specs === 'string' ? JSON.parse(result.specs) : result.specs,
      compatibilityTags: typeof result.compatibility_tags === 'string'
        ? JSON.parse(result.compatibility_tags)
        : result.compatibility_tags,
    };

    return c.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    return c.json(
      {
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to fetch product',
        },
        requestId: c.get('requestId'),
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

// Create product
products.post('/', zValidator('json', productSchema), async (c) => {
  const data = c.req.valid('json');
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  try {
    await c.env.DB.prepare(`
      INSERT INTO products (id, name, category, price, specs, compatibility_tags, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      data.name,
      data.category,
      data.price,
      JSON.stringify(data.specs),
      JSON.stringify(data.compatibilityTags),
      now,
      now
    ).run();

    return c.json(
      {
        id,
        name: data.name,
        category: data.category,
        price: data.price,
        specs: data.specs,
        compatibilityTags: data.compatibilityTags,
        createdAt: now,
        updatedAt: now,
      },
      201
    );
  } catch (error) {
    console.error('Error creating product:', error);
    return c.json(
      {
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to create product',
        },
        requestId: c.get('requestId'),
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

// Update product
products.put('/:id', zValidator('json', productSchema.partial()), async (c) => {
  const id = c.req.param('id');
  const data = c.req.valid('json');
  const now = new Date().toISOString();

  try {
    // Check if product exists
    const existing = await c.env.DB.prepare(
      'SELECT * FROM products WHERE id = ?'
    ).bind(id).first();

    if (!existing) {
      return c.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Product not found',
          },
          requestId: c.get('requestId'),
          timestamp: new Date().toISOString(),
        },
        404
      );
    }

    // Build update query
    const updates: string[] = [];
    const params: (string | number)[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      params.push(data.name);
    }
    if (data.category !== undefined) {
      updates.push('category = ?');
      params.push(data.category);
    }
    if (data.price !== undefined) {
      updates.push('price = ?');
      params.push(data.price);
    }
    if (data.specs !== undefined) {
      updates.push('specs = ?');
      params.push(JSON.stringify(data.specs));
    }
    if (data.compatibilityTags !== undefined) {
      updates.push('compatibility_tags = ?');
      params.push(JSON.stringify(data.compatibilityTags));
    }

    updates.push('updated_at = ?');
    params.push(now);
    params.push(id);

    await c.env.DB.prepare(
      `UPDATE products SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...params).run();

    return c.json({ id, ...data, updatedAt: now });
  } catch (error) {
    console.error('Error updating product:', error);
    return c.json(
      {
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to update product',
        },
        requestId: c.get('requestId'),
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

// Delete product
products.delete('/:id', async (c) => {
  const id = c.req.param('id');

  try {
    const result = await c.env.DB.prepare(
      'DELETE FROM products WHERE id = ?'
    ).bind(id).run();

    if (result.meta.changes === 0) {
      return c.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Product not found',
          },
          requestId: c.get('requestId'),
          timestamp: new Date().toISOString(),
        },
        404
      );
    }

    return c.json({ success: true, id });
  } catch (error) {
    console.error('Error deleting product:', error);
    return c.json(
      {
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to delete product',
        },
        requestId: c.get('requestId'),
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

export { products as productsRoutes };
