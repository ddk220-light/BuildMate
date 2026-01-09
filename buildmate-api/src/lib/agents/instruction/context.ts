/**
 * Build Context Builder for Instruction Generator
 *
 * Loads completed build state from database and formats it for the prompt.
 * Also handles caching of generated instructions.
 */

import type { InstructionGeneratorOutput } from '../../gemini/schemas';

/**
 * Context for generating assembly instructions
 */
export interface InstructionGeneratorContext {
  buildId: string;
  buildCategory: string;
  description: string;
  totalCost: number;
  items: Array<{
    stepIndex: number;
    componentType: string;
    productName: string;
    brand: string;
    price: number;
    keySpec: string;
    compatibilityNote: string;
    productUrl?: string;
  }>;
}

interface BuildRow {
  id: string;
  description: string;
  budget_min: number;
  budget_max: number;
  structure_json: string;
  status: string;
  current_step: number;
}

interface BuildItemRow {
  step_index: number;
  component_type: string;
  product_name: string | null;
  product_brand: string | null;
  product_price: number | null;
  product_specs: string | null;
  product_url: string | null;
  compatibility_note: string | null;
}

interface StructureData {
  buildCategory: string;
  components: Array<{
    stepIndex: number;
    componentType: string;
    description: string;
  }>;
}

/**
 * Build context from database for the Instruction Generator
 * Only works for completed builds with all items selected
 */
export async function buildInstructionContext(
  db: D1Database,
  buildId: string
): Promise<
  | { success: true; context: InstructionGeneratorContext }
  | { success: false; error: string; statusCode: number }
> {
  // 1. Fetch the build
  const build = await db
    .prepare('SELECT * FROM builds WHERE id = ?')
    .bind(buildId)
    .first<BuildRow>();

  if (!build) {
    return { success: false, error: 'Build not found', statusCode: 404 };
  }

  // 2. Check if build is completed
  if (build.status !== 'completed') {
    return {
      success: false,
      error: 'Build must be completed before generating instructions',
      statusCode: 400,
    };
  }

  // 3. Check if structure exists
  if (!build.structure_json) {
    return {
      success: false,
      error: 'Build structure not found',
      statusCode: 400,
    };
  }

  const structure: StructureData = JSON.parse(build.structure_json);

  // 4. Fetch all selected items
  const items = await db
    .prepare(
      `SELECT step_index, component_type, product_name, product_brand,
              product_price, product_specs, product_url, compatibility_note
       FROM build_items
       WHERE build_id = ? AND product_name IS NOT NULL
       ORDER BY step_index`
    )
    .bind(buildId)
    .all<BuildItemRow>();

  // 5. Verify all 3 items are selected
  if (items.results.length < 3) {
    return {
      success: false,
      error: `Build incomplete: only ${items.results.length} of 3 components selected`,
      statusCode: 400,
    };
  }

  // 6. Calculate total cost
  const totalCost = items.results.reduce(
    (sum, item) => sum + (item.product_price || 0),
    0
  );

  // 7. Build the context
  const context: InstructionGeneratorContext = {
    buildId,
    buildCategory: structure.buildCategory,
    description: build.description,
    totalCost,
    items: items.results.map((item) => ({
      stepIndex: item.step_index,
      componentType: item.component_type,
      productName: item.product_name!,
      brand: item.product_brand || 'Unknown',
      price: item.product_price || 0,
      keySpec: item.product_specs || 'N/A',
      compatibilityNote: item.compatibility_note || 'Compatible',
      productUrl: item.product_url || undefined,
    })),
  };

  return { success: true, context };
}

/**
 * Check if instructions have already been generated for this build
 * Returns cached instructions if available
 */
export async function getCachedInstructions(
  db: D1Database,
  buildId: string
): Promise<InstructionGeneratorOutput | null> {
  try {
    // Check ai_logs for previous successful instruction generation
    const cached = await db
      .prepare(
        `SELECT response_json FROM ai_logs
         WHERE build_id = ? AND agent_type = 'instruction' AND success = 1
         ORDER BY created_at DESC LIMIT 1`
      )
      .bind(buildId)
      .first<{ response_json: string }>();

    if (cached && cached.response_json) {
      const parsed = JSON.parse(cached.response_json);
      // The response_json contains the full response, extract the data
      if (parsed.data) {
        return parsed.data as InstructionGeneratorOutput;
      }
      return parsed as InstructionGeneratorOutput;
    }
    return null;
  } catch (error) {
    console.warn('Failed to retrieve cached instructions:', error);
    return null;
  }
}
