/**
 * Instructions Endpoint Tests
 *
 * Tests for GET /api/builds/:id/instructions
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
import type { TestApp, ErrorResponse } from "../types";

interface InstructionsResponse {
  buildId: string;
  title: string;
  estimatedTime: string;
  overview: string;
  steps: Array<{
    stepNumber: number;
    title: string;
    description: string;
    warnings: string[];
    tips: string[];
  }>;
  finalChecks: string[];
  latencyMs: number;
}

describe("GET /api/builds/:id/instructions", () => {
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

  it("should generate instructions for completed build", async () => {
    const { build, items } = createCompleteBuild();

    mockDb.insertTestData("builds", build);
    items.forEach((item) => mockDb.insertTestData("build_items", item));

    const res = await app.request(`/api/builds/${build.id}/instructions`);
    const data = (await res.json()) as InstructionsResponse;

    expect(res.status).toBe(200);
    expect(data.buildId).toBe(build.id);
    expect(data.title).toBeDefined();
    expect(data.estimatedTime).toBeDefined();
    expect(data.overview).toBeDefined();
    expect(data.steps).toBeDefined();
    expect(data.steps.length).toBeGreaterThan(0);
    expect(data.finalChecks).toBeDefined();
    expect(data.latencyMs).toBeDefined();
  });

  it("should return cached instructions on second request", async () => {
    const { build, items } = createCompleteBuild();

    mockDb.insertTestData("builds", build);
    items.forEach((item) => mockDb.insertTestData("build_items", item));

    // First request
    const res1 = await app.request(`/api/builds/${build.id}/instructions`);
    const data1 = (await res1.json()) as InstructionsResponse;

    // Second request (should be cached)
    const res2 = await app.request(`/api/builds/${build.id}/instructions`);
    const data2 = (await res2.json()) as InstructionsResponse;

    expect(res2.status).toBe(200);
    expect(data2.title).toBe(data1.title);
    // Cache should be faster (but we can't reliably test timing in unit tests)
  });

  it("should return 404 for non-existent build", async () => {
    const res = await app.request("/api/builds/non-existent/instructions");
    const data = (await res.json()) as ErrorResponse;

    expect(res.status).toBe(404);
    expect(data.error.code).toBe("NOT_FOUND");
  });

  it("should return 400 if build not completed", async () => {
    const { build, items } = createInitializedBuild();
    build.status = "in_progress";

    mockDb.insertTestData("builds", build);
    items.forEach((item) => mockDb.insertTestData("build_items", item));

    const res = await app.request(`/api/builds/${build.id}/instructions`);
    const data = (await res.json()) as ErrorResponse;

    expect(res.status).toBe(400);
    expect(data.error.code).toBe("BUILD_NOT_COMPLETED");
  });

  it("should return 400 if missing build items", async () => {
    const { build } = createCompleteBuild();
    // Don't insert items

    mockDb.insertTestData("builds", build);

    const res = await app.request(`/api/builds/${build.id}/instructions`);
    const data = (await res.json()) as ErrorResponse;

    expect(res.status).toBe(400);
    expect(data.error.code).toBe("INCOMPLETE_BUILD");
  });

  it("should include step details with warnings and tips", async () => {
    const { build, items } = createCompleteBuild();

    mockDb.insertTestData("builds", build);
    items.forEach((item) => mockDb.insertTestData("build_items", item));

    const res = await app.request(`/api/builds/${build.id}/instructions`);
    const data = (await res.json()) as InstructionsResponse;

    expect(res.status).toBe(200);
    expect(data.steps).toBeDefined();

    // Check first step structure
    const firstStep = data.steps[0];
    expect(firstStep.stepNumber).toBeDefined();
    expect(firstStep.title).toBeDefined();
    expect(firstStep.description).toBeDefined();
    expect(Array.isArray(firstStep.warnings)).toBe(true);
    expect(Array.isArray(firstStep.tips)).toBe(true);
  });

  it("should include estimated time", async () => {
    const { build, items } = createCompleteBuild();

    mockDb.insertTestData("builds", build);
    items.forEach((item) => mockDb.insertTestData("build_items", item));

    const res = await app.request(`/api/builds/${build.id}/instructions`);
    const data = (await res.json()) as InstructionsResponse;

    expect(res.status).toBe(200);
    expect(data.estimatedTime).toBeDefined();
    expect(typeof data.estimatedTime).toBe("string");
    // Should be in format like "30-45 minutes"
    expect(data.estimatedTime).toMatch(/\d+/);
  });

  it("should log INSTRUCTIONS_GENERATED event", async () => {
    const { build, items } = createCompleteBuild();

    mockDb.insertTestData("builds", build);
    items.forEach((item) => mockDb.insertTestData("build_items", item));

    await app.request(`/api/builds/${build.id}/instructions`);

    // Verify event was logged
    const events = mockDb.getTableData("build_events");
    const instructionEvent = events.find(
      (e) =>
        e.build_id === build.id && e.event_type === "INSTRUCTIONS_GENERATED",
    );

    expect(instructionEvent).toBeDefined();
    expect(instructionEvent!.event_data).toContain("latencyMs");
    expect(instructionEvent!.event_data).toContain("stepCount");
  });
});
