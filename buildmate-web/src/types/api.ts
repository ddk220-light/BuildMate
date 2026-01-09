/**
 * API Types for BuildMate
 */

export interface Build {
  id: string;
  description: string;
  budget: {
    min: number;
    max: number;
  };
  status: "in_progress" | "completed" | "abandoned";
  currentStep: number;
  structure: BuildStructure | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface BuildStructure {
  buildCategory: string;
  components: BuildComponent[];
  reasoning: string;
}

export interface BuildComponent {
  stepIndex: number;
  componentType: string;
  description: string;
  budgetAllocationPercent?: number;
}

export interface BuildItem {
  id: string;
  build_id: string;
  step_index: number;
  component_type: string;
  product_name: string | null;
  product_brand: string | null;
  product_price: number | null;
  product_url: string | null;
  product_specs: string | null;
  product_image_url: string | null;
  review_score: number | null;
  review_url: string | null;
  compatibility_note: string | null;
  selected_at: string | null;
}

export interface ProductOption {
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

export interface CreateBuildRequest {
  description: string;
  budgetMin: number;
  budgetMax: number;
}

export interface CreateBuildResponse {
  buildId: string;
  sessionId: string;
  description: string;
  budget: {
    min: number;
    max: number;
  };
  status: string;
  currentStep: number;
  createdAt: string;
}

export interface GetBuildResponse {
  build: Build;
  items: BuildItem[];
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  requestId: string;
  timestamp: string;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  environment: string;
  version: string;
  database: string;
}

export interface InstructionStep {
  stepNumber: number;
  title: string;
  description: string;
  warnings?: string[];
  tips?: string[];
}

export interface AssemblyInstructions {
  title: string;
  estimatedTime?: string;
  overview?: string;
  steps: InstructionStep[];
  finalChecks?: string[];
}

export interface GetInstructionsResponse {
  buildId: string;
  instructions: AssemblyInstructions;
  cached: boolean;
  latencyMs: number;
  requestId: string;
}

export interface GetStepOptionsResponse {
  buildId: string;
  stepIndex: number;
  componentType: string;
  remainingBudget: number;
  options: ProductOption[];
  cached: boolean;
  latencyMs: number;
  requestId: string;
}
