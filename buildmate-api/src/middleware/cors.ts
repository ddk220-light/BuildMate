/**
 * CORS Middleware Configuration
 *
 * Configures Cross-Origin Resource Sharing for the API.
 * Supports both development and production environments.
 */

import { cors } from "hono/cors";
import type { MiddlewareHandler } from "hono";

/**
 * Development origins - local development servers
 */
const DEV_ORIGINS = [
  "http://localhost:5173", // Vite dev server
  "http://localhost:3000", // Alternative dev server
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3000",
];

/**
 * Production origins - Cloudflare Pages deployments
 */
const PROD_ORIGINS = [
  "https://buildmate-web.pages.dev", // Cloudflare Pages main domain
  "https://buildmate.dev", // Custom domain (future)
  "https://www.buildmate.dev", // Custom domain www (future)
];

/**
 * CORS configuration options shared between environments
 */
const CORS_OPTIONS = {
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"] as const,
  allowHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
  exposeHeaders: ["X-Request-ID"],
  maxAge: 86400, // 24 hours
  credentials: true,
};

/**
 * Creates a CORS middleware based on the environment
 * @param environment - "development" or "production"
 * @returns CORS middleware handler
 */
export function createCorsMiddleware(environment: string): MiddlewareHandler {
  // In development, allow both dev and prod origins for testing
  // In production, only allow production origins
  const origins =
    environment === "production"
      ? PROD_ORIGINS
      : [...DEV_ORIGINS, ...PROD_ORIGINS];

  return cors({
    origin: origins,
    ...CORS_OPTIONS,
  });
}

/**
 * Default CORS middleware (for backward compatibility with tests)
 * Allows all origins for development and testing
 */
export const corsMiddleware = cors({
  origin: [...DEV_ORIGINS, ...PROD_ORIGINS],
  ...CORS_OPTIONS,
});
