/**
 * Test Setup
 *
 * Global setup for all Vitest tests.
 * Initializes mocks and test environment.
 */

import { vi, beforeEach, afterEach } from "vitest";
import { createMockFetch } from "./mocks/gemini";

// Store original fetch
const originalFetch = globalThis.fetch;

// Mock fetch globally for Gemini API calls
beforeEach(() => {
  // Replace global fetch with mock
  globalThis.fetch = createMockFetch() as typeof fetch;
});

afterEach(() => {
  // Restore original fetch
  globalThis.fetch = originalFetch;

  // Clear all mocks
  vi.clearAllMocks();
});

// Extend expect with custom matchers if needed
// (none required for now)

// Export test utilities
export { vi };
