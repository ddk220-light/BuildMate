/**
 * API Types for BuildMate
 */

export interface Build {
  id: string;
  buildName?: string | null;
  description: string;
  budget: {
    min: number;
    max: number;
  };
  existingItemsText?: string;
  status: "in_progress" | "completed" | "abandoned";
  currentStep: number;
  structure: BuildStructure | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface BuildStructure {
  buildName?: string;
  buildCategory: string;
  components: BuildComponent[];
  reasoning: string;
  totalSteps?: number;
}

export interface BuildComponent {
  stepIndex: number;
  componentType: string;
  description: string;
  budgetAllocationPercent?: number;
  isExisting?: boolean;
  isLocked?: boolean;
  existingProduct?: {
    productName: string;
    brand: string;
    price: number;
    keySpec: string;
  };
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
  is_existing?: number;
  is_locked?: number;
  best_for?: string | null;
}

export interface ProductOption {
  productName: string;
  brand: string;
  price: number;
  productUrl?: string;
  imageUrl?: string;
  keySpec: string;
  compatibilityNote: string;
  bestFor: string;
  differentiationText: string;
}

export interface CreateBuildRequest {
  description: string;
  budgetMin: number;
  budgetMax: number;
  existingItemsText?: string;
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

export interface SetupStep {
  stepNumber: number;
  title: string;
  description: string;
  componentsInvolved: string[];
  tip?: string;
}

export interface SetupStepsResponse {
  buildId: string;
  steps: SetupStep[];
  cached: boolean;
  latencyMs?: number;
  requestId: string;
}
