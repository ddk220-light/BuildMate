/**
 * Test Data Fixtures and Builders
 *
 * Provides reusable test data and builder functions for tests.
 */

import { v4 as uuidv4 } from "uuid";

/**
 * Build test data
 */
export interface TestBuild {
  [key: string]: unknown;
  id: string;
  user_session_id: string;
  description: string;
  budget_min: number;
  budget_max: number;
  status: "in_progress" | "completed";
  current_step: number;
  structure_json: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

/**
 * Build item test data
 */
export interface TestBuildItem {
  [key: string]: unknown;
  id: string;
  build_id: string;
  step_index: number;
  component_type: string;
  product_name: string | null;
  product_brand: string | null;
  product_price: number | null;
  product_url: string | null;
  product_image_url: string | null;
  product_specs: string | null;
  review_score: number | null;
  review_url: string | null;
  compatibility_note: string | null;
  selected_at: string | null;
  modification_count: number;
  modified_at: string | null;
}

/**
 * Build request body
 */
export interface CreateBuildRequest {
  description: string;
  budgetMin: number;
  budgetMax: number;
}

/**
 * Select option request body
 */
export interface SelectOptionRequest {
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
}

/**
 * Default test values
 */
export const DEFAULTS = {
  buildId: "test-build-123",
  sessionId: "test-session-456",
  description: "Gaming PC for 1440p gaming",
  budgetMin: 1000,
  budgetMax: 2000,
};

/**
 * Structure JSON for a complete build
 */
export const STRUCTURE_JSON = JSON.stringify({
  buildCategory: "Gaming PC Build",
  components: [
    {
      stepIndex: 0,
      componentType: "Graphics Card",
      description: "High-performance GPU for gaming",
    },
    {
      stepIndex: 1,
      componentType: "Processor",
      description: "Fast CPU for gaming and multitasking",
    },
    {
      stepIndex: 2,
      componentType: "Motherboard",
      description: "Compatible motherboard for components",
    },
  ],
  reasoning: "Core gaming PC components",
});

/**
 * Build a test build object
 */
export function createTestBuild(overrides: Partial<TestBuild> = {}): TestBuild {
  const now = new Date().toISOString();
  return {
    id: overrides.id ?? uuidv4(),
    user_session_id: overrides.user_session_id ?? uuidv4(),
    description: overrides.description ?? DEFAULTS.description,
    budget_min: overrides.budget_min ?? DEFAULTS.budgetMin,
    budget_max: overrides.budget_max ?? DEFAULTS.budgetMax,
    status: overrides.status ?? "in_progress",
    current_step: overrides.current_step ?? 0,
    structure_json: overrides.structure_json ?? null,
    created_at: overrides.created_at ?? now,
    updated_at: overrides.updated_at ?? now,
    completed_at: overrides.completed_at ?? null,
  };
}

/**
 * Build a test build item object
 */
export function createTestBuildItem(
  overrides: Partial<TestBuildItem> = {},
): TestBuildItem {
  return {
    id: overrides.id ?? uuidv4(),
    build_id: overrides.build_id ?? DEFAULTS.buildId,
    step_index: overrides.step_index ?? 0,
    component_type: overrides.component_type ?? "Graphics Card",
    product_name: overrides.product_name ?? null,
    product_brand: overrides.product_brand ?? null,
    product_price: overrides.product_price ?? null,
    product_url: overrides.product_url ?? null,
    product_image_url: overrides.product_image_url ?? null,
    product_specs: overrides.product_specs ?? null,
    review_score: overrides.review_score ?? null,
    review_url: overrides.review_url ?? null,
    compatibility_note: overrides.compatibility_note ?? null,
    selected_at: overrides.selected_at ?? null,
    modification_count: overrides.modification_count ?? 0,
    modified_at: overrides.modified_at ?? null,
  };
}

/**
 * Build a create build request
 */
export function createBuildRequest(
  overrides: Partial<CreateBuildRequest> = {},
): CreateBuildRequest {
  return {
    description: overrides.description ?? DEFAULTS.description,
    budgetMin: overrides.budgetMin ?? DEFAULTS.budgetMin,
    budgetMax: overrides.budgetMax ?? DEFAULTS.budgetMax,
  };
}

/**
 * Build a select option request
 */
export function createSelectOptionRequest(
  overrides: Partial<SelectOptionRequest> = {},
): SelectOptionRequest {
  return {
    productName: overrides.productName ?? "RTX 4070",
    brand: overrides.brand ?? "NVIDIA",
    price: overrides.price ?? 549,
    productUrl: overrides.productUrl ?? "https://example.com/rtx4070",
    imageUrl: overrides.imageUrl,
    keySpec: overrides.keySpec ?? "12GB GDDR6X",
    compatibilityNote: overrides.compatibilityNote ?? "Great for 1440p",
    reviewScore: overrides.reviewScore ?? 4.7,
    reviewUrl: overrides.reviewUrl,
    tier: overrides.tier ?? "midrange",
  };
}

/**
 * Create a complete build with all 3 items selected
 */
export function createCompleteBuild(): {
  build: TestBuild;
  items: TestBuildItem[];
} {
  const buildId = uuidv4();
  const now = new Date().toISOString();

  const build = createTestBuild({
    id: buildId,
    status: "completed",
    current_step: 3,
    structure_json: STRUCTURE_JSON,
    completed_at: now,
  });

  const items: TestBuildItem[] = [
    createTestBuildItem({
      build_id: buildId,
      step_index: 0,
      component_type: "Graphics Card",
      product_name: "RTX 4070",
      product_brand: "NVIDIA",
      product_price: 549,
      product_specs: "12GB GDDR6X",
      selected_at: now,
    }),
    createTestBuildItem({
      build_id: buildId,
      step_index: 1,
      component_type: "Processor",
      product_name: "Ryzen 7 7800X3D",
      product_brand: "AMD",
      product_price: 399,
      product_specs: "8 cores, 4.2GHz",
      selected_at: now,
    }),
    createTestBuildItem({
      build_id: buildId,
      step_index: 2,
      component_type: "Motherboard",
      product_name: "B650 Gaming",
      product_brand: "ASUS",
      product_price: 199,
      product_specs: "AM5 Socket, DDR5",
      selected_at: now,
    }),
  ];

  return { build, items };
}

/**
 * Create a build with structure initialized but no selections
 */
export function createInitializedBuild(): {
  build: TestBuild;
  items: TestBuildItem[];
} {
  const buildId = uuidv4();

  const build = createTestBuild({
    id: buildId,
    status: "in_progress",
    current_step: 0,
    structure_json: STRUCTURE_JSON,
  });

  const items: TestBuildItem[] = [
    createTestBuildItem({
      build_id: buildId,
      step_index: 0,
      component_type: "Graphics Card",
    }),
    createTestBuildItem({
      build_id: buildId,
      step_index: 1,
      component_type: "Processor",
    }),
    createTestBuildItem({
      build_id: buildId,
      step_index: 2,
      component_type: "Motherboard",
    }),
  ];

  return { build, items };
}

/**
 * Create mock environment for tests
 */
export function createMockEnv(db: unknown) {
  return {
    DB: db,
    GEMINI_API_KEY: "test-api-key",
    GEMINI_MODEL: "gemini-2.0-flash",
    GEMINI_API_BASE_URL: "https://generativelanguage.googleapis.com/v1beta",
    APP_VERSION: "1.0.0-test",
    ENVIRONMENT: "test",
  };
}
