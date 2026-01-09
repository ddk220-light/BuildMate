/**
 * Analytics Endpoints Tests
 *
 * Tests for:
 * - GET /api/builds/:id/events
 * - GET /api/analytics/overview
 * - GET /api/analytics/completions
 */

import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import routes from "../../routes";
import { MockD1Database } from "../mocks/d1";
import { createMockEnv, createCompleteBuild } from "../fixtures/test-data";
import type {
  TestApp,
  EventsResponse,
  AnalyticsOverviewResponse,
  AnalyticsCompletionsResponse,
  ErrorResponse,
} from "../types";

describe("Analytics Endpoints", () => {
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

  describe("GET /api/builds/:id/events", () => {
    it("should return all events for a build", async () => {
      const { build, items } = createCompleteBuild();

      mockDb.insertTestData("builds", build);
      items.forEach((item) => mockDb.insertTestData("build_items", item));

      // Insert some test events
      mockDb.insertTestData("build_events", {
        id: "event-1",
        build_id: build.id,
        event_type: "BUILD_STARTED",
        event_data: JSON.stringify({ description: build.description }),
        created_at: new Date().toISOString(),
      });

      mockDb.insertTestData("build_events", {
        id: "event-2",
        build_id: build.id,
        event_type: "STRUCTURE_GENERATED",
        event_data: JSON.stringify({ components: 3 }),
        created_at: new Date().toISOString(),
      });

      const res = await app.request(`/api/builds/${build.id}/events`);
      const data = (await res.json()) as EventsResponse;

      expect(res.status).toBe(200);
      expect(data.buildId).toBe(build.id);
      expect(data.events).toBeDefined();
      expect(data.events.length).toBeGreaterThanOrEqual(2);
    });

    it("should return 404 for non-existent build", async () => {
      const res = await app.request("/api/builds/non-existent/events");
      const data = (await res.json()) as ErrorResponse;

      expect(res.status).toBe(404);
      expect(data.error.code).toBe("NOT_FOUND");
    });

    it("should order events chronologically", async () => {
      const { build, items } = createCompleteBuild();

      mockDb.insertTestData("builds", build);
      items.forEach((item) => mockDb.insertTestData("build_items", item));

      // Insert events with different timestamps
      const now = Date.now();
      mockDb.insertTestData("build_events", {
        id: "event-1",
        build_id: build.id,
        event_type: "BUILD_STARTED",
        event_data: "{}",
        created_at: new Date(now - 3000).toISOString(),
      });

      mockDb.insertTestData("build_events", {
        id: "event-2",
        build_id: build.id,
        event_type: "STRUCTURE_GENERATED",
        event_data: "{}",
        created_at: new Date(now - 2000).toISOString(),
      });

      mockDb.insertTestData("build_events", {
        id: "event-3",
        build_id: build.id,
        event_type: "BUILD_COMPLETED",
        event_data: "{}",
        created_at: new Date(now - 1000).toISOString(),
      });

      const res = await app.request(`/api/builds/${build.id}/events`);
      const data = (await res.json()) as EventsResponse;

      expect(res.status).toBe(200);
      expect(data.events[0].eventType).toBe("BUILD_STARTED");
      expect(data.events[1].eventType).toBe("STRUCTURE_GENERATED");
      expect(data.events[2].eventType).toBe("BUILD_COMPLETED");
    });
  });

  describe("GET /api/analytics/overview", () => {
    it("should return overall statistics", async () => {
      // Create a couple of completed builds
      for (let i = 0; i < 2; i++) {
        const { build, items } = createCompleteBuild();
        mockDb.insertTestData("builds", build);
        items.forEach((item) => mockDb.insertTestData("build_items", item));

        // Add metrics
        mockDb.insertTestData("build_metrics", {
          build_id: build.id,
          time_to_complete_ms: 60000,
          total_cost: 1000 + i * 100,
          budget_min: build.budget_min,
          budget_max: build.budget_max,
          budget_utilization_percent: 75.0,
          modification_count: i,
          created_at: new Date().toISOString(),
        });
      }

      const res = await app.request("/api/analytics/overview");
      const data = (await res.json()) as AnalyticsOverviewResponse;

      expect(res.status).toBe(200);
      expect(data.totalBuilds).toBeDefined();
      expect(data.completedBuilds).toBeDefined();
      expect(data.avgBudgetUtilization).toBeDefined();
      expect(data.budgetAdherence).toBeDefined();
    });

    it("should calculate budget adherence correctly", async () => {
      // Create builds with different budget adherence
      const { build: build1, items: items1 } = createCompleteBuild();
      mockDb.insertTestData("builds", build1);
      items1.forEach((item) => mockDb.insertTestData("build_items", item));
      mockDb.insertTestData("build_metrics", {
        build_id: build1.id,
        time_to_complete_ms: 60000,
        total_cost: 950,
        budget_min: 1000,
        budget_max: 2000,
        budget_utilization_percent: 47.5, // Within budget
        modification_count: 0,
        created_at: new Date().toISOString(),
      });

      const res = await app.request("/api/analytics/overview");
      const data = (await res.json()) as AnalyticsOverviewResponse;

      expect(res.status).toBe(200);
      expect(data.budgetAdherence.withinBudget).toBeGreaterThan(0);
    });
  });

  describe("GET /api/analytics/completions", () => {
    it("should return daily completion stats", async () => {
      const res = await app.request("/api/analytics/completions?days=7");
      const data = (await res.json()) as AnalyticsCompletionsResponse;

      expect(res.status).toBe(200);
      expect(data.period).toBe("7 days");
      expect(Array.isArray(data.completions)).toBe(true);
    });

    it("should default to 30 days if not specified", async () => {
      const res = await app.request("/api/analytics/completions");
      const data = (await res.json()) as AnalyticsCompletionsResponse;

      expect(res.status).toBe(200);
      expect(data.period).toBe("30 days");
    });

    it("should return 400 for invalid days parameter", async () => {
      const res = await app.request("/api/analytics/completions?days=invalid");
      const data = (await res.json()) as ErrorResponse;

      expect(res.status).toBe(400);
      expect(data.error.code).toBe("VALIDATION_ERROR");
    });

    it("should limit days to maximum of 365", async () => {
      const res = await app.request("/api/analytics/completions?days=1000");
      const data = (await res.json()) as AnalyticsCompletionsResponse;

      expect(res.status).toBe(200);
      // Should be capped at 365
      expect(data.period).toBe("365 days");
    });

    it("should group completions by date", async () => {
      // Create builds on different days
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const { build: build1, items: items1 } = createCompleteBuild();
      build1.completed_at = today.toISOString();
      mockDb.insertTestData("builds", build1);
      items1.forEach((item) => mockDb.insertTestData("build_items", item));

      const { build: build2, items: items2 } = createCompleteBuild();
      build2.completed_at = yesterday.toISOString();
      mockDb.insertTestData("builds", build2);
      items2.forEach((item) => mockDb.insertTestData("build_items", item));

      const res = await app.request("/api/analytics/completions?days=2");
      const data = (await res.json()) as AnalyticsCompletionsResponse;

      expect(res.status).toBe(200);
      expect(data.completions).toBeDefined();
      // Should have entries for both days
      expect(data.completions.length).toBeGreaterThan(0);
    });
  });
});
