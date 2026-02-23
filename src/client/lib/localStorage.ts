/**
 * Local Storage Service
 *
 * Central service for all localStorage operations.
 * localStorage is the primary source of truth for user data (Phase 2).
 */

import type {
  Build,
  BuildItem,
  ProductOption,
  BuildStructure,
} from "../types/api";

const STORAGE_KEY_PREFIX = "buildmate";
const BUILDS_KEY = `${STORAGE_KEY_PREFIX}_builds`;
const SYNC_QUEUE_KEY = `${STORAGE_KEY_PREFIX}_sync_queue`;
const SCHEMA_VERSION_KEY = `${STORAGE_KEY_PREFIX}_schema_version`;
const CURRENT_SCHEMA_VERSION = 2;

/**
 * Local build structure stored in localStorage
 */
export interface LocalBuild {
  id: string;
  description: string;
  budget: {
    min: number;
    max: number;
  };
  existingItemsText?: string;
  status: "in_progress" | "completed" | "abandoned";
  currentStep: number;
  structure: BuildStructure | null;
  items: LocalBuildItem[];
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  syncedToServer: boolean;
  shareUrl?: string;
}

/**
 * Local build item
 */
export interface LocalBuildItem {
  stepIndex: number;
  componentType: string;
  description: string;
  isLocked: boolean;
  isExisting: boolean;
  selectedOption: ProductOption | null;
  existingProduct?: {
    productName: string;
    brand: string;
    price: number;
    keySpec: string;
  };
}

/**
 * Sync queue item for failed syncs
 */
export interface SyncQueueItem {
  id: string;
  type: "CREATE" | "INIT" | "SELECT" | "COMPLETE";
  buildId: string;
  data: unknown;
  createdAt: string;
  retryCount: number;
}

/**
 * Get all builds from localStorage
 */
export function getAllBuilds(): LocalBuild[] {
  try {
    migrateSchemaIfNeeded();
    const data = localStorage.getItem(BUILDS_KEY);
    if (!data) return [];
    const builds = JSON.parse(data) as LocalBuild[];
    // Sort by updatedAt, most recent first
    return builds.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  } catch (error) {
    console.error("Error reading builds from localStorage:", error);
    return [];
  }
}

/**
 * Get a single build by ID
 */
export function getBuild(buildId: string): LocalBuild | null {
  try {
    const builds = getAllBuilds();
    return builds.find((b) => b.id === buildId) || null;
  } catch (error) {
    console.error("Error getting build from localStorage:", error);
    return null;
  }
}

/**
 * Save or update a build
 */
export function saveBuild(build: LocalBuild): void {
  try {
    const builds = getAllBuilds();
    const existingIndex = builds.findIndex((b) => b.id === build.id);

    const updatedBuild = {
      ...build,
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      builds[existingIndex] = updatedBuild;
    } else {
      builds.push(updatedBuild);
    }

    localStorage.setItem(BUILDS_KEY, JSON.stringify(builds));
  } catch (error) {
    if (isQuotaExceededError(error)) {
      console.error("localStorage quota exceeded, attempting cleanup...");
      cleanupOldBuilds();
      // Retry once after cleanup
      try {
        const builds = getAllBuilds();
        const existingIndex = builds.findIndex((b) => b.id === build.id);
        if (existingIndex >= 0) {
          builds[existingIndex] = {
            ...build,
            updatedAt: new Date().toISOString(),
          };
        } else {
          builds.push({ ...build, updatedAt: new Date().toISOString() });
        }
        localStorage.setItem(BUILDS_KEY, JSON.stringify(builds));
      } catch {
        console.error("Failed to save build even after cleanup");
        throw new Error("Storage quota exceeded");
      }
    } else {
      console.error("Error saving build to localStorage:", error);
      throw error;
    }
  }
}

/**
 * Delete a build by ID
 */
