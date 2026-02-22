/**
 * CORS Middleware Configuration
 *
 * Configures Cross-Origin Resource Sharing for the API.
 * Includes both development and production origins.
 */

import { cors } from "hono/cors";

/**
 * All allowed origins (development + production)
 */
const allowedOrigins = [
  // Development
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3000",
  // Production - Cloudflare Pages
  "https://buildmate-web.pages.dev",
  // Production - Custom domains
  "https://shopabuild.com",
  "https://www.shopabuild.com",
  "https://buildmate.dev",
  "https://www.buildmate.dev",
];

/**
 * CORS middleware with all allowed origins
 */
export const corsMiddleware = cors({
  origin: allowedOrigins,
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
  exposeHeaders: ["X-Request-ID"],
  maxAge: 86400, // 24 hours
  credentials: true,
});

// Keep for backwards compatibility
export const productionCorsMiddleware = corsMiddleware;
