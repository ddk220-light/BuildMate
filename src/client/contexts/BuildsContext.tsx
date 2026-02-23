/**
 * Builds Context
 *
 * Global state for managing builds from localStorage.
 * Provides builds to all components and handles CRUD operations.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { localStorageService, type LocalBuild } from "../lib/localStorage";

interface BuildsContextValue {
  builds: LocalBuild[];
  isLoading: boolean;
  error: string | null;

  // CRUD operations
  addBuild: (build: LocalBuild) => void;
  updateBuild: (build: LocalBuild) => void;
  removeBuild: (buildId: string) => void;
  getBuildById: (buildId: string) => LocalBuild | undefined;

  // Refresh from localStorage
  refreshBuilds: () => void;
}

const BuildsContext = createContext<BuildsContextValue | null>(null);

interface BuildsProviderProps {
  children: ReactNode;
}

export function BuildsProvider({ children }: BuildsProviderProps) {
  const [builds, setBuilds] = useState<LocalBuild[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load builds from localStorage on mount
  const loadBuilds = useCallback(() => {
    try {
      setIsLoading(true);
      setError(null);
      const loadedBuilds = localStorageService.getAllBuilds();
      setBuilds(loadedBuilds);
    } catch (err) {
      console.error("Failed to load builds from localStorage:", err);
      setError("Failed to load saved builds");
      // Don't clear builds on error - keep any existing state
      // This prevents data loss if localStorage becomes temporarily unavailable
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load on mount
  useEffect(() => {
    loadBuilds();
  }, [loadBuilds]);

  // Add a new build
  const addBuild = useCallback((build: LocalBuild) => {
    try {
      localStorageService.saveBuild(build);
      setBuilds((prev) => {
        // Add to beginning (most recent)
        const filtered = prev.filter((b) => b.id !== build.id);
        return [build, ...filtered];
      });
    } catch (err) {
      console.error("Failed to add build:", err);
      setError("Failed to save build");
    }
  }, []);

  // Update an existing build
  const updateBuild = useCallback((build: LocalBuild) => {
    try {
      localStorageService.saveBuild(build);
      setBuilds((prev) => {
        const index = prev.findIndex((b) => b.id === build.id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = build;
          // Re-sort by updatedAt
          return updated.sort(
            (a, b) =>
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
          );
        }
        return [build, ...prev];
      });
    } catch (err) {
      console.error("Failed to update build:", err);
      setError("Failed to update build");
    }
  }, []);

  // Remove a build
  const removeBuild = useCallback((buildId: string) => {
    try {
      localStorageService.deleteBuild(buildId);
      setBuilds((prev) => prev.filter((b) => b.id !== buildId));
    } catch (err) {
      console.error("Failed to remove build:", err);
      setError("Failed to delete build");
    }
  }, []);

  // Get build by ID
  const getBuildById = useCallback(
    (buildId: string) => {
      return builds.find((b) => b.id === buildId);
    },
    [builds],
  );

  // Refresh from localStorage
  const refreshBuilds = useCallback(() => {
    loadBuilds();
  }, [loadBuilds]);

  const value: BuildsContextValue = {
    builds,
    isLoading,
    error,
    addBuild,
    updateBuild,
    removeBuild,
    getBuildById,
    refreshBuilds,
  };

  return (
    <BuildsContext.Provider value={value}>{children}</BuildsContext.Provider>
  );
}

/**
 * Hook to access builds context
 */
export function useBuilds(): BuildsContextValue {
  const context = useContext(BuildsContext);
  if (!context) {
    throw new Error("useBuilds must be used within a BuildsProvider");
  }
  return context;
}

export default BuildsContext;