export function deleteBuild(buildId: string): void {
  try {
    const builds = getAllBuilds();
    const filtered = builds.filter((b) => b.id !== buildId);
    localStorage.setItem(BUILDS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Error deleting build from localStorage:", error);
    throw error;
  }
}

/**
 * Convert API Build + Items to LocalBuild format
 */
export function apiToLocalBuild(build: Build, items: BuildItem[]): LocalBuild {
  const localItems: LocalBuildItem[] = [];

  if (build.structure?.components) {
    for (const component of build.structure.components) {
      const item = items.find((i) => i.step_index === component.stepIndex);
      localItems.push({
        stepIndex: component.stepIndex,
        componentType: component.componentType,
        description: component.description,
        isLocked: component.isLocked || false,
        isExisting: component.isExisting || false,
        selectedOption: item?.product_name
          ? {
              productName: item.product_name,
              brand: item.product_brand || "",
              price: item.product_price || 0,
              keySpec: item.product_specs || "",
              compatibilityNote: item.compatibility_note || "",
              bestFor: item.best_for || "",
              differentiationText: "",
              productUrl: item.product_url || undefined,
              imageUrl: item.product_image_url || undefined,
            }
          : null,
        existingProduct: component.existingProduct,
      });
    }
  }

  return {
    id: build.id,
    description: build.description,
    budget: build.budget,
    existingItemsText: build.existingItemsText,
    status: build.status,
    currentStep: build.currentStep,
    structure: build.structure,
    items: localItems,
    createdAt: build.createdAt,
    updatedAt: build.updatedAt,
    completedAt: build.completedAt,
    syncedToServer: true,
  };
}

/**
 * Create a new local build (before server sync)
 */
export function createLocalBuild(
  description: string,
  budgetMin: number,
  budgetMax: number,
  existingItemsText?: string,
): LocalBuild {
  const now = new Date().toISOString();
  return {
    id: generateLocalId(),
    description,
    budget: { min: budgetMin, max: budgetMax },
    existingItemsText,
    status: "in_progress",
    currentStep: 0,
    structure: null,
    items: [],
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    syncedToServer: false,
  };
}

/**
 * Generate a temporary local ID (will be replaced by server ID)
 */
function generateLocalId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ===== Sync Queue Operations =====

/**
 * Add item to sync queue
 */
export function addToSyncQueue(
  item: Omit<SyncQueueItem, "id" | "createdAt" | "retryCount">,
): void {
  try {
    const queue = getSyncQueue();
    queue.push({
      ...item,
      id: generateLocalId(),
      createdAt: new Date().toISOString(),
      retryCount: 0,
    });
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error("Error adding to sync queue:", error);
  }
}

/**
 * Get all items in sync queue
 */
export function getSyncQueue(): SyncQueueItem[] {
  try {
    const data = localStorage.getItem(SYNC_QUEUE_KEY);
    if (!data) return [];
    return JSON.parse(data) as SyncQueueItem[];
  } catch (error) {
    console.error("Error reading sync queue:", error);
    return [];
  }
}

/**
 * Remove item from sync queue
 */
export function removeFromSyncQueue(itemId: string): void {
  try {
    const queue = getSyncQueue();
    const filtered = queue.filter((item) => item.id !== itemId);
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Error removing from sync queue:", error);
  }
}

/**
 * Update retry count for a sync queue item
 */
export function updateSyncQueueItemRetry(itemId: string): void {
  try {
    const queue = getSyncQueue();
    const item = queue.find((i) => i.id === itemId);
    if (item) {
      item.retryCount += 1;
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    }
  } catch (error) {
    console.error("Error updating sync queue item:", error);
  }
}

/**
 * Clear sync queue items that have exceeded max retries
 */
export function clearFailedSyncItems(maxRetries: number = 5): void {
  try {
    const queue = getSyncQueue();
    const filtered = queue.filter((item) => item.retryCount < maxRetries);
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Error clearing failed sync items:", error);
  }
}

// ===== Schema Migration =====

/**
 * Migrate localStorage schema if needed
 */
function migrateSchemaIfNeeded(): void {
  try {
    const version = localStorage.getItem(SCHEMA_VERSION_KEY);
    const currentVersion = version ? parseInt(version, 10) : 1;

    if (currentVersion < CURRENT_SCHEMA_VERSION) {
      // Perform migrations
      if (currentVersion < 2) {
        migrateV1ToV2();
      }

      localStorage.setItem(
        SCHEMA_VERSION_KEY,
        CURRENT_SCHEMA_VERSION.toString(),
      );
    }
  } catch (error) {
    console.error("Error during schema migration:", error);
  }
}

/**
 * Migrate from v1 to v2 schema
 * v1: tier field, v2: bestFor field
 */
function migrateV1ToV2(): void {
  try {
    const data = localStorage.getItem(BUILDS_KEY);
    if (!data) return;

    const builds = JSON.parse(data);
    for (const build of builds) {
      if (build.items) {
        for (const item of build.items) {
          if (item.selectedOption) {
            // Convert tier to bestFor if present
            if (item.selectedOption.tier && !item.selectedOption.bestFor) {
              const tierToBestFor: Record<string, string> = {
                budget: "Value-Focused",
                midrange: "Balanced Performance",
                premium: "Maximum Performance",
              };
              item.selectedOption.bestFor =
                tierToBestFor[item.selectedOption.tier] || "General Use";
              delete item.selectedOption.tier;
            }
            // Remove reviewScore if present
            delete item.selectedOption.reviewScore;
          }
        }
      }
      // Add syncedToServer if missing
      if (build.syncedToServer === undefined) {
        build.syncedToServer = true;
      }
    }

    localStorage.setItem(BUILDS_KEY, JSON.stringify(builds));
  } catch (error) {
    console.error("Error migrating v1 to v2:", error);
  }
}

// ===== Utility Functions =====

/**
 * Check if error is quota exceeded
 */
function isQuotaExceededError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.code === 22 ||
      error.code === 1014 ||
      error.name === "QuotaExceededError" ||
      error.name === "NS_ERROR_DOM_QUOTA_REACHED")
  );
}

