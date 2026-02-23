/**
 * API Routes
 *
 * Defines all API endpoints for BuildMate.
 */

import { Hono } from "hono";
import { v4 as uuidv4 } from "uuid";
import type { Env, Variables } from "../types/env";
import {
  StructureGenerator,
  OptionGenerator,
  ExistingItemsParser,
  SetupStepsGenerator,
  buildContextFromDatabase,
  buildSetupStepsContextFromDatabase,
  getCachedOptions,
  saveShownOptions,
} from "../lib/agents";
import { detectSkill } from '../lib/skills';

// Create router with typed bindings
const routes = new Hono<{ Bindings: Env; Variables: Variables }>();

/**
 * Health Check Endpoint
 * GET /api/health
 */
routes.get("/health", async (c) => {
  const env = c.env;
  let dbStatus = "unknown";

  // Check database connectivity
  try {
    await env.DB.prepare("SELECT 1").first();
    dbStatus = "connected";
  } catch {
    dbStatus = "disconnected";
  }

  return c.json({
    status: "healthy",
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
routes.post("/builds", async (c) => {
  const env = c.env;
  const buildId = uuidv4();
  const sessionId = uuidv4(); // In experiment phase, generate anonymous session

  try {
    const body = await c.req.json<{
      description: string;
      budgetMin: number;
      budgetMax: number;
      existingItemsText?: string;
    }>();

    // Validate input
    if (!body.description || body.description.trim().length === 0) {
      return c.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Description is required",
          },
          requestId: c.get("requestId"),
          timestamp: new Date().toISOString(),
        },
        400,
      );
    }

    if (body.budgetMin >= body.budgetMax) {
      return c.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Budget minimum must be less than maximum",
          },
          requestId: c.get("requestId"),
          timestamp: new Date().toISOString(),
        },
        400,
      );
    }

    // Insert into database
    const existingItemsText = body.existingItemsText?.trim() || null;
    await env.DB.prepare(
      `INSERT INTO builds (id, user_session_id, description, budget_min, budget_max, existing_items_text, status, current_step)
       VALUES (?, ?, ?, ?, ?, ?, 'in_progress', 0)`,
    )
      .bind(
        buildId,
        sessionId,
        body.description.trim(),
        body.budgetMin,
        body.budgetMax,
        existingItemsText,
      )
      .run();

    // Detect domain skill for this build (non-blocking — if it fails, build continues without skill)
    try {
      const detection = await detectSkill(
        body.description.trim(),
        buildId,
        env.GEMINI_API_KEY,
        env.GEMINI_MODEL,
        env.DB,
        env.GEMINI_API_BASE_URL,
      );

      if (detection.skillId) {
        await env.DB.prepare(
          `UPDATE builds SET skill_id = ?, skill_confidence = ? WHERE id = ?`,
        )
          .bind(detection.skillId, detection.confidence, buildId)
          .run();
      }
    } catch (err) {
      // Skill detection failure should not block build creation
      console.error('Skill detection failed (non-blocking):', err);
    }

    return c.json(
      {
        buildId,
        sessionId,
        description: body.description.trim(),
        budget: {
          min: body.budgetMin,
          max: body.budgetMax,
        },
        existingItemsText: existingItemsText || undefined,
        status: "in_progress",
        currentStep: 0,
        createdAt: new Date().toISOString(),
      },
      201,
    );
  } catch (error) {
    console.error("Error creating build:", error);
    return c.json(
      {
        error: {
          code: "DATABASE_ERROR",
          message: "Failed to create build",
        },
        requestId: c.get("requestId"),
        timestamp: new Date().toISOString(),
      },
      500,
    );
  }
});

/**
 * Get Build State
 * GET /api/builds/:id
 */
