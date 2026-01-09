/**
 * Health Endpoint Tests
 *
 * Tests for GET /api/health
 */

import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import routes from "../../routes";
import { MockD1Database } from "../mocks/d1";
import { createMockEnv } from "../fixtures/test-data";
import type { TestApp } from "../types";

interface HealthResponse {
  status: string;
  database: string;
  environment: string;
  version: string;
  timestamp: string;
}

describe("GET /api/health", () => {
  let app: TestApp;
  let mockDb: MockD1Database;
  let env: ReturnType<typeof createMockEnv>;

  beforeEach(() => {
    mockDb = new MockD1Database();
    env = createMockEnv(mockDb);

    app = new Hono();
    app.use("*", async (c, next) => {
      // Inject mock environment - c.env is initially undefined
      (c as any).env = env;
      c.set("requestId", "test-request-id");
      c.set("requestStart", Date.now());
      await next();
    });
    app.route("/api", routes);
  });

  it("should return healthy status", async () => {
    const res = await app.request("/api/health");
    const data = (await res.json()) as HealthResponse;

    expect(res.status).toBe(200);
    expect(data.status).toBe("healthy");
    expect(data.database).toBe("connected");
    expect(data.environment).toBe("test");
    expect(data.version).toBe("1.0.0-test");
    expect(data.timestamp).toBeDefined();
  });

  it("should include timestamp in ISO format", async () => {
    const res = await app.request("/api/health");
    const data = (await res.json()) as HealthResponse;

    const timestamp = new Date(data.timestamp);
    expect(timestamp.toISOString()).toBe(data.timestamp);
  });
});
