/**
 * Setup Steps Context Builder
 *
 * Fetches completed build data from the database to provide context
 * for the Setup Steps Generator agent.
 */

/**
 * Build item from database
 */
export interface SetupStepsBuildItem {
  componentType: string;
  productName: string;
  brand: string;
  price: number;
  keySpec?: string;
}

/**
 * Context for setup steps generation
 */
export interface SetupStepsContext {
  buildId: string;
  buildCategory: string;
  buildName: string;
  description: string;
  items: SetupStepsBuildItem[];
}

/**
 * Result from context building
 */
export interface SetupStepsContextResult {
  success: boolean;
  context?: SetupStepsContext;
  error?: string;
}

/**
 * Build context from the database for a completed build
 */
export async function buildContextFromDatabase(
  db: D1Database,
  buildId: string,
): Promise<SetupStepsContextResult> {
  // Fetch the build
  const build = await db
    .prepare(
      `SELECT id, description, structure_json, status
       FROM builds
       WHERE id = ?`,
    )
    .bind(buildId)
    .first<{
      id: string;
      description: string;
      structure_json: string | null;
      status: string;
    }>();

  if (!build) {
    return {
      success: false,
      error: "Build not found",
    };
  }

  // Verify build is completed
  if (build.status !== "completed") {
    return {
      success: false,
      error:
        "Build is not completed. Setup steps are only available for completed builds.",
    };
  }

  // Parse structure
  let buildCategory = "custom";
  let buildName = "Your Build";

  if (build.structure_json) {
    try {
      const structure = JSON.parse(build.structure_json);
      buildCategory = structure.buildCategory || "custom";
      buildName = structure.buildName || "Your Build";
    } catch {
      // Use defaults if parsing fails
    }
  }

  // Fetch all build items
  const itemsResult = await db
    .prepare(
      `SELECT component_type, product_name, product_brand, product_price, product_specs
       FROM build_items
       WHERE build_id = ?
       ORDER BY step_index ASC`,
    )
    .bind(buildId)
    .all<{
      component_type: string;
      product_name: string;
      product_brand: string;
      product_price: number;
      product_specs: string | null;
    }>();

  if (!itemsResult.results || itemsResult.results.length === 0) {
    return {
      success: false,
      error: "No items found for this build",
    };
  }

  const items: SetupStepsBuildItem[] = itemsResult.results.map((item) => ({
    componentType: item.component_type,
    productName: item.product_name,
    brand: item.product_brand,
    price: item.product_price,
    keySpec: item.product_specs || undefined,
  }));

  return {
    success: true,
    context: {
      buildId,
      buildCategory,
      buildName,
      description: build.description,
      items,
    },
  };
}
