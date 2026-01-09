/**
 * Test Types
 *
 * Shared type definitions for test files.
 */

import type { Hono } from "hono";

/**
 * Hono app variables used in middleware
 */
export interface AppVariables {
  requestId: string;
  requestStart: number;
}

/**
 * Typed Hono app for tests
 */
export type TestApp = Hono<{ Variables: AppVariables }>;

/**
 * Generic API response type for tests
 */
export interface ApiResponse {
  [key: string]: unknown;
}

/**
 * Error response type
 */
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

/**
 * Build creation response
 */
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
}

/**
 * Get build response
 */
export interface GetBuildResponse {
  build: {
    id: string;
    description: string;
    budget: {
      min: number;
      max: number;
    };
    structure: {
      buildCategory: string;
      components: Array<{
        stepIndex: number;
        componentType: string;
        description: string;
      }>;
    } | null;
  };
  items: Array<{
    product_name: string | null;
    [key: string]: unknown;
  }>;
}

/**
 * Complete build response
 */
export interface CompleteBuildResponse {
  buildId: string;
  status: string;
  completedAt: string;
  totalCost: number;
  itemCount: number;
}

/**
 * Export build response
 */
export interface ExportBuildResponse {
  version: string;
  exportedAt: string;
  build: {
    id: string;
    category: string;
    description: string;
    budget: {
      min: number;
      max: number;
    };
    totalCost: number;
    createdAt: string;
    completedAt: string;
    items: Array<{
      step: number;
      componentType: string;
      product: {
        name: string;
        brand: string;
        price: number;
      };
    }>;
  };
}

/**
 * Events response
 */
export interface EventsResponse {
  buildId: string;
  events: Array<{
    eventType: string;
    event_data?: string;
    [key: string]: unknown;
  }>;
}

/**
 * Analytics overview response
 */
export interface AnalyticsOverviewResponse {
  totalBuilds: number;
  completedBuilds: number;
  avgBudgetUtilization: number;
  budgetAdherence: {
    withinBudget: number;
    [key: string]: unknown;
  };
}

/**
 * Analytics completions response
 */
export interface AnalyticsCompletionsResponse {
  period: string;
  completions: Array<{
    date: string;
    count: number;
  }>;
}
