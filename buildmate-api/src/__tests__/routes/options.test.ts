/**
 * Options Endpoint Tests
 *
 * Tests for GET /api/builds/:id/step/:n/options
 */

import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import routes from "../../routes";
import { MockD1Database } from "../mocks/d1";
import { createMockEnv, createInitializedBuild } from "../fixtures/test-data";
import type { TestApp, ErrorResponse } from "../types";

interface OptionsResponse {
  buildId: string;
  stepIndex: number;
  componentType: string;
  remainingBudget: number;
  options: Array<{
    productName: string;
    brand: string;
    price: number;
    keySpec: string;
    tier: string;
  }>;
  latencyMs: number;
}

describe("GET /api/builds/:id/step/:n/options", () => {
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

  it("should return 3 options for step 0", async () => {
    const { build, items } = createInitializedBuild();
    mockDb.insertTestData("builds", build);
    items.forEach((item) => mockDb.insertTestData("build_items", item));

    const res = await app.request(`/api/builds/${build.id}/step/0/options`);
    const data = (await res.json()) as OptionsResponse;

    expect(res.status).toBe(200);
    expect(data.buildId).toBe(build.id);
    expect(data.stepIndex).toBe(0);
    expect(data.componentType).toBe("Graphics Card");
    expect(data.options).toHaveLength(3);
    expect(data.options[0].tier).toBe("budget");
    expect(data.options[1].tier).toBe("midrange");
    expect(data.options[2].tier).toBe("premium");
  });

  it("should return different options with refresh=true", async () => {
    const { build, items } = createInitializedBuild();
    mockDb.insertTestData("builds", build);
    items.forEach((item) => mockDb.insertTestData("build_items", item));

    // First request
    const res1 = await app.request(`/api/builds/${build.id}/step/0/options`);
    const data1 = (await res1.json()) as OptionsResponse;

    // Second request with refresh
    const res2 = await app.request(
      `/api/builds/${build.id}/step/0/options?refresh=true`,
    );
    const data2 = (await res2.json()) as OptionsResponse;

    expect(res2.status).toBe(200);
    expect(data2.options).toHaveLength(3);
    // Options should be different (mocked Gemini returns different results)
    expect(data1.latencyMs).toBeDefined();
    expect(data2.latencyMs).toBeDefined();
  });

  it("should return 404 for non-existent build", async () => {
    const res = await app.request("/api/builds/non-existent/step/0/options");
    const data = (await res.json()) as ErrorResponse;

    expect(res.status).toBe(404);
    expect(data.error.code).toBe("NOT_FOUND");
  });

  it("should return 400 for invalid step index", async () => {
    const { build, items } = createInitializedBuild();
    mockDb.insertTestData("builds", build);
    items.forEach((item) => mockDb.insertTestData("build_items", item));

    const res = await app.request(`/api/builds/${build.id}/step/5/options`);
    const data = (await res.json()) as ErrorResponse;

    expect(res.status).toBe(400);
    expect(data.error.code).toBe("VALIDATION_ERROR");
  });

  it("should return 400 if structure not initialized", async () => {
    const { build } = createInitializedBuild();
    build.structure_json = null;
    mockDb.insertTestData("builds", build);

    const res = await app.request(`/api/builds/${build.id}/step/0/options`);
    const data = (await res.json()) as ErrorResponse;

    expect(res.status).toBe(400);
    expect(data.error.code).toBe("BUILD_NOT_INITIALIZED");
  });

  it("should include remaining budget in response", async () => {
    const { build, items } = createInitializedBuild();
    mockDb.insertTestData("builds", build);
    items.forEach((item) => mockDb.insertTestData("build_items", item));

    const res = await app.request(`/api/builds/${build.id}/step/0/options`);
    const data = (await res.json()) as OptionsResponse;

    expect(res.status).toBe(200);
    expect(data.remainingBudget).toBeDefined();
    expect(data.remainingBudget).toBeGreaterThan(0);
    expect(data.remainingBudget).toBeLessThanOrEqual(build.budget_max);
  });

  it("should validate all options are within budget", async () => {
    const { build, items } = createInitializedBuild();
    mockDb.insertTestData("builds", build);
    items.forEach((item) => mockDb.insertTestData("build_items", item));

    const res = await app.request(`/api/builds/${build.id}/step/0/options`);
    const data = (await res.json()) as OptionsResponse;

    expect(res.status).toBe(200);
    data.options.forEach((option) => {
      expect(option.price).toBeLessThanOrEqual(data.remainingBudget);
      expect(option.productName).toBeDefined();
      expect(option.brand).toBeDefined();
      expect(option.keySpec).toBeDefined();
    });
  });
});
