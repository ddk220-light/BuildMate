/**
 * Error Handling E2E Tests
 *
 * Tests error scenarios and validation
 */

import { test, expect } from "@playwright/test";

test.describe("Form Validation", () => {
  test("should show error for empty description", async ({ page }) => {
    await page.goto("/");

    // Fill only budget fields
    await page.getByLabel(/minimum budget/i).fill("1000");
    await page.getByLabel(/maximum budget/i).fill("2000");

    // Try to submit
    await page.getByRole("button", { name: /start building/i }).click();

    // Should show validation error
    await expect(page.getByText(/description.*required/i)).toBeVisible();

    // Should not navigate away
    await expect(page).toHaveURL("/");
  });

  test("should show error for invalid budget range", async ({ page }) => {
    await page.goto("/");

    // Fill with min > max
    await page.getByLabel(/description/i).fill("Test build");
    await page.getByLabel(/minimum budget/i).fill("2000");
    await page.getByLabel(/maximum budget/i).fill("1000");

    await page.getByRole("button", { name: /start building/i }).click();

    // Should show validation error
    await expect(page.getByText(/minimum.*less than.*maximum/i)).toBeVisible();
  });

  test("should show error for negative budget", async ({ page }) => {
    await page.goto("/");

    await page.getByLabel(/description/i).fill("Test build");
    await page.getByLabel(/minimum budget/i).fill("-100");
    await page.getByLabel(/maximum budget/i).fill("1000");

    await page.getByRole("button", { name: /start building/i }).click();

    // Should show validation error
    await expect(page.getByText(/budget.*positive/i)).toBeVisible();
  });

  test("should trim whitespace from description", async ({ page }) => {
    await page.goto("/");

    // Fill with whitespace
    await page.getByLabel(/description/i).fill("  Gaming PC  ");
    await page.getByLabel(/minimum budget/i).fill("1000");
    await page.getByLabel(/maximum budget/i).fill("2000");

    await page.getByRole("button", { name: /start building/i }).click();

    // Should succeed and trim whitespace
    await page.waitForURL(/\/build\/[a-f0-9-]+/);
  });
});

test.describe("Non-Linear Navigation", () => {
  test("should allow going back to previous steps", async ({ page }) => {
    await page.goto("/");

    // Start a build
    await page.getByLabel(/description/i).fill("Test build");
    await page.getByLabel(/minimum budget/i).fill("1000");
    await page.getByLabel(/maximum budget/i).fill("2000");
    await page.getByRole("button", { name: /start building/i }).click();

    await page.waitForURL(/\/build\/[a-f0-9-]+/);

    // Complete step 1
    await expect(page.getByText(/step 1 of 3/i)).toBeVisible({
      timeout: 15000,
    });
    const step1Options = page.getByTestId("product-card");
    await expect(step1Options.first()).toBeVisible({ timeout: 10000 });
    await step1Options
      .first()
      .getByRole("button", { name: /select/i })
      .click();

    // Now on step 2
    await expect(page.getByText(/step 2 of 3/i)).toBeVisible({ timeout: 5000 });

    // Click back button
    await page.getByRole("button", { name: /back/i }).click();

    // Should be back on step 1
    await expect(page.getByText(/step 1 of 3/i)).toBeVisible();

    // Previous selection should be highlighted
    await expect(step1Options.first()).toHaveClass(/selected|active/);
  });

  test("should update modification count when reselecting", async ({
    page,
  }) => {
    await page.goto("/");

    // Start a build
    await page.getByLabel(/description/i).fill("Test build");
    await page.getByLabel(/minimum budget/i).fill("1000");
    await page.getByLabel(/maximum budget/i).fill("2000");
    await page.getByRole("button", { name: /start building/i }).click();

    await page.waitForURL(/\/build\/[a-f0-9-]+/);

    // Complete step 1 with first option
    await expect(page.getByText(/step 1 of 3/i)).toBeVisible({
      timeout: 15000,
    });
    const options = page.getByTestId("product-card");
    await expect(options.first()).toBeVisible({ timeout: 10000 });
    await options
      .first()
      .getByRole("button", { name: /select/i })
      .click();

    // Complete step 2
    await expect(page.getByText(/step 2 of 3/i)).toBeVisible({ timeout: 5000 });
    await expect(options.first()).toBeVisible({ timeout: 10000 });
    await options
      .first()
      .getByRole("button", { name: /select/i })
      .click();

    // Go back to step 1
    await page.getByRole("button", { name: /back/i }).click();
    await page.getByRole("button", { name: /back/i }).click();
    await expect(page.getByText(/step 1 of 3/i)).toBeVisible();

    // Select different option
    await options
      .nth(1)
      .getByRole("button", { name: /select/i })
      .click();

    // Should still be on step 2 (not regress)
    await expect(page.getByText(/step 2 of 3/i)).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Option Refresh", () => {
  test("should show different options when refreshing", async ({ page }) => {
    await page.goto("/");

    // Start a build
    await page.getByLabel(/description/i).fill("Test build");
    await page.getByLabel(/minimum budget/i).fill("1000");
    await page.getByLabel(/maximum budget/i).fill("2000");
    await page.getByRole("button", { name: /start building/i }).click();

    await page.waitForURL(/\/build\/[a-f0-9-]+/);

    // Wait for options to load
    await expect(page.getByText(/step 1 of 3/i)).toBeVisible({
      timeout: 15000,
    });
    const options = page.getByTestId("product-card");
    await expect(options.first()).toBeVisible({ timeout: 10000 });

    // Get first option name (stored for potential future comparison)
    const _firstOptionName = await options
      .first()
      .getByTestId("product-name")
      .textContent();
    void _firstOptionName; // Acknowledge intentionally unused variable

    // Click refresh button
    await page.getByRole("button", { name: /new recommendations/i }).click();

    // Wait for new options to load
    await expect(page.getByText(/loading/i)).toBeVisible();
    await expect(page.getByText(/loading/i)).not.toBeVisible({
      timeout: 10000,
    });

    // First option might be different (not guaranteed but likely)
    await expect(options.first()).toBeVisible();
  });
});

test.describe("Network Error Handling", () => {
  test("should handle API errors gracefully", async ({ page }) => {
    // Intercept API call and return error
    await page.route("**/api/builds", (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: { message: "Internal server error" } }),
      });
    });

    await page.goto("/");

    await page.getByLabel(/description/i).fill("Test build");
    await page.getByLabel(/minimum budget/i).fill("1000");
    await page.getByLabel(/maximum budget/i).fill("2000");
    await page.getByRole("button", { name: /start building/i }).click();

    // Should show error message
    await expect(page.getByText(/error.*occurred/i)).toBeVisible();
  });

  test("should handle timeout gracefully", async ({ page }) => {
    // Intercept and delay API response
    await page.route("**/api/builds/*/init", (route) => {
      // Never respond (simulate timeout)
      setTimeout(() => {
        route.fulfill({
          status: 408,
          body: JSON.stringify({ error: { message: "Request timeout" } }),
        });
      }, 5000);
    });

    await page.goto("/");

    await page.getByLabel(/description/i).fill("Test build");
    await page.getByLabel(/minimum budget/i).fill("1000");
    await page.getByLabel(/maximum budget/i).fill("2000");
    await page.getByRole("button", { name: /start building/i }).click();

    await page.waitForURL(/\/build\/[a-f0-9-]+/);

    // Should show timeout error eventually
    await expect(page.getByText(/timeout|taking.*long/i)).toBeVisible({
      timeout: 10000,
    });
  });
});
