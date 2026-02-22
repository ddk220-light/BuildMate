/**
 * Environment bindings for Cloudflare Workers
 */
export interface Env {
  // D1 Database
  DB: D1Database;

  // Secrets (set via wrangler secret)
  GEMINI_API_KEY: string;

  // Environment variables (set in wrangler.toml)
  ENVIRONMENT: string;
  GEMINI_MODEL: string;
  GEMINI_API_BASE_URL: string;
  APP_VERSION: string;
}

/**
 * Variables that can be set per-request (via middleware)
 */
export interface Variables {
  requestId: string;
  requestStart: number;
}
