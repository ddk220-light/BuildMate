/**
 * BuildMate Type Definitions
 */

// Environment bindings for Cloudflare Workers
export interface Env {
  // D1 Database
  DB: D1Database;

  // KV Namespace for caching
  CACHE: KVNamespace;

  // R2 Bucket (optional)
  STORAGE?: R2Bucket;

  // Static Assets
  ASSETS: Fetcher;

  // Secrets (set via wrangler secret)
  GEMINI_API_KEY: string;

  // Environment variables (set in wrangler.toml)
  ENVIRONMENT: string;
  GEMINI_MODEL: string;
  GEMINI_API_BASE_URL: string;
  APP_VERSION: string;
}

// Variables that can be set per-request (via middleware)
export interface Variables {
  requestId: string;
  requestStart: number;
}

// Product model
export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  specs: Record<string, string | number>;
  compatibilityTags: string[];
  createdAt: string;
  updatedAt: string;
}

// Build model
export interface Build {
  id: string;
  userId?: string;
  name: string;
  products: string[];
  totalPrice: number;
  compatibilityScore: number;
  createdAt: string;
  updatedAt: string;
}

// Compatibility check result
export interface CompatibilityCheck {
  compatible: boolean;
  issues: string[];
  suggestions: string[];
}

// Gemini API Types
export interface GeminiClientConfig {
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

export interface GeminiRequestConfig {
  systemPrompt: string;
  userPrompt: string;
  outputSchema?: Record<string, unknown>;
  maxTokens?: number;
  temperature?: number;
}

export interface GeminiResponse {
  success: boolean;
  data?: unknown;
  rawText?: string;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
}

// Gemini API request/response structures
export interface GeminiAPIRequest {
  contents: Array<{
    role: string;
    parts: Array<{
      text: string;
    }>;
  }>;
  generationConfig: {
    maxOutputTokens: number;
    temperature: number;
    responseMimeType?: string;
    responseSchema?: Record<string, unknown>;
  };
}

export interface GeminiAPIResponse {
  candidates?: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
      role: string;
    };
    finishReason: string;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
  error?: {
    code: number;
    message: string;
    status: string;
  };
}

export type AgentType = 'structure' | 'option' | 'instruction';

export interface AILogEntry {
  id: string;
  build_id: string | null;
  agent_type: AgentType;
  request_prompt: string;
  response_json: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  latency_ms: number;
  success: number;
  error_message: string | null;
}

// API Response types
export interface APIError {
  code: string;
  message: string;
}

export interface APIResponse<T = unknown> {
  data?: T;
  error?: APIError;
  requestId?: string;
  timestamp: string;
}
