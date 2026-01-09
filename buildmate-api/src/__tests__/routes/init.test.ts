/**
 * Build Init Endpoint Tests
 *
 * Tests for POST /api/builds/:id/init
 */

import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import routes from "../../routes";
import { MockD1Database } from "../mocks/d1";
import {
  createMockEnv,
  createTestBuild,
  STRUCTURE_JSON,
} from "../fixtures/test-data";
import type { TestApp, ErrorResponse } from "../types";

interface InitResponse {
  buildId: string;
  structure: {
    buildCategory: string;
    components: Array<{
      stepIndex: number;
      componentType: string;
      description: string;
    }>;
  };
  latencyMs: number;
}

describe("POST /api/builds/:id/init", () => {
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

  it("should generate structure for new build", async () => {
    const build = createTestBuild({
      id: "test-build-123",
      structure_json: null,
    });
    mockDb.insertTestData("builds", build);

    const res = await app.request("/api/builds/test-build-123/init", {
      method: "POST",
    });

    const data = (await res.json()) as InitResponse;

    expect(res.status).toBe(200);
    expect(data.buildId).toBe("test-build-123");
    expect(data.structure).toBeDefined();
    expect(data.structure.buildCategory).toBeDefined();
    expect(data.structure.components).toHaveLength(3);
    expect(data.latencyMs).toBeDefined();
  });

  it("should return 404 for non-existent build", async () => {
    const res = await app.request("/api/builds/non-existent/init", {
      method: "POST",
    });

    const data = (await res.json()) as ErrorResponse;

    expect(res.status).toBe(404);
    expect(data.error.code).toBe("NOT_FOUND");
  });

  it("should return 409 if structure already exists", async () => {
    const build = createTestBuild({
      id: "test-build-456",
      structure_json: STRUCTURE_JSON,
    });
    mockDb.insertTestData("builds", build);

    const res = await app.request("/api/builds/test-build-456/init", {
      method: "POST",
    });

    const data = (await res.json()) as ErrorResponse;

    expect(res.status).toBe(409);
    expect(data.error.code).toBe("ALREADY_INITIALIZED");
  });

  it("should create build items for each component", async () => {
    const build = createTestBuild({
      id: "test-build-789",
      structure_json: null,
    });
    mockDb.insertTestData("builds", build);

    await app.request("/api/builds/test-build-789/init", {
      method: "POST",
    });

    const items = mockDb.getTableData("build_items");
    const buildItems = items.filter((i) => i.build_id === "test-build-789");

    expect(buildItems).toHaveLength(3);
    expect(buildItems[0].step_index).toBe(0);
    expect(buildItems[1].step_index).toBe(1);
    expect(buildItems[2].step_index).toBe(2);
  });
});
