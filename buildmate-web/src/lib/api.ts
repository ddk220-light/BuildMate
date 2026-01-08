/**
 * API Client for BuildMate
 *
 * Provides typed methods for interacting with the BuildMate API.
 */

import type {
  CreateBuildRequest,
  CreateBuildResponse,
  GetBuildResponse,
  HealthResponse,
  ApiError,
} from "../types/api";

// Use relative URL in development (proxied by Vite), absolute URL in production
const API_BASE_URL = import.meta.env.DEV
  ? "/api"
  : "https://buildmate-api.deepakdhanavel.workers.dev/api";

/**
 * Custom error class for API errors
 */
export class ApiClientError extends Error {
  public readonly code: string;
  public readonly requestId?: string;
  public readonly details?: Record<string, unknown>;

  constructor(error: ApiError) {
    super(error.error.message);
    this.name = "ApiClientError";
    this.code = error.error.code;
    this.requestId = error.requestId;
    this.details = error.error.details;
  }
}

/**
 * Make an API request with error handling
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ApiClientError(data as ApiError);
  }

  return data as T;
}

/**
 * API Client object with all available methods
 */
export const api = {
  /**
   * Health check endpoint
   */
  health: async (): Promise<HealthResponse> => {
    return request<HealthResponse>("/health");
  },

  /**
   * Create a new build
   */
  createBuild: async (
    data: CreateBuildRequest,
  ): Promise<CreateBuildResponse> => {
    return request<CreateBuildResponse>("/builds", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  /**
   * Get build state by ID
   */
  getBuild: async (buildId: string): Promise<GetBuildResponse> => {
    return request<GetBuildResponse>(`/builds/${buildId}`);
  },

  /**
   * Initialize build structure (trigger AI to determine components)
   */
  initBuild: async (buildId: string): Promise<unknown> => {
    return request(`/builds/${buildId}/init`, {
      method: "POST",
    });
  },

  /**
   * Get options for a specific step
   */
  getStepOptions: async (
    buildId: string,
    stepIndex: number,
  ): Promise<unknown> => {
    return request(`/builds/${buildId}/step/${stepIndex}/options`);
  },

  /**
   * Select an option for a step
   */
  selectOption: async (
    buildId: string,
    stepIndex: number,
    optionIndex: number,
  ): Promise<unknown> => {
    return request(`/builds/${buildId}/step/${stepIndex}/select`, {
      method: "POST",
      body: JSON.stringify({ optionIndex }),
    });
  },

  /**
   * Complete a build
   */
  completeBuild: async (buildId: string): Promise<unknown> => {
    return request(`/builds/${buildId}/complete`, {
      method: "POST",
    });
  },

  /**
   * Get assembly instructions
   */
  getInstructions: async (buildId: string): Promise<unknown> => {
    return request(`/builds/${buildId}/instructions`);
  },

  /**
   * Export build as JSON
   */
  exportBuild: async (buildId: string): Promise<unknown> => {
    return request(`/builds/${buildId}/export`);
  },
};

export default api;
