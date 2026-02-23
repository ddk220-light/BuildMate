/**
 * useAutoSave Hook
 *
 * Automatically saves build state to localStorage on every change.
 * Uses debouncing to prevent excessive writes.
 */

import { useEffect, useState, useRef, useCallback } from "react";
import { localStorageService, type LocalBuild } from "../lib/localStorage";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

interface UseAutoSaveOptions {
  debounceMs?: number;
  enabled?: boolean;
}

interface UseAutoSaveResult {
  saveStatus: SaveStatus;
  lastSavedAt: Date | null;
  saveError: string | null;
  forceSave: () => void;
}

/**
 * Hook for auto-saving build state to localStorage
 *
 * @param build The build to auto-save (null to disable)
 * @param options Configuration options
 * @returns Save status and controls
 */
export function useAutoSave(
  build: LocalBuild | null,
  options: UseAutoSaveOptions = {}
): UseAutoSaveResult {
  const { debounceMs = 100, enabled = true } = options;

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const buildRef = useRef<LocalBuild | null>(build);

  // Update ref when build changes
  useEffect(() => {
    buildRef.current = build;
  }, [build]);

  // Perform the actual save
  const performSave = useCallback(() => {
    const currentBuild = buildRef.current;
    if (!currentBuild || !enabled) return;

    setSaveStatus("saving");
    setSaveError(null);

    try {
      localStorageService.saveBuild({
        ...currentBuild,
        updatedAt: new Date().toISOString(),
      });
      setSaveStatus("saved");
      setLastSavedAt(new Date());

      // Reset to idle after showing "saved" briefly
      setTimeout(() => {
        setSaveStatus("idle");
      }, 1500);
    } catch (error) {
      console.error("Auto-save failed:", error);
      setSaveStatus("error");
      setSaveError(
        error instanceof Error ? error.message : "Failed to save"
      );
    }
  }, [enabled]);

  // Force immediate save
  const forceSave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    performSave();
  }, [performSave]);

  // Auto-save with debounce when build changes
  useEffect(() => {
    if (!build || !enabled) return;

    // Clear any pending save
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Schedule new save
    timeoutRef.current = setTimeout(() => {
      performSave();
    }, debounceMs);

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [build, enabled, debounceMs, performSave]);

  return {
    saveStatus,
    lastSavedAt,
    saveError,
    forceSave,
  };
}

export default useAutoSave;
