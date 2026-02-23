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
  ProductOption,
  SetupStepsResponse,
} from "../types/api";

// Use relative URL in development (proxied by Vite), absolute URL in production
const API_BASE_URL = import.meta.env.DEV
  ? "/api"
  : "https://buildmate-api.deepakdhanavel.workers.dev/api";

/** Default request timeout in milliseconds */
const REQUEST_TIMEOUT_MS = 30000;

/**
 * Custom error class for API errors
 */
export class ApiClientError extends Error {
  public readonly code: string;
  public readonly requestId?: string;
  public readonly details?: Record<string, unknown>;

  constructor(error: ApiError | { error: { code: string; message: string } }) {
    super(error.error.message);
    this.name = "ApiClientError";
    this.code = error.error.code;
    this.requestId = "requestId" in error ? error.requestId : undefined;
    this.details =
      "details" in error.error
        ? (error.error.details as Record<string, unknown>)
        : undefined;
  }
}

/**
 * Make an API request with error handling, timeout, and retry logic
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    clearTimeout(timeoutId);

    let data;
    try {
      data = await response.json();
    } catch {
      throw new ApiClientError({
        error: {
          code: "INVALID_RESPONSE",
          message: "Server returned invalid response",
        },
      });
    }

    if (!response.ok) {
      throw new ApiClientError(data as ApiError);
    }

    return data as T;
  } catch (err) {
    clearTimeout(timeoutId);

    // Re-throw if already an ApiClientError
    if (err instanceof ApiClientError) {
      throw err;
    }

    // Handle abort/timeout
    if (err instanceof Error && err.name === "AbortError") {
      throw new ApiClientError({
        error: {
          code: "TIMEOUT",
          message: "Request timed out. Please try again.",
        },
      });
    }

    // Handle network errors
    if (err instanceof TypeError) {
      throw new ApiClientError({
        error: {
          code: "NETWORK_ERROR",
          message: "Network error. Please check your connection.",
        },
      });
    }

    // Unknown error
    throw new ApiClientError({
      error: {
        code: "UNKNOWN_ERROR",
        message: "An unexpected error occurred",
      },
    });
  }
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
   * Update build name
   */
  updateBuildName: async (
    buildId: string,
    name: string,
  ): Promise<{ buildId: string; buildName: string }> => {
    return request(`/builds/${buildId}/name`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
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
    option: ProductOption,
  ): Promise<unknown> => {
    return request(`/builds/${buildId}/step/${stepIndex}/select`, {
      method: "POST",
      body: JSON.stringify(option),
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
   * Get setup steps for a completed build
   */
  getSetupSteps: async (buildId: string): Promise<SetupStepsResponse> => {
    return request<SetupStepsResponse>(`/builds/${buildId}/setup-steps`);
  },

  /**
   * Export build as JSON
   */
  exportBuild: async (buildId: string): Promise<unknown> => {
    return request(`/builds/${buildId}/export`);
  },

  /**
   * Share a build (create shareable URL)
   */
  shareBuild: async (
    buildId: string,
    build: unknown,
  ): Promise<{ shareUrl: string; shareCode: string }> => {
    return request(`/builds/${buildId}/share`, {
      method: "POST",
      body: JSON.stringify({ build }),
    });
  },

  /**
   * Get a shared build by code
   */
  getSharedBuild: async (
    shareCode: string,
  ): Promise<{ build: unknown; sharedAt: string }> => {
    return request(`/shared/${shareCode}`);
  },

  /**
   * Submit feedback for a build
   */
  submitFeedback: async (
    buildId: string,
    feedback: string,
  ): Promise<{ success: boolean; message: string }> => {
    return request(`/builds/${buildId}/feedback`, {
      method: "POST",
      body: JSON.stringify({ feedback }),
    });
  },
};

export default api;