routes.get("/builds/:id", async (c) => {
  const env = c.env;
  const buildId = c.req.param("id");

  try {
    const build = await env.DB.prepare(`SELECT * FROM builds WHERE id = ?`)
      .bind(buildId)
      .first();

    if (!build) {
      return c.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Build not found",
          },
          requestId: c.get("requestId"),
          timestamp: new Date().toISOString(),
        },
        404,
      );
    }

    // Get build items
    const items = await env.DB.prepare(
      `SELECT * FROM build_items WHERE build_id = ? ORDER BY step_index`,
    )
      .bind(buildId)
      .all();

    // Get build name from column or fallback to structure
    let structure = null;
    if (build.structure_json) {
      try {
        structure = typeof build.structure_json === 'string' ? JSON.parse(build.structure_json) : build.structure_json;
      } catch {
        console.error("Failed to parse structure_json for build:", buildId);
      }
    }
    const buildName =
      (build.build_name as string) || structure?.buildName || null;

    return c.json({
      build: {
        id: build.id,
        buildName,
        description: build.description,
        budget: {
          min: build.budget_min,
          max: build.budget_max,
        },
        existingItemsText: build.existing_items_text || undefined,
        status: build.status,
        currentStep: build.current_step,
        structure,
        createdAt: build.created_at,
        updatedAt: build.updated_at,
        completedAt: build.completed_at,
      },
      items: items.results,
    });
  } catch (error) {
    console.error("Error fetching build:", error);
    return c.json(
      {
        error: {
          code: "DATABASE_ERROR",
          message: "Failed to fetch build",
        },
        requestId: c.get("requestId"),
        timestamp: new Date().toISOString(),
      },
      500,
    );
  }
});

/**
 * Update Build Name
 * PATCH /api/builds/:id/name
 *
 * Allows users to rename their build
 */
routes.patch("/builds/:id/name", async (c) => {
  const env = c.env;
  const buildId = c.req.param("id");

  try {
    const body = await c.req.json<{ name: string }>();

    // Validate name
    if (!body.name || typeof body.name !== "string") {
      return c.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Name is required",
          },
          requestId: c.get("requestId"),
          timestamp: new Date().toISOString(),
        },
        400,
      );
    }

    const name = body.name.trim();
    if (name.length < 2 || name.length > 50) {
      return c.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Name must be between 2 and 50 characters",
          },
          requestId: c.get("requestId"),
          timestamp: new Date().toISOString(),
        },
        400,
      );
    }

    // Verify build exists
    const build = await env.DB.prepare("SELECT id FROM builds WHERE id = ?")
      .bind(buildId)
      .first();

    if (!build) {
      return c.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Build not found",
          },
          requestId: c.get("requestId"),
          timestamp: new Date().toISOString(),
        },
        404,
      );
    }

    // Update the build name
    await env.DB.prepare(
      `UPDATE builds SET build_name = ?, updated_at = datetime('now') WHERE id = ?`,
    )
      .bind(name, buildId)
      .run();

    return c.json({
      buildId,
      buildName: name,
      requestId: c.get("requestId"),
    });
  } catch (error) {
    console.error("Error updating build name:", error);
    return c.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to update build name",
        },
        requestId: c.get("requestId"),
        timestamp: new Date().toISOString(),
      },
      500,
    );
  }
});

/**
 * Initialize Build Structure
 * POST /api/builds/:id/init
 *
 * Triggers the Structure Generator AI to determine 3 components
 */