/**
 * Cleanup old builds to free up space
 * Removes oldest completed builds first
 */
function cleanupOldBuilds(): void {
  try {
    const builds = getAllBuilds();
    // Sort by updatedAt (oldest first)
    builds.sort(
      (a, b) =>
        new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
    );

    // Remove oldest completed builds until we're under 50
    let removed = 0;
    const toKeep: LocalBuild[] = [];

    for (const build of builds.reverse()) {
      if (toKeep.length < 50 || build.status === "in_progress") {
        toKeep.push(build);
      } else {
        removed++;
      }
    }

    if (removed > 0) {
      localStorage.setItem(BUILDS_KEY, JSON.stringify(toKeep.reverse()));
      console.log(`Cleaned up ${removed} old builds`);
    }
  } catch (error) {
    console.error("Error cleaning up old builds:", error);
  }
}

/**
 * Clear all BuildMate data from localStorage
 */
export function clearAllData(): void {
  localStorage.removeItem(BUILDS_KEY);
  localStorage.removeItem(SYNC_QUEUE_KEY);
  localStorage.removeItem(SCHEMA_VERSION_KEY);
}

// ===== Import/Export Functions =====

/**
 * Export format for a single build
 */
export interface ExportedBuild {
  version: string;
  exportedAt: string;
  build: {
    id: string;
    category: string | null;
    description: string;
    existingItemsText: string | null;
    budget: { min: number; max: number };
    totalCost: number;
    items: Array<{
      step: number;
      componentType: string;
      isExisting: boolean;
      isLocked: boolean;
      product: {
        name: string;
        brand: string;
        price: number;
        keySpec: string;
        bestFor: string;
        url?: string;
      };
      existingProduct: {
        productName: string;
        brand: string;
        price: number;
        keySpec: string;
      } | null;
    }>;
    shareUrl: string | null;
    createdAt: string;
    completedAt: string | null;
  };
}

/**
 * Export format for all builds
 */
export interface ExportedAllBuilds {
  version: string;
  exportedAt: string;
  buildCount: number;
  builds: ExportedBuild["build"][];
}

/**
 * Result of an import operation
 */
export interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: string[];
}

/**
 * Export all builds from localStorage
 */
export function exportAllBuilds(): ExportedAllBuilds {
  const builds = getAllBuilds();

  const exportedBuilds = builds.map((build) => {
    const totalCost = build.items.reduce((sum, item) => {
      if (item.selectedOption) {
        return sum + item.selectedOption.price;
      }
      if (item.existingProduct) {
        return sum + item.existingProduct.price;
      }
      return sum;
    }, 0);

    return {
      id: build.id,
      category: build.structure?.buildCategory || null,
      description: build.description,
      existingItemsText: build.existingItemsText || null,
      budget: build.budget,
      totalCost,
      items: build.items.map((item) => ({
        step: item.stepIndex,
        componentType: item.componentType,
        isExisting: item.isExisting,
        isLocked: item.isLocked,
        product: item.selectedOption
          ? {
              name: item.selectedOption.productName,
              brand: item.selectedOption.brand,
              price: item.selectedOption.price,
              keySpec: item.selectedOption.keySpec,
              bestFor: item.selectedOption.bestFor || "",
              url: item.selectedOption.productUrl,
            }
          : item.existingProduct
            ? {
                name: item.existingProduct.productName,
                brand: item.existingProduct.brand,
                price: item.existingProduct.price,
                keySpec: item.existingProduct.keySpec,
                bestFor: "",
              }
            : {
                name: "",
                brand: "",
                price: 0,
                keySpec: "",
                bestFor: "",
              },
        existingProduct: item.existingProduct || null,
      })),
      shareUrl: build.shareUrl || null,
      createdAt: build.createdAt,
      completedAt: build.completedAt,
    };
  });

  return {
    version: "2.0",
    exportedAt: new Date().toISOString(),
    buildCount: exportedBuilds.length,
    builds: exportedBuilds,
  };
}

/**
 * Export a single build
 */
