/**
 * Build Metrics Calculator
 *
 * Functions to calculate and store build metrics on completion.
 */

import { v4 as uuidv4 } from "uuid";
import type { BuildMetrics } from "./types";

interface BuildRow {
  id: string;
  budget_min: number;
  budget_max: number;
  created_at: string;
}

interface BuildItemRow {
  product_price: number | null;
  modification_count: number | null;
}

/**
 * Calculate budget adherence based on total cost and budget range
 */
function calculateBudgetAdherence(
  totalCost: number,
  budgetMin: number,
  budgetMax: number,
): "under" | "within" | "over" {
  if (totalCost < budgetMin) return "under";
  if (totalCost > budgetMax) return "over";
  return "within";
}

/**
 * Calculate and save build metrics on completion
 *
 * This function does not throw - errors are logged but don't block the request.
 */
export async function calculateAndSaveMetrics(
  db: D1Database,
  buildId: string,
  completedAt: Date,
): Promise<BuildMetrics | null> {
  try {
    // Fetch build data
    const build = await db
      .prepare(
        "SELECT id, budget_min, budget_max, created_at FROM builds WHERE id = ?",
      )
      .bind(buildId)
      .first<BuildRow>();

    if (!build) {
      console.warn(`Build ${buildId} not found for metrics calculation`);
      return null;
    }

    // Fetch build items
    const items = await db
      .prepare(
        "SELECT product_price, modification_count FROM build_items WHERE build_id = ? AND product_name IS NOT NULL",
      )
      .bind(buildId)
      .all<BuildItemRow>();

    // Calculate metrics
    const totalCost = items.results.reduce(
      (sum, item) => sum + (item.product_price || 0),
      0,
    );

    const modificationsCount = items.results.reduce(
      (sum, item) => sum + (item.modification_count || 0),
      0,
    );

    const createdAt = new Date(build.created_at);
    const timeToCompleteMs = completedAt.getTime() - createdAt.getTime();

    const budgetAdherence = calculateBudgetAdherence(
      totalCost,
      build.budget_min,
      build.budget_max,
    );

    // Count options shown events
    const optionsResult = await db
      .prepare(
        "SELECT COUNT(*) as count FROM build_events WHERE build_id = ? AND event_type = 'OPTIONS_SHOWN'",
      )
      .bind(buildId)
      .first<{ count: number }>();

    const optionsShownCount = optionsResult?.count || 0;

    // Build metrics object
    const metrics: BuildMetrics = {
      id: uuidv4(),
      buildId,
      timeToCompleteMs,
      totalCost,
      budgetMin: build.budget_min,
      budgetMax: build.budget_max,
      budgetAdherence,
      stepCount: items.results.length,
      optionsShownCount,
      modificationsCount,
    };

    // Insert or update metrics (upsert)
    await db
      .prepare(
        `INSERT INTO build_metrics (
          id, build_id, time_to_complete_ms, total_cost, budget_min, budget_max,
          budget_adherence, step_count, options_shown_count, modifications_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(build_id) DO UPDATE SET
          time_to_complete_ms = excluded.time_to_complete_ms,
          total_cost = excluded.total_cost,
          budget_adherence = excluded.budget_adherence,
          step_count = excluded.step_count,
          options_shown_count = excluded.options_shown_count,
          modifications_count = excluded.modifications_count`,
      )
      .bind(
        metrics.id,
        metrics.buildId,
        metrics.timeToCompleteMs,
        metrics.totalCost,
        metrics.budgetMin,
        metrics.budgetMax,
        metrics.budgetAdherence,
        metrics.stepCount,
        metrics.optionsShownCount,
        metrics.modificationsCount,
      )
      .run();

    return metrics;
  } catch (error) {
    console.warn("Failed to calculate/save build metrics:", error);
    return null;
  }
}
