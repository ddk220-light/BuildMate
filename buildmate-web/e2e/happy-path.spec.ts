/**
 * Happy Path E2E Tests
 *
 * Tests the complete user journey from start to finish
 */

import { test, expect } from '@playwright/test';

test.describe('Happy Path: Gaming PC Build', () => {
  test('should complete full build journey', async ({ page }) => {
    // 1. Navigate to home page
    await page.goto('/');

    // Verify home page loaded
    await expect(page).toHaveTitle(/BuildMate/i);
    await expect(page.getByRole('heading', { name: /build/i })).toBeVisible();

    // 2. Fill in build description and budget
    await page.getByLabel(/description/i).fill('Gaming PC for 1440p, AAA games');
    await page.getByLabel(/minimum budget/i).fill('1000');
    await page.getByLabel(/maximum budget/i).fill('2000');

    // 3. Submit form
    await page.getByRole('button', { name: /start building/i }).click();

    // 4. Wait for navigation to build page
    await page.waitForURL(/\/build\/[a-f0-9-]+/);

    // 5. Wait for structure to be generated
    await expect(page.getByText(/loading/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/loading/i)).not.toBeVisible({ timeout: 15000 });

    // 6. Verify we're on Step 1
    await expect(page.getByText(/step 1 of 3/i)).toBeVisible();

    // 7. Select first option (midrange tier)
    const firstStepOptions = page.getByTestId('product-card');
    await expect(firstStepOptions.first()).toBeVisible({ timeout: 10000 });
    await firstStepOptions.nth(1).getByRole('button', { name: /select/i }).click();

    // 8. Wait for Step 2
    await expect(page.getByText(/step 2 of 3/i)).toBeVisible({ timeout: 5000 });

    // 9. Select second option
    const secondStepOptions = page.getByTestId('product-card');
    await expect(secondStepOptions.first()).toBeVisible({ timeout: 10000 });
    await secondStepOptions.nth(1).getByRole('button', { name: /select/i }).click();

    // 10. Wait for Step 3
    await expect(page.getByText(/step 3 of 3/i)).toBeVisible({ timeout: 5000 });

    // 11. Select third option
    const thirdStepOptions = page.getByTestId('product-card');
    await expect(thirdStepOptions.first()).toBeVisible({ timeout: 10000 });
    await thirdStepOptions.nth(1).getByRole('button', { name: /select/i }).click();

    // 12. Should navigate to complete page
    await page.waitForURL(/\/build\/[a-f0-9-]+\/complete/, { timeout: 10000 });

    // 13. Verify completion page elements
    await expect(page.getByRole('heading', { name: /build complete/i })).toBeVisible();
    await expect(page.getByText(/total cost/i)).toBeVisible();

    // 14. Verify all 3 items are displayed
    const buildItems = page.getByTestId('build-item');
    await expect(buildItems).toHaveCount(3);

    // 15. Test JSON export
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /download json/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.json$/);

    // 16. Save to localStorage
    await page.getByRole('button', { name: /save build/i }).click();
    await expect(page.getByText(/build saved/i)).toBeVisible();

    // 17. Navigate back to home
    await page.getByRole('link', { name: /home/i }).click();

    // 18. Verify saved build appears
    await expect(page.getByText(/your saved builds/i)).toBeVisible();
    await expect(page.getByText(/gaming pc/i)).toBeVisible();
  });
});

test.describe('Happy Path: Smart Home Build', () => {
  test('should complete smart home build', async ({ page }) => {
    await page.goto('/');

    // Fill form with different category
    await page.getByLabel(/description/i).fill('Smart home starter kit, lights and sensors');
    await page.getByLabel(/minimum budget/i).fill('300');
    await page.getByLabel(/maximum budget/i).fill('600');

    await page.getByRole('button', { name: /start building/i }).click();

    // Wait for build page
    await page.waitForURL(/\/build\/[a-f0-9-]+/);

    // Complete all 3 steps (selecting first option each time for speed)
    for (let step = 1; step <= 3; step++) {
      await expect(page.getByText(new RegExp(`step ${step} of 3`, 'i'))).toBeVisible({ timeout: 15000 });

      const options = page.getByTestId('product-card');
      await expect(options.first()).toBeVisible({ timeout: 10000 });
      await options.first().getByRole('button', { name: /select/i }).click();
    }

    // Should be on complete page
    await page.waitForURL(/\/complete/);
    await expect(page.getByRole('heading', { name: /build complete/i })).toBeVisible();

    // Test assembly instructions
    await page.getByRole('button', { name: /get assembly guide/i }).click();
    await expect(page.getByText(/assembly instructions/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/step 1/i)).toBeVisible();
  });
});
