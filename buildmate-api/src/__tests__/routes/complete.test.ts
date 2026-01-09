/**
 * Complete Endpoint Tests
 *
 * Tests for POST /api/builds/:id/complete
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
import type { TestApp, CompleteBuildResponse, ErrorResponse } from "../types";

describe("POST /api/builds/:id/complete", () => {
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

  it("should complete build with all 3 items selected", async () => {
    const { build, items } = createCompleteBuild();
    // Mark as in_progress initially
    build.status = "in_progress";
    build.completed_at = null;

    mockDb.insertTestData("builds", build);
    items.forEach((item) => mockDb.insertTestData("build_items", item));

    const res = await app.request(`/api/builds/${build.id}/complete`, {
      method: "POST",
    });

    const data = (await res.json()) as CompleteBuildResponse;

    expect(res.status).toBe(200);
    expect(data.buildId).toBe(build.id);
    expect(data.status).toBe("completed");
    expect(data.completedAt).toBeDefined();
    expect(data.totalCost).toBe(1147); // 549 + 399 + 199
    expect(data.itemCount).toBe(3);
  });

  it("should return 404 for non-existent build", async () => {
    const res = await app.request("/api/builds/non-existent/complete", {
      method: "POST",
    });

    const data = (await res.json()) as ErrorResponse;

    expect(res.status).toBe(404);
    expect(data.error.code).toBe("NOT_FOUND");
  });

  it("should return 400 if not all items are selected", async () => {
    const { build, items } = createInitializedBuild();
    // Only select first item
    items[0].product_name = "RTX 4070";
    items[0].product_price = 549;
    items[0].selected_at = new Date().toISOString();

    mockDb.insertTestData("builds", build);
    items.forEach((item) => mockDb.insertTestData("build_items", item));

    const res = await app.request(`/api/builds/${build.id}/complete`, {
      method: "POST",
    });

    const data = (await res.json()) as ErrorResponse;

    expect(res.status).toBe(400);
    expect(data.error.code).toBe("INCOMPLETE_BUILD");
    expect(data.error.message).toContain("All 3 components must be selected");
  });

  it("should return 409 if build already completed", async () => {
    const { build, items } = createCompleteBuild();
    // Already completed
    build.status = "completed";
    build.completed_at = new Date().toISOString();

    mockDb.insertTestData("builds", build);
    items.forEach((item) => mockDb.insertTestData("build_items", item));

    const res = await app.request(`/api/builds/${build.id}/complete`, {
      method: "POST",
    });

    const data = (await res.json()) as ErrorResponse;

    expect(res.status).toBe(409);
    expect(data.error.code).toBe("ALREADY_COMPLETED");
  });

  it("should update build status in database", async () => {
    const { build, items } = createCompleteBuild();
    build.status = "in_progress";
    build.completed_at = null;

    mockDb.insertTestData("builds", build);
    items.forEach((item) => mockDb.insertTestData("build_items", item));

    await app.request(`/api/builds/${build.id}/complete`, {
      method: "POST",
    });

    // Verify database was updated
    const dbBuilds = mockDb.getTableData("builds");
    const updatedBuild = dbBuilds.find((b) => b.id === build.id);

    expect(updatedBuild!.status).toBe("completed");
    expect(updatedBuild!.completed_at).toBeDefined();
  });

  it("should calculate total cost correctly", async () => {
    const { build, items } = createCompleteBuild();
    build.status = "in_progress";
    build.completed_at = null;

    // Set specific prices
    items[0].product_price = 100;
    items[1].product_price = 200;
    items[2].product_price = 300;

    mockDb.insertTestData("builds", build);
    items.forEach((item) => mockDb.insertTestData("build_items", item));

    const res = await app.request(`/api/builds/${build.id}/complete`, {
      method: "POST",
    });

    const data = (await res.json()) as CompleteBuildResponse;

    expect(res.status).toBe(200);
    expect(data.totalCost).toBe(600);
  });

  it("should log BUILD_COMPLETED event", async () => {
    const { build, items } = createCompleteBuild();
    build.status = "in_progress";
    build.completed_at = null;

    mockDb.insertTestData("builds", build);
    items.forEach((item) => mockDb.insertTestData("build_items", item));

    await app.request(`/api/builds/${build.id}/complete`, {
      method: "POST",
    });

    // Verify event was logged
    const events = mockDb.getTableData("build_events");
    const completedEvent = events.find(
      (e) => e.build_id === build.id && e.event_type === "BUILD_COMPLETED",
    );

    expect(completedEvent).toBeDefined();
    expect(completedEvent!.event_data).toContain("totalCost");
    expect(completedEvent!.event_data).toContain("itemCount");
  });
});
