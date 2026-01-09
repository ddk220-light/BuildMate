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
  buildContextFromDatabase,
  getCachedOptions,
  saveShownOptions,
  InstructionGenerator,
  buildInstructionContext,
  getCachedInstructions,
} from "../lib/agents";
import {
  logBuildStarted,
  logStructureGenerated,
  logOptionsShown,
  logOptionSelected,
  logBuildCompleted,
  logInstructionsGenerated,
  calculateAndSaveMetrics,
  getOverallStats,
  getBudgetAdherenceStats,
  getCompletionsByDay,
  getBuildEvents,
} from "../lib/events";

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
    await env.DB.prepare(
      `INSERT INTO builds (id, user_session_id, description, budget_min, budget_max, status, current_step)
       VALUES (?, ?, ?, ?, ?, 'in_progress', 0)`,
    )
      .bind(
        buildId,
        sessionId,
        body.description.trim(),
        body.budgetMin,
        body.budgetMax,
      )
      .run();

    // Log BUILD_STARTED event (fire-and-forget)
    logBuildStarted(env.DB, buildId, {
      description: body.description.trim(),
      budgetMin: body.budgetMin,
      budgetMax: body.budgetMax,
      sessionId,
    });

    return c.json(
      {
        buildId,
        sessionId,
        description: body.description.trim(),
        budget: {
          min: body.budgetMin,
          max: body.budgetMax,
        },
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
        structure: build.structure_json
          ? JSON.parse(build.structure_json as string)
          : null,
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

    // 3. Call the Structure Generator
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

    // 4. Save structure to builds table
    const structureJson = JSON.stringify(result.data);
    await env.DB.prepare(
      `UPDATE builds SET structure_json = ?, updated_at = datetime('now') WHERE id = ?`,
    )
      .bind(structureJson, buildId)
      .run();

    // 5. Create build_items placeholders
    for (const component of result.data!.components) {
      const itemId = uuidv4();
      await env.DB.prepare(
        `INSERT INTO build_items (id, build_id, step_index, component_type)
         VALUES (?, ?, ?, ?)`,
      )
        .bind(itemId, buildId, component.stepIndex, component.componentType)
        .run();
    }

    // 6. Log STRUCTURE_GENERATED event (fire-and-forget)
    logStructureGenerated(env.DB, buildId, {
      buildCategory: result.data!.buildCategory,
      components: result.data!.components.map((c) => ({
        componentType: c.componentType,
        stepIndex: c.stepIndex,
      })),
      latencyMs: result.latencyMs,
    });

    // 7. Return the structure
    return c.json({
      buildId,
      structure: result.data,
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

  // Validate step index
  if (isNaN(stepIndex) || stepIndex < 0 || stepIndex > 2) {
    return c.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Step index must be 0, 1, or 2",
        },
        requestId: c.get("requestId"),
        timestamp: new Date().toISOString(),
      },
      400,
    );
  }

  try {
    // Check for cached options first (same session)
    const forceRefresh = c.req.query("refresh") === "true";
    if (!forceRefresh) {
      const cached = await getCachedOptions(env.DB, buildId, stepIndex);
      if (cached) {
        // Log OPTIONS_SHOWN event for cached response (fire-and-forget)
        logOptionsShown(env.DB, buildId, stepIndex, {
          componentType: "cached",
          optionCount: cached.options.length,
          cached: true,
        });

        return c.json({
          buildId,
          stepIndex,
          options: cached.options,
          cached: true,
          requestId: c.get("requestId"),
        });
      }
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

    // Log OPTIONS_SHOWN event (fire-and-forget)
    logOptionsShown(env.DB, buildId, stepIndex, {
      componentType: contextResult.context.componentType,
      optionCount: result.data!.options.length,
      cached: false,
      latencyMs: result.latencyMs,
    });

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

  // Validate step index
  if (isNaN(stepIndex) || stepIndex < 0 || stepIndex > 2) {
    return c.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Step index must be 0, 1, or 2",
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
      reviewScore?: number;
      reviewUrl?: string;
      tier: "budget" | "midrange" | "premium";
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

    // Check if this is a modification (item already selected)
    const existingItem = await env.DB.prepare(
      "SELECT component_type, selected_at FROM build_items WHERE build_id = ? AND step_index = ?",
    )
      .bind(buildId, stepIndex)
      .first<{ component_type: string; selected_at: string | null }>();

    const isModification = existingItem?.selected_at !== null;
    const componentType = existingItem?.component_type || "unknown";

    // Update the build item with selected product
    await env.DB.prepare(
      `UPDATE build_items
       SET product_name = ?, product_brand = ?, product_price = ?,
           product_url = ?, product_image_url = ?, product_specs = ?,
           review_score = ?, review_url = ?, compatibility_note = ?,
           selected_at = COALESCE(selected_at, datetime('now')),
           modification_count = COALESCE(modification_count, 0) +
             CASE WHEN selected_at IS NOT NULL THEN 1 ELSE 0 END,
           modified_at = CASE WHEN selected_at IS NOT NULL THEN datetime('now') ELSE NULL END
       WHERE build_id = ? AND step_index = ?`,
    )
      .bind(
        body.productName,
        body.brand,
        body.price,
        body.productUrl || null,
        body.imageUrl || null,
        body.keySpec,
        body.reviewScore || null,
        body.reviewUrl || null,
        body.compatibilityNote || null,
        buildId,
        stepIndex,
      )
      .run();

    // Log OPTION_SELECTED event (fire-and-forget)
    logOptionSelected(env.DB, buildId, stepIndex, {
      componentType,
      productName: body.productName,
      brand: body.brand,
      price: body.price,
      tier: body.tier,
      isModification,
    });

    // Update current_step in builds table
    // Use Math.max to prevent step regression when modifying previous selections
    const nextStep = Math.max(build.current_step as number, stepIndex + 1);
    const isComplete = nextStep > 2;

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
        tier: body.tier,
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
    // 1. Fetch build
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

    // 2. Verify all items are selected
    const items = await env.DB.prepare(
      "SELECT * FROM build_items WHERE build_id = ? AND product_name IS NOT NULL",
    )
      .bind(buildId)
      .all();

    if (items.results.length < 3) {
      return c.json(
        {
          error: {
            code: "INCOMPLETE",
            message:
              "All 3 components must be selected before completing the build",
          },
          requestId: c.get("requestId"),
          timestamp: new Date().toISOString(),
        },
        400,
      );
    }

    // 3. Update to completed if not already
    let completedAt = build.completed_at as string | null;
    if (build.status !== "completed") {
      await env.DB.prepare(
        "UPDATE builds SET status = 'completed', completed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?",
      )
        .bind(buildId)
        .run();
      completedAt = new Date().toISOString();
    }

    // 4. Calculate total cost
    const totalCost = items.results.reduce(
      (sum, item) => sum + ((item.product_price as number) || 0),
      0,
    );

    // 5. Calculate time to complete and log BUILD_COMPLETED event
    const buildCreatedAt = new Date(build.created_at as string);
    const completedAtDate = new Date();
    const timeToCompleteMs =
      completedAtDate.getTime() - buildCreatedAt.getTime();

    // Log BUILD_COMPLETED event (fire-and-forget)
    logBuildCompleted(env.DB, buildId, {
      totalCost,
      itemCount: items.results.length,
      timeToCompleteMs,
    });

    // Calculate and save metrics (fire-and-forget)
    calculateAndSaveMetrics(env.DB, buildId, completedAtDate);

    // 6. Return confirmation
    return c.json({
      buildId,
      status: "completed",
      completedAt,
      totalCost,
      itemCount: items.results.length,
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
 * Returns the AI-generated assembly guide for a completed build.
 * Caches instructions after first generation.
 */
routes.get("/builds/:id/instructions", async (c) => {
  const env = c.env;
  const buildId = c.req.param("id");

  try {
    // 1. Check for cached instructions first
    const cached = await getCachedInstructions(env.DB, buildId);
    if (cached) {
      // Log INSTRUCTIONS_GENERATED event for cached (fire-and-forget)
      logInstructionsGenerated(env.DB, buildId, {
        cached: true,
        latencyMs: 0,
        stepCount: cached.steps?.length || 0,
      });

      return c.json({
        buildId,
        instructions: cached,
        cached: true,
        latencyMs: 0,
        requestId: c.get("requestId"),
      });
    }

    // 2. Build context from completed build
    const contextResult = await buildInstructionContext(env.DB, buildId);
    if (!contextResult.success) {
      return c.json(
        {
          error: {
            code:
              contextResult.statusCode === 404 ? "NOT_FOUND" : "BAD_REQUEST",
            message: contextResult.error,
          },
          requestId: c.get("requestId"),
          timestamp: new Date().toISOString(),
        },
        contextResult.statusCode as 400 | 404,
      );
    }

    // 3. Generate instructions using AI
    const generator = new InstructionGenerator(
      env.GEMINI_API_KEY,
      env.GEMINI_MODEL,
      env.DB,
      env.GEMINI_API_BASE_URL,
    );

    const result = await generator.generate({
      context: contextResult.context,
    });

    if (!result.success) {
      return c.json(
        {
          error: {
            code: "AI_ERROR",
            message: result.error || "Failed to generate instructions",
          },
          requestId: c.get("requestId"),
          timestamp: new Date().toISOString(),
        },
        500,
      );
    }

    // 4. Log INSTRUCTIONS_GENERATED event (fire-and-forget)
    logInstructionsGenerated(env.DB, buildId, {
      cached: false,
      latencyMs: result.latencyMs,
      stepCount: result.data!.steps?.length || 0,
    });

    // 5. Return the generated instructions
    return c.json({
      buildId,
      instructions: result.data,
      cached: false,
      latencyMs: result.latencyMs,
      requestId: c.get("requestId"),
    });
  } catch (error) {
    console.error("Error generating instructions:", error);
    return c.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to generate assembly instructions",
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

    // Format for export
    const exportData = {
      version: "1.0",
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
          0,
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
 * Get Build Events
 * GET /api/builds/:id/events
 *
 * Returns all events for a specific build (for debugging/analytics)
 */
routes.get("/builds/:id/events", async (c) => {
  const env = c.env;
  const buildId = c.req.param("id");

  try {
    const events = await getBuildEvents(env.DB, buildId);

    return c.json({
      buildId,
      events,
      count: events.length,
      requestId: c.get("requestId"),
    });
  } catch (error) {
    console.error("Error fetching build events:", error);
    return c.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch build events",
        },
        requestId: c.get("requestId"),
        timestamp: new Date().toISOString(),
      },
      500,
    );
  }
});

/**
 * Get Analytics Overview
 * GET /api/analytics/overview
 *
 * Returns overall build statistics and budget adherence
 */
routes.get("/analytics/overview", async (c) => {
  const env = c.env;

  try {
    const [overall, budgetAdherence] = await Promise.all([
      getOverallStats(env.DB),
      getBudgetAdherenceStats(env.DB),
    ]);

    return c.json({
      overall,
      budgetAdherence,
      requestId: c.get("requestId"),
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return c.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch analytics",
        },
        requestId: c.get("requestId"),
        timestamp: new Date().toISOString(),
      },
      500,
    );
  }
});

/**
 * Get Daily Completion Stats
 * GET /api/analytics/completions
 *
 * Returns completion stats by day for the last N days
 */
routes.get("/analytics/completions", async (c) => {
  const env = c.env;
  const days = parseInt(c.req.query("days") || "30", 10);

  try {
    const stats = await getCompletionsByDay(env.DB, days);

    return c.json({
      days,
      stats,
      count: stats.length,
      requestId: c.get("requestId"),
    });
  } catch (error) {
    console.error("Error fetching completion stats:", error);
    return c.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch completion stats",
        },
        requestId: c.get("requestId"),
        timestamp: new Date().toISOString(),
      },
      500,
    );
  }
});

export default routes;
