/**
 * D1 Sync Service
 *
 * Syncs localStorage changes to D1 in the background.
 * Uses fire-and-forget pattern - never blocks UI.
 */

import { api } from "./api";
import {
  localStorageService,
  type LocalBuild,
  type SyncQueueItem,
} from "./localStorage";
import type { ProductOption, BuildStructure } from "../types/api";

const SYNC_INTERVAL_MS = 30000; // 30 seconds
const MAX_RETRIES = 5;

let syncIntervalId: ReturnType<typeof setInterval> | null = null;
let isSyncing = false;

/**
 * Sync Service for background D1 synchronization
 */
export const syncService = {
  /**
   * Start the periodic sync process
   */
  startPeriodicSync(): void {
    if (syncIntervalId) return; // Already running

    syncIntervalId = setInterval(() => {
      this.processQueue();
    }, SYNC_INTERVAL_MS);

    // Also process immediately on start
    this.processQueue();
  },

  /**
   * Stop the periodic sync process
   */
  stopPeriodicSync(): void {
    if (syncIntervalId) {
      clearInterval(syncIntervalId);
      syncIntervalId = null;
    }
  },

  /**
   * Sync build creation to D1 (fire-and-forget)
   */
  async syncBuildCreation(build: LocalBuild): Promise<void> {
    try {
      const response = await api.createBuild({
        description: build.description,
        budgetMin: build.budget.min,
        budgetMax: build.budget.max,
        existingItemsText: build.existingItemsText,
      });

      // Update local build with server ID if different
      if (response.buildId !== build.id) {
        const updatedBuild: LocalBuild = {
          ...build,
          id: response.buildId,
          syncedToServer: true,
        };
        localStorageService.saveBuild(updatedBuild);

        // Delete the old local-only entry
        if (build.id.startsWith("local_")) {
          localStorageService.deleteBuild(build.id);
        }
      } else {
        // Just mark as synced
        localStorageService.saveBuild({
          ...build,
          syncedToServer: true,
        });
      }
    } catch (error) {
      console.warn("Sync build creation failed, queueing for retry:", error);
      localStorageService.addToSyncQueue({
        type: "CREATE",
        buildId: build.id,
        data: {
          description: build.description,
          budgetMin: build.budget.min,
          budgetMax: build.budget.max,
          existingItemsText: build.existingItemsText,
        },
      });
    }
  },

  /**
   * Sync structure generation to D1 (fire-and-forget)
   */
  async syncStructureGeneration(
    buildId: string,
    structure: BuildStructure
  ): Promise<void> {
    try {
      // Structure is generated server-side, so this is mostly for logging
      // The initBuild call already saves to D1
      console.log("Structure generation synced for build:", buildId);
    } catch (error) {
      console.warn("Sync structure generation failed:", error);
      localStorageService.addToSyncQueue({
        type: "INIT",
        buildId,
        data: { structure },
      });
    }
  },

  /**
   * Sync option selection to D1 (fire-and-forget)
   */
  async syncSelection(
    buildId: string,
    stepIndex: number,
    option: ProductOption
  ): Promise<void> {
    try {
      await api.selectOption(buildId, stepIndex, option);
    } catch (error) {
      console.warn("Sync selection failed, queueing for retry:", error);
      localStorageService.addToSyncQueue({
        type: "SELECT",
        buildId,
        data: { stepIndex, option },
      });
    }
  },

  /**
   * Sync build completion to D1 (fire-and-forget)
   */
  async syncCompletion(buildId: string): Promise<void> {
    try {
      await api.completeBuild(buildId);
    } catch (error) {
      console.warn("Sync completion failed, queueing for retry:", error);
      localStorageService.addToSyncQueue({
        type: "COMPLETE",
        buildId,
        data: {},
      });
    }
  },

  /**
   * Process the sync queue
   */
  async processQueue(): Promise<void> {
    if (isSyncing) return; // Prevent concurrent processing

    isSyncing = true;

    try {
      const queue = localStorageService.getSyncQueue();
      if (queue.length === 0) return;

      console.log(`Processing sync queue: ${queue.length} items`);

      for (const item of queue) {
        if (item.retryCount >= MAX_RETRIES) {
          console.warn(`Removing failed sync item after ${MAX_RETRIES} retries:`, item);
          localStorageService.removeFromSyncQueue(item.id);
          continue;
        }

        try {
          await this.processSyncItem(item);
          localStorageService.removeFromSyncQueue(item.id);
        } catch (error) {
          console.warn(`Sync item failed, will retry:`, error);
          localStorageService.updateSyncQueueItemRetry(item.id);
        }
      }
    } finally {
      isSyncing = false;
    }
  },

  /**
   * Process a single sync queue item
   */
  async processSyncItem(item: SyncQueueItem): Promise<void> {
    switch (item.type) {
      case "CREATE": {
        const data = item.data as {
          description: string;
          budgetMin: number;
          budgetMax: number;
          existingItemsText?: string;
        };
        await api.createBuild(data);
        break;
      }

      case "SELECT": {
        const data = item.data as {
          stepIndex: number;
          option: ProductOption;
        };
        await api.selectOption(item.buildId, data.stepIndex, data.option);
        break;
      }

      case "COMPLETE": {
        await api.completeBuild(item.buildId);
        break;
      }

      case "INIT": {
        // Structure generation happens server-side, nothing to sync
        break;
      }

      default:
        console.warn("Unknown sync item type:", item.type);
    }
  },

  /**
   * Get current queue length
   */
  getQueueLength(): number {
    return localStorageService.getSyncQueue().length;
  },

  /**
   * Check if sync is currently running
   */
  isSyncing(): boolean {
    return isSyncing;
  },

  /**
   * Force immediate sync of all pending items
   */
  async forceSync(): Promise<void> {
    await this.processQueue();
  },
};

export default syncService;
