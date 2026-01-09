/**
 * Export Endpoint Tests
 *
 * Tests for GET /api/builds/:id/export
 */

import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import routes from "../../routes";
import { MockD1Database } from "../mocks/d1";
import {
  createMockEnv,
  createCompleteBuild,
  createInitializedBuild,
} from "../fixtures/test-data";
import type { TestApp, ExportBuildResponse, ErrorResponse } from "../types";

describe("GET /api/builds/:id/export", () => {
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

  it("should export completed build as JSON", async () => {
    const { build, items } = createCompleteBuild();

    mockDb.insertTestData("builds", build);
    items.forEach((item) => mockDb.insertTestData("build_items", item));

    const res = await app.request(`/api/builds/${build.id}/export`);
    const data = (await res.json()) as ExportBuildResponse;

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("application/json");
    expect(data.version).toBe("1.0");
    expect(data.exportedAt).toBeDefined();
    expect(data.build).toBeDefined();
    expect(data.build.id).toBe(build.id);
  });

  it("should include all build details in export", async () => {
    const { build, items } = createCompleteBuild();

    mockDb.insertTestData("builds", build);
    items.forEach((item) => mockDb.insertTestData("build_items", item));

    const res = await app.request(`/api/builds/${build.id}/export`);
    const data = (await res.json()) as ExportBuildResponse;

    expect(res.status).toBe(200);
    expect(data.build.category).toBeDefined();
    expect(data.build.description).toBe(build.description);
    expect(data.build.budget).toEqual({
      min: build.budget_min,
      max: build.budget_max,
    });
    expect(data.build.totalCost).toBe(1147); // Sum of all items
  });

  it("should include all 3 items with full details", async () => {
    const { build, items } = createCompleteBuild();

    mockDb.insertTestData("builds", build);
    items.forEach((item) => mockDb.insertTestData("build_items", item));

    const res = await app.request(`/api/builds/${build.id}/export`);
    const data = (await res.json()) as ExportBuildResponse;

    expect(res.status).toBe(200);
    expect(data.build.items).toHaveLength(3);

    const firstItem = data.build.items[0];
    expect(firstItem.step).toBe(0);
    expect(firstItem.componentType).toBe("Graphics Card");
    expect(firstItem.product).toBeDefined();
    expect(firstItem.product.name).toBe("RTX 4070");
    expect(firstItem.product.brand).toBe("NVIDIA");
    expect(firstItem.product.price).toBe(549);
  });

  it("should return 404 for non-existent build", async () => {
    const res = await app.request("/api/builds/non-existent/export");
    const data = (await res.json()) as ErrorResponse;

    expect(res.status).toBe(404);
    expect(data.error.code).toBe("NOT_FOUND");
  });

  it("should return 400 if build not completed", async () => {
    const { build, items } = createInitializedBuild();

    mockDb.insertTestData("builds", build);
    items.forEach((item) => mockDb.insertTestData("build_items", item));

    const res = await app.request(`/api/builds/${build.id}/export`);
    const data = (await res.json()) as ErrorResponse;

    expect(res.status).toBe(400);
    expect(data.error.code).toBe("BUILD_NOT_COMPLETED");
  });

  it("should include timestamps in ISO format", async () => {
    const { build, items } = createCompleteBuild();

    mockDb.insertTestData("builds", build);
    items.forEach((item) => mockDb.insertTestData("build_items", item));

    const res = await app.request(`/api/builds/${build.id}/export`);
    const data = (await res.json()) as ExportBuildResponse;

    expect(res.status).toBe(200);

    // Verify ISO format
    const exportedAt = new Date(data.exportedAt);
    expect(exportedAt.toISOString()).toBe(data.exportedAt);

    const createdAt = new Date(data.build.createdAt);
    expect(createdAt.toISOString()).toBe(data.build.createdAt);

    const completedAt = new Date(data.build.completedAt);
    expect(completedAt.toISOString()).toBe(data.build.completedAt);
  });

  it("should have downloadable filename in header", async () => {
    const { build, items } = createCompleteBuild();

    mockDb.insertTestData("builds", build);
    items.forEach((item) => mockDb.insertTestData("build_items", item));

    const res = await app.request(`/api/builds/${build.id}/export`);

    expect(res.status).toBe(200);
    const disposition = res.headers.get("Content-Disposition");
    expect(disposition).toBeDefined();
    expect(disposition).toContain("attachment");
    expect(disposition).toContain(".json");
  });

  it("should calculate total cost correctly", async () => {
    const { build, items } = createCompleteBuild();

    // Set specific prices
    items[0].product_price = 100;
    items[1].product_price = 250;
    items[2].product_price = 150;

    mockDb.insertTestData("builds", build);
    items.forEach((item) => mockDb.insertTestData("build_items", item));

    const res = await app.request(`/api/builds/${build.id}/export`);
    const data = (await res.json()) as ExportBuildResponse;

    expect(res.status).toBe(200);
    expect(data.build.totalCost).toBe(500); // 100 + 250 + 150
  });
});
