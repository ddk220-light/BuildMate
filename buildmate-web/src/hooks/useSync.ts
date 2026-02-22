/**
 * useSync Hook
 *
 * Hook for managing D1 sync service lifecycle.
 * Starts sync on mount, stops on unmount.
 */

import { useEffect, useState, useCallback } from "react";
import { syncService } from "../lib/sync";

interface UseSyncResult {
  queueLength: number;
  isSyncing: boolean;
  forceSync: () => Promise<void>;
}

/**
 * Hook for managing sync service
 */
export function useSync(): UseSyncResult {
  const [queueLength, setQueueLength] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // Start periodic sync on mount
  useEffect(() => {
    syncService.startPeriodicSync();

    // Update queue length periodically
    const intervalId = setInterval(() => {
      setQueueLength(syncService.getQueueLength());
      setIsSyncing(syncService.isSyncing());
    }, 5000);

    return () => {
      syncService.stopPeriodicSync();
      clearInterval(intervalId);
    };
  }, []);

  // Force sync function
  const forceSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      await syncService.forceSync();
    } finally {
      setIsSyncing(false);
      setQueueLength(syncService.getQueueLength());
    }
  }, []);

  return {
    queueLength,
    isSyncing,
    forceSync,
  };
}

export default useSync;
