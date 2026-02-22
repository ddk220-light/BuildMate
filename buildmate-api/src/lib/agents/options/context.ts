/**
 * Build Context Builder for Option Generator
 *
 * Loads build state from database and formats it for the prompt.
 */

import type { OptionGeneratorOutput } from "../../gemini/schemas";
import type { OptionGeneratorContext } from "./prompt";

interface BuildRow {
  id: string;
  description: string;
  budget_min: number;
  budget_max: number;
  structure_json: string;
  current_step: number;
}

interface BuildItemRow {
  step_index: number;
  component_type: string;
  product_name: string | null;
  product_brand: string | null;
  product_price: number | null;
}

interface StructureData {
  buildCategory: string;
  components: Array<{
    stepIndex: number;
    componentType: string;
    description: string;
    budgetAllocationPercent?: number;
  }>;
}

/**
 * Build context from database for the Option Generator
 */
export async function buildContextFromDatabase(
  db: D1Database,
  buildId: string,
  stepIndex: number,
): Promise<
  | { success: true; context: OptionGeneratorContext }
  | { success: false; error: string }
> {
  // 1. Fetch the build
  const build = await db
    .prepare("SELECT * FROM builds WHERE id = ?")
    .bind(buildId)
    .first<BuildRow>();

  if (!build) {
    return { success: false, error: "Build not found" };
  }

  // 2. Check if structure exists
  if (!build.structure_json) {
    return { success: false, error: "Build structure not initialized" };
  }

  let structure: StructureData;
  try {
    structure = JSON.parse(build.structure_json);
  } catch {
    return { success: false, error: "Build structure data is corrupted" };
  }

  // 3. Validate step index against actual structure (supports 3-5 components)
  const totalComponents = structure.components.length;
  if (stepIndex < 0 || stepIndex >= totalComponents) {
    return {
      success: false,
      error: `Invalid step index. Must be 0 to ${totalComponents - 1}`,
    };
  }

  const currentComponent = structure.components.find(
    (c) => c.stepIndex === stepIndex,
  );
  if (!currentComponent) {
    return {
      success: false,
      error: `Component for step ${stepIndex} not found in structure`,
    };
  }

  // 4. Fetch previously selected items (steps < current step)
  const items = await db
    .prepare(
      "SELECT step_index, component_type, product_name, product_brand, product_price FROM build_items WHERE build_id = ? AND step_index < ? AND product_name IS NOT NULL ORDER BY step_index",
    )
    .bind(buildId, stepIndex)
    .all<BuildItemRow>();

  // 5. Calculate remaining budget
  const amountSpent = items.results.reduce(
    (sum, item) => sum + (item.product_price || 0),
    0,
  );
  const remainingBudget = build.budget_max - amountSpent;

  // 6. Calculate suggested allocation for this component
  const budgetAllocationPercent =
    currentComponent.budgetAllocationPercent || 33;
  const suggestedAllocation =
    (build.budget_max * budgetAllocationPercent) / 100;

  // 7. Build the context
  const context: OptionGeneratorContext = {
    buildId,
    buildCategory: structure.buildCategory,
    description: build.description,
    budgetMin: build.budget_min,
    budgetMax: build.budget_max,
    amountSpent,
    remainingBudget,
    stepIndex,
    totalSteps: totalComponents,
    componentType: currentComponent.componentType,
    componentDescription: currentComponent.description,
    budgetAllocationPercent,
    suggestedAllocation,
    previousItems: items.results
      .filter((item) => item.product_name !== null)
      .map((item) => ({
        componentType: item.component_type,
        productName: item.product_name!,
        brand: item.product_brand || "Unknown",
        price: item.product_price || 0,
      })),
  };

  return { success: true, context };
}

/**
 * Check if options have already been shown for this step
 * Returns cached options if available
 */
export async function getCachedOptions(
  db: D1Database,
  buildId: string,
  stepIndex: number,
): Promise<OptionGeneratorOutput | null> {
  const cached = await db
    .prepare(
      "SELECT options_json FROM build_options_shown WHERE build_id = ? AND step_index = ? ORDER BY shown_at DESC LIMIT 1",
    )
    .bind(buildId, stepIndex)
    .first<{ options_json: string }>();

  if (cached) {
    try {
      return JSON.parse(cached.options_json);
    } catch {
      // Cache is corrupted, return null to regenerate
      return null;
    }
  }
  return null;
}

/**
 * Save shown options to database for analytics and caching
 */
export async function saveShownOptions(
  db: D1Database,
  buildId: string,
  stepIndex: number,
  options: OptionGeneratorOutput,
): Promise<void> {
  const id = crypto.randomUUID();
  await db
    .prepare(
      "INSERT INTO build_options_shown (id, build_id, step_index, options_json) VALUES (?, ?, ?, ?)",
    )
    .bind(id, buildId, stepIndex, JSON.stringify(options))
    .run();
}