routes.post("/builds/:id/init", async (c) => {
  const env = c.env;
  const buildId = c.req.param("id");

  try {
    // 1. Fetch the build from database
    const build = await env.DB.prepare(`SELECT * FROM builds WHERE id = ?`)
      .bind(buildId)
      .first();

    if (!build) {
      return c.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Build not found",
          },
          requestId: c.get("requestId"),
          timestamp: new Date().toISOString(),
        },
        404,
      );
    }

    // 2. Check if structure already exists
    if (build.structure_json) {
      return c.json(
        {
          error: {
            code: "ALREADY_INITIALIZED",
            message: "Build structure has already been generated",
          },
          requestId: c.get("requestId"),
          timestamp: new Date().toISOString(),
        },
        409,
      );
    }

    // 3. Parse existing items if present
    let parsedExistingItems: Array<{
      originalText: string;
      productName: string;
      brand: string;
      category: string;
      estimatedPrice: number;
      keySpec: string;
    }> = [];

    const existingItemsText = build.existing_items_text as string | null;
    if (existingItemsText?.trim()) {
      const parser = new ExistingItemsParser(
        env.GEMINI_API_KEY,
        env.GEMINI_MODEL,
        env.DB,
        env.GEMINI_API_BASE_URL,
      );

      const parseResult = await parser.parse({
        buildId,
        existingItemsText,
      });

      if (parseResult.success && parseResult.data) {
        parsedExistingItems = parseResult.data.items;

        // Save parsed items to database
        for (const item of parsedExistingItems) {
          const itemId = uuidv4();
          await env.DB.prepare(
            `INSERT INTO parsed_existing_items (id, build_id, original_text, product_name, brand, category, estimated_price, key_spec)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          )
            .bind(
              itemId,
              buildId,
              item.originalText,
              item.productName,
              item.brand,
              item.category,
              item.estimatedPrice,
              item.keySpec,
            )
            .run();
        }
      }
    }

    // 4. Call the Structure Generator with existing items context
    const generator = new StructureGenerator(
      env.GEMINI_API_KEY,
      env.GEMINI_MODEL,
      env.DB,
      env.GEMINI_API_BASE_URL,
    );

    const result = await generator.generate({
      buildId,
      description: build.description as string,
      budgetMin: build.budget_min as number,
      budgetMax: build.budget_max as number,
      existingItems: parsedExistingItems,
    });

    if (!result.success) {
      return c.json(
        {
          error: {
            code: "AI_ERROR",
            message: result.error ?? "Failed to generate build structure",
          },
          requestId: c.get("requestId"),
          timestamp: new Date().toISOString(),
        },
        500,
      );
    }

    // 5. Build combined structure with existing items as locked steps first
    const existingComponents = parsedExistingItems.map((item, index) => ({
      stepIndex: index,
      componentType: item.category,
      description: `Already owned: ${item.productName}`,
      isExisting: true,
      isLocked: true,
      existingProduct: {
        productName: item.productName,
        brand: item.brand,
        price: item.estimatedPrice,
        keySpec: item.keySpec,
      },
    }));

    // Re-index AI-generated components to follow existing items
    const aiComponents = result.data!.components.map((comp: any, index: number) => ({
      ...comp,
      stepIndex: parsedExistingItems.length + index,
      isExisting: false,
      isLocked: false,
    }));

    const combinedStructure = {
      ...result.data,
      totalSteps: existingComponents.length + aiComponents.length,
      components: [...existingComponents, ...aiComponents],
    };

    // 6. Save combined structure and build name to builds table
    const structureJson = JSON.stringify(combinedStructure);
    const buildName = result.data!.buildName;
    await env.DB.prepare(
      `UPDATE builds SET structure_json = ?, build_name = ?, updated_at = datetime('now') WHERE id = ?`,
    )
      .bind(structureJson, buildName, buildId)
      .run();

    // 7. Create build_items - existing items are pre-populated, AI items are placeholders
    // First, create locked items for existing components
    for (const existingItem of parsedExistingItems) {
      const itemId = uuidv4();
      const stepIndex = parsedExistingItems.indexOf(existingItem);
      await env.DB.prepare(
        `INSERT INTO build_items (id, build_id, step_index, component_type, product_name, product_brand, product_price, product_specs, is_existing, is_locked, selected_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, datetime('now'))`,
      )
        .bind(
          itemId,
          buildId,
          stepIndex,
          existingItem.category,
          existingItem.productName,
          existingItem.brand,
          existingItem.estimatedPrice,
          existingItem.keySpec,
        )
        .run();
    }

    // Then, create placeholder items for AI-generated components
    for (const component of aiComponents) {
      const itemId = uuidv4();
      await env.DB.prepare(
        `INSERT INTO build_items (id, build_id, step_index, component_type, is_existing, is_locked)
         VALUES (?, ?, ?, ?, 0, 0)`,
      )
        .bind(itemId, buildId, component.stepIndex, component.componentType)
        .run();
    }

    // 8. Return the combined structure with build name
    return c.json({
      buildId,
      buildName,
      structure: combinedStructure,
      parsedExistingItems:
        parsedExistingItems.length > 0 ? parsedExistingItems : undefined,
      latencyMs: result.latencyMs,
      requestId: c.get("requestId"),
    });
  } catch (error) {
    console.error("Error initializing build:", error);
    return c.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to initialize build structure",
        },
        requestId: c.get("requestId"),
        timestamp: new Date().toISOString(),
      },
      500,
    );
  }
});

/**
 * Get Options for Step
 * GET /api/builds/:id/step/:n/options
 *
 * Returns 3 product options for the specified step
 */
routes.get("/builds/:id/step/:n/options", async (c) => {
  const env = c.env;
  const buildId = c.req.param("id");
  const stepIndex = parseInt(c.req.param("n"), 10);

  // Validate step index (allow 0-9 for flexibility, actual validation happens against build structure)
  if (isNaN(stepIndex) || stepIndex < 0 || stepIndex > 9) {
    return c.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Step index must be a valid non-negative integer",
        },
        requestId: c.get("requestId"),
        timestamp: new Date().toISOString(),
      },
      400,
    );
  }

  try {
    // Check for cached options first - options are fixed once generated (Phase 2)
    const cached = await getCachedOptions(env.DB, buildId, stepIndex);
    if (cached) {
      return c.json({
        buildId,
        stepIndex,
        options: cached.options,
        cached: true,
        requestId: c.get("requestId"),
      });
    }

    // Build context from database
    const contextResult = await buildContextFromDatabase(
      env.DB,
      buildId,
      stepIndex,
    );

    if (!contextResult.success) {
      const statusCode = contextResult.error === "Build not found" ? 404 : 400;
      return c.json(
        {
          error: {
            code: statusCode === 404 ? "NOT_FOUND" : "VALIDATION_ERROR",
            message: contextResult.error,
          },
          requestId: c.get("requestId"),
          timestamp: new Date().toISOString(),
        },
        statusCode,
      );
    }

    // Generate options using AI
    const generator = new OptionGenerator(
      env.GEMINI_API_KEY,
      env.GEMINI_MODEL,
      env.DB,
      env.GEMINI_API_BASE_URL,
    );

    const result = await generator.generate({ context: contextResult.context });

    if (!result.success) {
      return c.json(
        {
          error: {
            code: "AI_ERROR",
            message: result.error ?? "Failed to generate options",
          },
          requestId: c.get("requestId"),
          timestamp: new Date().toISOString(),
        },
        500,
      );
    }

    // Save shown options for analytics and caching
    await saveShownOptions(env.DB, buildId, stepIndex, result.data!);

    return c.json({
      buildId,
      stepIndex,
      componentType: contextResult.context.componentType,
      remainingBudget: contextResult.context.remainingBudget,
      options: result.data!.options,
      cached: false,
      latencyMs: result.latencyMs,
      requestId: c.get("requestId"),
    });
  } catch (error) {
    console.error("Error generating options:", error);
    return c.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to generate options",
        },
        requestId: c.get("requestId"),
        timestamp: new Date().toISOString(),
      },
      500,
    );
  }
});

/**
 * Select Option for Step
 * POST /api/builds/:id/step/:n/select
 *
 * Saves the selected option and advances to next step
 */
routes.post("/builds/:id/step/:n/select", async (c) => {
  const env = c.env;
  const buildId = c.req.param("id");
  const stepIndex = parseInt(c.req.param("n"), 10);

  // Validate step index (allow 0-9 for flexibility)
  if (isNaN(stepIndex) || stepIndex < 0 || stepIndex > 9) {
    return c.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Step index must be a valid non-negative integer",
        },
        requestId: c.get("requestId"),
        timestamp: new Date().toISOString(),
      },
      400,
    );
  }

  try {
    const body = await c.req.json<{
      productName: string;
      brand: string;
      price: number;
      productUrl?: string;
      imageUrl?: string;
      keySpec: string;
      compatibilityNote: string;
      bestFor: string;
    }>();

    // Validate required fields
    if (!body.productName || !body.brand || !body.price || !body.keySpec) {
      return c.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message:
              "Missing required fields: productName, brand, price, keySpec",
          },
          requestId: c.get("requestId"),
          timestamp: new Date().toISOString(),
        },
        400,
      );
    }

    // Verify build exists and is in correct state
    const build = await env.DB.prepare("SELECT * FROM builds WHERE id = ?")
      .bind(buildId)
      .first();

    if (!build) {
      return c.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Build not found",
          },
          requestId: c.get("requestId"),
          timestamp: new Date().toISOString(),
        },
        404,
      );
    }

    if (build.status !== "in_progress") {
      return c.json(
        {
          error: {
            code: "INVALID_STATE",
            message: "Build is not in progress",
          },
          requestId: c.get("requestId"),
          timestamp: new Date().toISOString(),
        },
        409,
      );
    }

    // Update the build item with selected product
    await env.DB.prepare(
      `UPDATE build_items
       SET product_name = ?, product_brand = ?, product_price = ?,
           product_url = ?, product_image_url = ?, product_specs = ?,
           compatibility_note = ?, best_for = ?,
           selected_at = datetime('now')
       WHERE build_id = ? AND step_index = ?`,
    )
      .bind(
        body.productName,
        body.brand,
        body.price,
        body.productUrl || null,
        body.imageUrl || null,
        body.keySpec,
        body.compatibilityNote || null,
        body.bestFor || null,
        buildId,
        stepIndex,
      )
      .run();

    // Update current_step in builds table
    // Determine total steps from structure
    let structure = null;
    if (build.structure_json) {
      try {
        structure = typeof build.structure_json === 'string' ? JSON.parse(build.structure_json) : build.structure_json;
      } catch {
        console.error("Failed to parse structure_json for build:", buildId);
      }
    }
    const totalSteps =
      structure?.totalSteps || structure?.components?.length || 3;

    const nextStep = Math.max(
      (build.current_step as number) || 0,
      stepIndex + 1,
    );
    const isComplete = nextStep >= totalSteps;

    if (isComplete) {
      await env.DB.prepare(
        `UPDATE builds
         SET current_step = ?, status = 'completed', completed_at = datetime('now'), updated_at = datetime('now')
         WHERE id = ?`,
      )
        .bind(nextStep, buildId)
        .run();
    } else {
      await env.DB.prepare(
        `UPDATE builds
         SET current_step = ?, updated_at = datetime('now')
         WHERE id = ?`,
      )
        .bind(nextStep, buildId)
        .run();
    }

    return c.json({
      buildId,
      stepIndex,
      selected: {
        productName: body.productName,
        brand: body.brand,
        price: body.price,
        bestFor: body.bestFor,
      },
      nextStep: isComplete ? null : nextStep,
      isComplete,
      requestId: c.get("requestId"),
    });
  } catch (error) {
    console.error("Error selecting option:", error);
    return c.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to save selection",
        },
        requestId: c.get("requestId"),
        timestamp: new Date().toISOString(),
      },
      500,
    );
  }
});

/**
 * Complete Build
 * POST /api/builds/:id/complete
 *
 * Marks the build as complete after verifying all components are selected
 */
routes.post("/builds/:id/complete", async (c) => {
  const env = c.env;
  const buildId = c.req.param("id");

  try {
    // 1. Fetch the build
    const build = await env.DB.prepare("SELECT * FROM builds WHERE id = ?")
      .bind(buildId)
      .first();

    if (!build) {
      return c.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Build not found",
          },
          requestId: c.get("requestId"),
          timestamp: new Date().toISOString(),
        },
        404,
      );
    }

    // 2. Check if already completed
    if (build.status === "completed") {
      return c.json({
        buildId,
        status: "completed",
        completedAt: build.completed_at,
        message: "Build was already completed",
        requestId: c.get("requestId"),
      });
    }

    // 3. Parse structure to get expected component count
    let expectedComponents = 3;
    if (build.structure_json) {
      try {
        const structure = typeof build.structure_json === 'string' ? JSON.parse(build.structure_json) : build.structure_json;
        expectedComponents = structure.components?.length || 3;
      } catch {
        console.error("Failed to parse structure_json for build:", buildId);
      }
    }

    // 4. Count selected items (non-existing items with product selections)
    const itemsResult = await env.DB.prepare(
      `SELECT COUNT(*) as count, SUM(product_price) as total_cost
       FROM build_items
       WHERE build_id = ? AND product_name IS NOT NULL AND (is_existing = 0 OR is_existing IS NULL)`,
    )
      .bind(buildId)
      .first<{ count: number; total_cost: number }>();

    const selectedCount = itemsResult?.count || 0;
    const totalCost = itemsResult?.total_cost || 0;

    // 5. Verify all components have selections
    if (selectedCount < expectedComponents) {
      return c.json(
        {
          error: {
            code: "INCOMPLETE_BUILD",
            message: `Build requires ${expectedComponents} components but only ${selectedCount} selected`,
          },
          requestId: c.get("requestId"),
          timestamp: new Date().toISOString(),
        },
        400,
      );
    }

    // 6. Mark build as completed
    await env.DB.prepare(
      `UPDATE builds
       SET status = 'completed', completed_at = datetime('now'), updated_at = datetime('now')
       WHERE id = ?`,
    )
      .bind(buildId)
      .run();

    // 7. Get the updated timestamp
    const updatedBuild = await env.DB.prepare(
      "SELECT completed_at FROM builds WHERE id = ?",
    )
      .bind(buildId)
      .first<{ completed_at: string }>();

    return c.json({
      buildId,
      status: "completed",
      completedAt: updatedBuild?.completed_at,
      totalCost,
      itemCount: selectedCount,
      requestId: c.get("requestId"),
    });
  } catch (error) {
    console.error("Error completing build:", error);
    return c.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to complete build",
        },
        requestId: c.get("requestId"),
        timestamp: new Date().toISOString(),
      },
      500,
    );
  }
});

/**
 * Get Assembly Instructions
 * GET /api/builds/:id/instructions
 *
 * Returns the AI-generated assembly guide
 */
routes.get("/builds/:id/instructions", async (c) => {
  const buildId = c.req.param("id");

  // TODO: Implement Instruction Generator agent call
  // For now, return a stub response
  return c.json(
    {
      message: "Instruction generation not yet implemented",
      buildId,
      requestId: c.get("requestId"),
    },
    501,
  );
});

/**
 * Get Setup Steps
 * GET /api/builds/:id/setup-steps
 *
 * Returns 3-5 functional setup steps for a completed build.
 * Steps group components by function (not one-by-one).
 */
routes.get("/builds/:id/setup-steps", async (c) => {
  const env = c.env;
  const buildId = c.req.param("id");

  try {
    // Check for cached setup steps
    const cached = await env.DB.prepare(
      `SELECT response_json FROM ai_logs
       WHERE build_id = ? AND agent_type = 'setup_steps'
       ORDER BY created_at DESC LIMIT 1`,
    )
      .bind(buildId)
      .first<{ response_json: string }>();

    if (cached?.response_json) {
      try {
        const cachedResponse = typeof cached.response_json === 'string' ? JSON.parse(cached.response_json) : cached.response_json;
        if (cachedResponse.success && cachedResponse.data?.steps) {
          return c.json({
            buildId,
            steps: cachedResponse.data.steps,
            cached: true,
            requestId: c.get("requestId"),
          });
        }
      } catch {
        // Cache parse failed, generate fresh
      }
    }

    // Build context from database
    const contextResult = await buildSetupStepsContextFromDatabase(
      env.DB,
      buildId,
    );

    if (!contextResult.success) {
      const statusCode = contextResult.error === "Build not found" ? 404 : 400;
      return c.json(
        {
          error: {
            code: statusCode === 404 ? "NOT_FOUND" : "VALIDATION_ERROR",
            message: contextResult.error,
          },
          requestId: c.get("requestId"),
          timestamp: new Date().toISOString(),
        },
        statusCode,
      );
    }

    // Generate setup steps using AI
    const generator = new SetupStepsGenerator(
      env.GEMINI_API_KEY,
      env.GEMINI_MODEL,
      env.DB,
      env.GEMINI_API_BASE_URL,
    );

    const result = await generator.generate({
      context: contextResult.context!,
    });

    if (!result.success) {
      return c.json(
        {
          error: {
            code: "AI_ERROR",
            message: result.error ?? "Failed to generate setup steps",
          },
          requestId: c.get("requestId"),
          timestamp: new Date().toISOString(),
        },
        500,
      );
    }

    return c.json({
      buildId,
      steps: result.data!.steps,
      cached: false,
      latencyMs: result.latencyMs,
      requestId: c.get("requestId"),
    });
  } catch (error) {
    console.error("Error generating setup steps:", error);
    return c.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to generate setup steps",
        },
        requestId: c.get("requestId"),
        timestamp: new Date().toISOString(),
      },
      500,
    );
  }
});

/**
 * Export Build as JSON
 * GET /api/builds/:id/export
 *
 * Returns the build in exportable JSON format
 */
routes.get("/builds/:id/export", async (c) => {
  const env = c.env;
  const buildId = c.req.param("id");

  try {
    const build = await env.DB.prepare(`SELECT * FROM builds WHERE id = ?`)
      .bind(buildId)
      .first();

    if (!build) {
      return c.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Build not found",
          },
          requestId: c.get("requestId"),
          timestamp: new Date().toISOString(),
        },
        404,
      );
    }

    // Get build items
    const items = await env.DB.prepare(
      `SELECT * FROM build_items WHERE build_id = ? ORDER BY step_index`,
    )
      .bind(buildId)
      .all();

    // Get share URL if exists
    const sharedBuild = await env.DB.prepare(
      `SELECT share_code FROM shared_builds WHERE build_id = ?`,
    )
      .bind(buildId)
      .first();

    const baseUrl =
      env.ENVIRONMENT === "production"
        ? "https://buildmate-web.pages.dev"
        : "http://localhost:5173";

    // Parse structure for component info
    const structure = build.structure_json
      ? (typeof build.structure_json === 'string' ? JSON.parse(build.structure_json) : build.structure_json)
      : null;

    // Format for export (v2.0)
    const exportData = {
      version: "2.0",
      exportedAt: new Date().toISOString(),
      build: {
        id: build.id,
        category: structure?.buildCategory || null,
        description: build.description,
        existingItemsText: build.existing_items_text || null,
        budget: {
          min: build.budget_min,
          max: build.budget_max,
        },
        totalCost: items.results.reduce(
          (sum: number, item: any) => sum + ((item.product_price as number) || 0),
          0,
        ),
        items: items.results.map((item: any) => {
          // Find component info from structure
          const component = structure?.components?.find(
            (c: { stepIndex: number }) => c.stepIndex === item.step_index,
          );
          return {
            step: item.step_index,
            componentType: item.component_type,
            isExisting: item.is_existing === 1,
            isLocked: item.is_locked === 1,
            product: {
              name: item.product_name,
              brand: item.product_brand,
              price: item.product_price,
              keySpec: item.product_specs,
              bestFor: item.best_for,
              url: item.product_url,
            },
            existingProduct: component?.existingProduct || null,
          };
        }),
        shareUrl: sharedBuild ? `${baseUrl}/s/${sharedBuild.share_code}` : null,
        createdAt: build.created_at,
        completedAt: build.completed_at,
      },
    };

    return c.json(exportData);
  } catch (error) {
    console.error("Error exporting build:", error);
    return c.json(
      {
        error: {
          code: "DATABASE_ERROR",
          message: "Failed to export build",
        },
        requestId: c.get("requestId"),
        timestamp: new Date().toISOString(),
      },
      500,
    );
  }
});

/**
 * Share Build
 * POST /api/builds/:id/share
 *
 * Creates a shareable URL for a completed build
 */
routes.post("/builds/:id/share", async (c) => {
  const env = c.env;
  const buildId = c.req.param("id");

  try {
    // Get the build data from request body (full build from localStorage)
    const body = await c.req.json<{
      build: {
        id: string;
        description: string;
        budget: { min: number; max: number };
        existingItemsText?: string;
        status: string;
        structure: unknown;
        items: unknown[];
        createdAt: string;
        completedAt: string | null;
      };
    }>();

    if (!body.build) {
      return c.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Build data is required",
          },
          requestId: c.get("requestId"),
          timestamp: new Date().toISOString(),
        },
        400,
      );
    }

    // Check if build is completed
    if (body.build.status !== "completed") {
      return c.json(
        {
          error: {
            code: "INVALID_STATE",
            message: "Only completed builds can be shared",
          },
          requestId: c.get("requestId"),
          timestamp: new Date().toISOString(),
        },
        400,
      );
    }

    // Check if already shared
    const existing = await env.DB.prepare(
      `SELECT share_code FROM shared_builds WHERE build_id = ?`,
    )
      .bind(buildId)
      .first();

    if (existing) {
      // Return existing share URL
      const baseUrl =
        env.ENVIRONMENT === "production"
          ? "https://buildmate-web.pages.dev"
          : "http://localhost:5173";
      return c.json({
        shareUrl: `${baseUrl}/s/${existing.share_code}`,
        shareCode: existing.share_code,
        requestId: c.get("requestId"),
      });
    }

    // Generate unique 8-character code
    const shareCode = generateShareCode();

    // Store in shared_builds table
    await env.DB.prepare(
      `INSERT INTO shared_builds (id, build_id, share_code, build_data, created_at)
       VALUES (?, ?, ?, ?, datetime('now'))`,
    )
      .bind(crypto.randomUUID(), buildId, shareCode, JSON.stringify(body.build))
      .run();

    const baseUrl =
      env.ENVIRONMENT === "production"
        ? "https://buildmate-web.pages.dev"
        : "http://localhost:5173";

    return c.json({
      shareUrl: `${baseUrl}/s/${shareCode}`,
      shareCode,
      requestId: c.get("requestId"),
    });
  } catch (error) {
    console.error("Error sharing build:", error);
    return c.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to create share link",
        },
        requestId: c.get("requestId"),
        timestamp: new Date().toISOString(),
      },
      500,
    );
  }
});

/**
 * Get Shared Build
 * GET /api/shared/:code
 *
 * Returns a shared build by its share code
 */
routes.get("/shared/:code", async (c) => {
  const env = c.env;
  const shareCode = c.req.param("code");

  try {
    const shared = await env.DB.prepare(
      `SELECT * FROM shared_builds WHERE share_code = ?`,
    )
      .bind(shareCode)
      .first();

    if (!shared) {
      return c.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Shared build not found",
          },
          requestId: c.get("requestId"),
          timestamp: new Date().toISOString(),
        },
        404,
      );
    }

    // Parse the build data
    let buildData;
    try {
      buildData = typeof shared.build_data === 'string' ? JSON.parse(shared.build_data) : shared.build_data;
    } catch {
      return c.json(
        {
          error: {
            code: "DATA_CORRUPTION",
            message: "Shared build data is corrupted",
          },
          requestId: c.get("requestId"),
          timestamp: new Date().toISOString(),
        },
        500,
      );
    }

    return c.json({
      build: buildData,
      sharedAt: shared.created_at,
      requestId: c.get("requestId"),
    });
  } catch (error) {
    console.error("Error fetching shared build:", error);
    return c.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch shared build",
        },
        requestId: c.get("requestId"),
        timestamp: new Date().toISOString(),
      },
      500,
    );
  }
});

/**
 * Generate a unique 8-character alphanumeric share code
 */
function generateShareCode(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Submit Feedback
 * POST /api/builds/:id/feedback
 *
 * Stores anonymous feedback for a build
 */
routes.post("/builds/:id/feedback", async (c) => {
  const env = c.env;
  const buildId = c.req.param("id");

  try {
    const body = await c.req.json<{ feedback: string }>();

    if (!body.feedback || typeof body.feedback !== "string") {
      return c.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Feedback text is required",
          },
          requestId: c.get("requestId"),
          timestamp: new Date().toISOString(),
        },
        400,
      );
    }

    // Validate length
    if (body.feedback.length > 1000) {
      return c.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Feedback must be 1000 characters or less",
          },
          requestId: c.get("requestId"),
          timestamp: new Date().toISOString(),
        },
        400,
      );
    }

    // Check if feedback already exists for this build
    const existing = await env.DB.prepare(
      `SELECT id FROM build_feedback WHERE build_id = ?`,
    )
      .bind(buildId)
      .first();

    if (existing) {
      return c.json(
        {
          error: {
            code: "DUPLICATE_FEEDBACK",
            message: "Feedback has already been submitted for this build",
          },
          requestId: c.get("requestId"),
          timestamp: new Date().toISOString(),
        },
        409,
      );
    }

    // Insert feedback
    await env.DB.prepare(
      `INSERT INTO build_feedback (id, build_id, feedback_text, created_at)
       VALUES (?, ?, ?, datetime('now'))`,
    )
      .bind(crypto.randomUUID(), buildId, body.feedback.trim())
      .run();

    return c.json({
      success: true,
      message: "Feedback submitted successfully",
      requestId: c.get("requestId"),
    });
  } catch (error) {
    console.error("Error submitting feedback:", error);
    return c.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to submit feedback",
        },
        requestId: c.get("requestId"),
        timestamp: new Date().toISOString(),
      },
      500,
    );
  }
});

export default routes;
