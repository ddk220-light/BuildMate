/**
 * Select Option Endpoint Tests
 *
 * Tests for POST /api/builds/:id/step/:n/select
 */

import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import routes from "../../routes";
import { MockD1Database } from "../mocks/d1";
import {
  createMockEnv,
  createInitializedBuild,
  createSelectOptionRequest,
} from "../fixtures/test-data";
import type { TestApp, ErrorResponse } from "../types";

interface SelectResponse {
  buildId: string;
  stepIndex: number;
  productName: string;
  brand: string;
  price: number;
  currentStep: number;
  isModification?: boolean;
}

describe("POST /api/builds/:id/step/:n/select", () => {
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

  it("should select option for step 0", async () => {
    const { build, items } = createInitializedBuild();
    mockDb.insertTestData("builds", build);
    items.forEach((item) => mockDb.insertTestData("build_items", item));

    const selection = createSelectOptionRequest();

    const res = await app.request(`/api/builds/${build.id}/step/0/select`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(selection),
    });

    const data = (await res.json()) as SelectResponse;

    expect(res.status).toBe(200);
    expect(data.buildId).toBe(build.id);
    expect(data.stepIndex).toBe(0);
    expect(data.productName).toBe(selection.productName);
    expect(data.price).toBe(selection.price);
    expect(data.currentStep).toBe(1); // Should advance to next step
  });

  it("should update modification count when reselecting", async () => {
    const { build, items } = createInitializedBuild();
    // Set current step to 1 (already selected step 0)
    build.current_step = 1;
    items[0].product_name = "Old Product";
    items[0].selected_at = new Date().toISOString();

    mockDb.insertTestData("builds", build);
    items.forEach((item) => mockDb.insertTestData("build_items", item));

    const selection = createSelectOptionRequest({
      productName: "New Product",
    });

    const res = await app.request(`/api/builds/${build.id}/step/0/select`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(selection),
    });

    const data = (await res.json()) as SelectResponse;

    expect(res.status).toBe(200);
    expect(data.isModification).toBe(true);
    // Current step should not regress
    expect(data.currentStep).toBe(1);
  });

  it("should return 404 for non-existent build", async () => {
    const selection = createSelectOptionRequest();

    const res = await app.request("/api/builds/non-existent/step/0/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(selection),
    });

    const data = (await res.json()) as ErrorResponse;

    expect(res.status).toBe(404);
    expect(data.error.code).toBe("NOT_FOUND");
  });

  it("should return 400 for invalid step index", async () => {
    const { build, items } = createInitializedBuild();
    mockDb.insertTestData("builds", build);
    items.forEach((item) => mockDb.insertTestData("build_items", item));

    const selection = createSelectOptionRequest();

    const res = await app.request(`/api/builds/${build.id}/step/5/select`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(selection),
    });

    const data = (await res.json()) as ErrorResponse;

    expect(res.status).toBe(400);
    expect(data.error.code).toBe("VALIDATION_ERROR");
  });

  it("should return 400 for missing required fields", async () => {
    const { build, items } = createInitializedBuild();
    mockDb.insertTestData("builds", build);
    items.forEach((item) => mockDb.insertTestData("build_items", item));

    const res = await app.request(`/api/builds/${build.id}/step/0/select`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productName: "RTX 4070",
        // Missing required fields
      }),
    });

    const data = (await res.json()) as ErrorResponse;

    expect(res.status).toBe(400);
    expect(data.error.code).toBe("VALIDATION_ERROR");
  });

  it("should return 400 if price exceeds remaining budget", async () => {
    const { build, items } = createInitializedBuild();
    build.budget_max = 100; // Very low budget
    mockDb.insertTestData("builds", build);
    items.forEach((item) => mockDb.insertTestData("build_items", item));

    const selection = createSelectOptionRequest({
      price: 5000, // Way over budget
    });

    const res = await app.request(`/api/builds/${build.id}/step/0/select`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(selection),
    });

    const data = (await res.json()) as ErrorResponse;

    expect(res.status).toBe(400);
    expect(data.error.code).toBe("BUDGET_EXCEEDED");
  });

  it("should store all product details correctly", async () => {
    const { build, items } = createInitializedBuild();
    mockDb.insertTestData("builds", build);
    items.forEach((item) => mockDb.insertTestData("build_items", item));

    const selection = createSelectOptionRequest({
      productName: "RTX 4090",
      brand: "NVIDIA",
      price: 1599,
      productUrl: "https://example.com/rtx4090",
      keySpec: "24GB GDDR6X",
      compatibilityNote: "Excellent for 4K",
      reviewScore: 4.9,
      tier: "premium",
    });

    const res = await app.request(`/api/builds/${build.id}/step/0/select`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(selection),
    });

    const data = (await res.json()) as SelectResponse;

    expect(res.status).toBe(200);
    expect(data.productName).toBe("RTX 4090");
    expect(data.brand).toBe("NVIDIA");
    expect(data.price).toBe(1599);

    // Verify data was stored in database
    const dbItems = mockDb.getTableData("build_items");
    const updatedItem = dbItems.find(
      (i) => i.build_id === build.id && i.step_index === 0,
    );
    expect(updatedItem!.product_name).toBe("RTX 4090");
    expect(updatedItem!.product_brand).toBe("NVIDIA");
    expect(updatedItem!.product_price).toBe(1599);
  });
});
