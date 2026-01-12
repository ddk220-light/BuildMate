/**
 * Gemini AI API Routes
 *
 * Handles AI-powered suggestions and analysis using Google Gemini.
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Env, Variables } from '../types';
import { GeminiClient } from '../services/gemini';

const gemini = new Hono<{ Bindings: Env; Variables: Variables }>();

// Validation schemas
const suggestSchema = z.object({
  requirements: z.string().min(1, 'Requirements are required'),
  budget: z.number().positive('Budget must be positive'),
  category: z.string().min(1, 'Category is required'),
});

const analyzeSchema = z.object({
  products: z.array(z.object({
    name: z.string(),
    category: z.string(),
    specs: z.record(z.union([z.string(), z.number()])).optional(),
  })).min(1, 'At least one product required'),
});

// AI-powered build suggestions
gemini.post('/suggest', zValidator('json', suggestSchema), async (c) => {
  const { requirements, budget, category } = c.req.valid('json');

  const client = new GeminiClient({
    apiKey: c.env.GEMINI_API_KEY,
    model: c.env.GEMINI_MODEL,
    baseUrl: c.env.GEMINI_API_BASE_URL,
  });

  const systemPrompt = `You are a PC building expert. Provide recommendations in valid JSON format only.`;

  const userPrompt = `Based on the following requirements, suggest a compatible build:

Requirements: ${requirements}
Budget: $${budget}
Category: ${category}

Respond with JSON:
{
  "recommendations": [
    { "category": "CPU", "suggestion": "...", "reason": "..." },
    { "category": "GPU", "suggestion": "...", "reason": "..." }
  ],
  "totalEstimate": number,
  "compatibilityNotes": ["..."]
}`;

  try {
    const result = await client.call({
      systemPrompt,
      userPrompt,
      maxTokens: 2048,
      temperature: 0.7,
    });

    if (!result.success) {
      return c.json(
        {
          error: {
            code: 'AI_ERROR',
            message: result.error || 'AI service unavailable',
          },
          requestId: c.get('requestId'),
          timestamp: new Date().toISOString(),
        },
        503
      );
    }

    // Try to parse JSON from response
    const text = result.rawText || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      try {
        const data = JSON.parse(jsonMatch[0]);
        return c.json(data);
      } catch {
        // Fall through to return raw text
      }
    }

    return c.json({
      rawResponse: text,
      warning: 'Could not parse structured response',
    });
  } catch (error) {
    console.error('Gemini API error:', error);
    return c.json(
      {
        error: {
          code: 'AI_ERROR',
          message: 'AI service unavailable',
        },
        requestId: c.get('requestId'),
        timestamp: new Date().toISOString(),
      },
      503
    );
  }
});

// AI-powered compatibility analysis
gemini.post('/analyze', zValidator('json', analyzeSchema), async (c) => {
  const { products } = c.req.valid('json');

  const client = new GeminiClient({
    apiKey: c.env.GEMINI_API_KEY,
    model: c.env.GEMINI_MODEL,
    baseUrl: c.env.GEMINI_API_BASE_URL,
  });

  const systemPrompt = `You are a PC component compatibility expert. Analyze components and respond in valid JSON format only.`;

  const userPrompt = `Analyze the compatibility of these PC components:
${JSON.stringify(products, null, 2)}

Respond with JSON:
{
  "compatible": boolean,
  "score": number (0-100),
  "issues": ["..."],
  "suggestions": ["..."],
  "bottlenecks": ["..."]
}`;

  try {
    const result = await client.call({
      systemPrompt,
      userPrompt,
      maxTokens: 2048,
      temperature: 0.5,
    });

    if (!result.success) {
      return c.json(
        {
          error: {
            code: 'AI_ERROR',
            message: result.error || 'AI service unavailable',
          },
          requestId: c.get('requestId'),
          timestamp: new Date().toISOString(),
        },
        503
      );
    }

    // Try to parse JSON from response
    const text = result.rawText || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      try {
        const data = JSON.parse(jsonMatch[0]);
        return c.json(data);
      } catch {
        // Fall through to return raw text
      }
    }

    return c.json({
      rawResponse: text,
      warning: 'Could not parse structured response',
    });
  } catch (error) {
    console.error('Gemini API error:', error);
    return c.json(
      {
        error: {
          code: 'AI_ERROR',
          message: 'AI service unavailable',
        },
        requestId: c.get('requestId'),
        timestamp: new Date().toISOString(),
      },
      503
    );
  }
});

// Test AI connection
gemini.get('/status', async (c) => {
  const hasApiKey = !!c.env.GEMINI_API_KEY;

  return c.json({
    configured: hasApiKey,
    model: c.env.GEMINI_MODEL,
    baseUrl: c.env.GEMINI_API_BASE_URL,
  });
});

export { gemini as geminiRoutes };
