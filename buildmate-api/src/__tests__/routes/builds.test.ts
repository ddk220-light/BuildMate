/**
 * Builds Endpoint Tests
 *
 * Tests for:
 * - POST /api/builds (create)
 * - GET /api/builds/:id (fetch)
 */

import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import routes from "../../routes";
import { MockD1Database } from "../mocks/d1";
import {
  createMockEnv,
  createBuildRequest,
  createTestBuild,
  createTestBuildItem,
  STRUCTURE_JSON,
} from "../fixtures/test-data";
import type {
  TestApp,
  CreateBuildResponse,
  GetBuildResponse,
  ErrorResponse,
} from "../types";

describe("Build Endpoints", () => {
  let app: TestApp;
  let mockDb: MockD1Database;
  let env: ReturnType<typeof createMockEnv>;

  beforeEach(() => {
    mockDb = new MockD1Database();
    env = createMockEnv(mockDb);

    app = new Hono();
    app.use("*", async (c, next) => {
      (c as any).env = env;
      c.set("requestId", "test-request-id");
      c.set("requestStart", Date.now());
      await next();
    });
    app.route("/api", routes);
  });

  describe("POST /api/builds", () => {
    it("should create a new build with valid data", async () => {
      const request = createBuildRequest();

      const res = await app.request("/api/builds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      const data = (await res.json()) as CreateBuildResponse;

      expect(res.status).toBe(201);
      expect(data.buildId).toBeDefined();
      expect(data.sessionId).toBeDefined();
      expect(data.description).toBe(request.description);
      expect(data.budget.min).toBe(request.budgetMin);
      expect(data.budget.max).toBe(request.budgetMax);
      expect(data.status).toBe("in_progress");
      expect(data.currentStep).toBe(0);
    });

    it("should return 400 for missing description", async () => {
      const res = await app.request("/api/builds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: "",
          budgetMin: 1000,
          budgetMax: 2000,
        }),
      });

      const data = (await res.json()) as ErrorResponse;

      expect(res.status).toBe(400);
      expect(data.error.code).toBe("VALIDATION_ERROR");
      expect(data.error.message).toContain("Description");
    });

    it("should return 400 for invalid budget range", async () => {
      const res = await app.request("/api/builds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: "Test build",
          budgetMin: 2000,
          budgetMax: 1000, // min > max
        }),
      });

      const data = (await res.json()) as ErrorResponse;

      expect(res.status).toBe(400);
      expect(data.error.code).toBe("VALIDATION_ERROR");
      expect(data.error.message).toContain("Budget");
    });

    it("should trim whitespace from description", async () => {
      const res = await app.request("/api/builds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: "  Gaming PC  ",
          budgetMin: 1000,
          budgetMax: 2000,
        }),
      });

      const data = (await res.json()) as CreateBuildResponse;

      expect(res.status).toBe(201);
      expect(data.description).toBe("Gaming PC");
    });
  });

  describe("GET /api/builds/:id", () => {
    it("should return build with items", async () => {
      const build = createTestBuild({
        id: "test-build-123",
        structure_json: STRUCTURE_JSON,
      });
      const item = createTestBuildItem({
        build_id: "test-build-123",
        step_index: 0,
        component_type: "Graphics Card",
        product_name: "RTX 4070",
      });

      mockDb.insertTestData("builds", build);
      mockDb.insertTestData("build_items", item);

      const res = await app.request("/api/builds/test-build-123");
      const data = (await res.json()) as GetBuildResponse;

      expect(res.status).toBe(200);
      expect(data.build.id).toBe("test-build-123");
      expect(data.build.description).toBe(build.description);
      expect(data.build.budget.min).toBe(build.budget_min);
      expect(data.build.budget.max).toBe(build.budget_max);
      expect(data.build.structure).toBeDefined();
      expect(data.items).toHaveLength(1);
      expect(data.items[0].product_name).toBe("RTX 4070");
    });

    it("should return 404 for non-existent build", async () => {
      const res = await app.request("/api/builds/non-existent-id");
      const data = (await res.json()) as ErrorResponse;

      expect(res.status).toBe(404);
      expect(data.error.code).toBe("NOT_FOUND");
    });

    it("should parse structure_json correctly", async () => {
      const build = createTestBuild({
        id: "test-build-456",
        structure_json: STRUCTURE_JSON,
      });

      mockDb.insertTestData("builds", build);

      const res = await app.request("/api/builds/test-build-456");
      const data = (await res.json()) as GetBuildResponse;

      expect(res.status).toBe(200);
      expect(data.build.structure!.buildCategory).toBe("Gaming PC Build");
      expect(data.build.structure!.components).toHaveLength(3);
    });

    it("should return null structure for uninitialized build", async () => {
      const build = createTestBuild({
        id: "test-build-789",
        structure_json: null,
      });

      mockDb.insertTestData("builds", build);

      const res = await app.request("/api/builds/test-build-789");
      const data = (await res.json()) as GetBuildResponse;

      expect(res.status).toBe(200);
      expect(data.build.structure).toBeNull();
    });
  });
});