export function exportBuild(buildId: string): ExportedBuild | null {
  const build = getBuild(buildId);
  if (!build) return null;

  const allExport = exportAllBuilds();
  const exportedBuild = allExport.builds.find((b) => b.id === buildId);
  if (!exportedBuild) return null;

  return {
    version: "2.0",
    exportedAt: new Date().toISOString(),
    build: exportedBuild,
  };
}

/**
 * Import builds from JSON string
 * Supports both single build (v1.0/v2.0) and all-builds format
 */
export function importBuilds(jsonString: string): ImportResult {
  const result: ImportResult = {
    success: false,
    imported: 0,
    skipped: 0,
    errors: [],
  };

  try {
    const data = JSON.parse(jsonString);

    // Detect format: single build or multiple builds
    if (data.builds && Array.isArray(data.builds)) {
      // Multiple builds format
      for (const buildData of data.builds) {
        const importResult = importSingleBuild(
          buildData,
          data.version || "2.0",
        );
        if (importResult.success) {
          result.imported++;
        } else {
          result.skipped++;
          if (importResult.error) {
            result.errors.push(importResult.error);
          }
        }
      }
    } else if (data.build) {
      // Single build format
      const importResult = importSingleBuild(data.build, data.version || "2.0");
      if (importResult.success) {
        result.imported++;
      } else {
        result.skipped++;
        if (importResult.error) {
          result.errors.push(importResult.error);
        }
      }
    } else {
      result.errors.push("Invalid format: expected 'build' or 'builds' field");
      return result;
    }

    result.success = result.imported > 0 || result.errors.length === 0;
    return result;
  } catch (error) {
    result.errors.push(
      `Failed to parse JSON: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    return result;
  }
}

/**
 * Import a single build from exported data
 */
function importSingleBuild(
  buildData: ExportedBuild["build"],
  version: string,
): { success: boolean; error?: string } {
  try {
    // Check if build already exists
    const existingBuild = getBuild(buildData.id);
    if (existingBuild) {
      return { success: false, error: `Build ${buildData.id} already exists` };
    }

    // Convert exported format back to LocalBuild
    const localBuild: LocalBuild = {
      id: buildData.id,
      description: buildData.description,
      budget: buildData.budget,
      existingItemsText: buildData.existingItemsText || undefined,
      status: buildData.completedAt ? "completed" : "in_progress",
      currentStep: buildData.items.length,
      structure: buildData.category
        ? {
            buildCategory: buildData.category,
            totalSteps: buildData.items.length,
            components: buildData.items.map((item) => ({
              stepIndex: item.step,
              componentType: item.componentType,
              description: "",
              isExisting: item.isExisting,
              isLocked: item.isLocked,
              existingProduct: item.existingProduct || undefined,
            })),
            reasoning: "",
          }
        : null,
      items: buildData.items.map((item) => ({
        stepIndex: item.step,
        componentType: item.componentType,
        description: "",
        isLocked: item.isLocked,
        isExisting: item.isExisting,
        selectedOption: item.product.name
          ? {
              productName: item.product.name,
              brand: item.product.brand,
              price: item.product.price,
              keySpec: item.product.keySpec,
              compatibilityNote: "",
              bestFor: item.product.bestFor || migrateV1Tier(version, item),
              differentiationText: "",
              productUrl: item.product.url,
            }
          : null,
        existingProduct: item.existingProduct || undefined,
      })),
      createdAt: buildData.createdAt,
      updatedAt: new Date().toISOString(),
      completedAt: buildData.completedAt,
      syncedToServer: false,
      shareUrl: buildData.shareUrl || undefined,
    };

    saveBuild(localBuild);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Failed to import build: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Migrate v1.0 tier to bestFor
 */
function migrateV1Tier(version: string, item: unknown): string {
  if (version === "1.0") {
    const tierItem = item as { tier?: string };
    if (tierItem.tier) {
      const tierToBestFor: Record<string, string> = {
        budget: "Value-Focused",
        midrange: "Balanced Performance",
        premium: "Maximum Performance",
      };
      return tierToBestFor[tierItem.tier] || "General Use";
    }
  }
  return "General Use";
}

/**
 * Export for module usage
 */
export const localStorageService = {
  // Build operations
  getAllBuilds,
  getBuild,
  saveBuild,
  deleteBuild,
  apiToLocalBuild,
  createLocalBuild,

  // Sync queue
  addToSyncQueue,
  getSyncQueue,
  removeFromSyncQueue,
  updateSyncQueueItemRetry,
  clearFailedSyncItems,

  // Import/Export
  exportAllBuilds,
  exportBuild,
  importBuilds,

  // Utilities
  clearAllData,
};

export default localStorageService;
