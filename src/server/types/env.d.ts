import type { D1ToPgAdapter } from '../db';

/**
 * Environment bindings for Node.js
 */
export interface Env {
  // D1 Database (now mocked with Postgres)
  DB: D1ToPgAdapter;

  // Secrets
  GEMINI_API_KEY: string;

  // Environment variables
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
