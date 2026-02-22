/**
 * Builds Drawer Component - Slide-out panel for viewing saved builds
 */

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  localStorageService,
  type LocalBuild,
  type ImportResult,
} from "../../lib/localStorage";

interface BuildsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BuildsDrawer({ isOpen, onClose }: BuildsDrawerProps) {
  const navigate = useNavigate();
  const drawerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [savedBuilds, setSavedBuilds] = useState<LocalBuild[]>([]);
  const [importMessage, setImportMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Load saved builds when drawer opens
  useEffect(() => {
    if (isOpen) {
      const builds = localStorageService.getAllBuilds();
      setSavedBuilds(builds);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        handleClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  // Trap focus within drawer
  useEffect(() => {
    if (isOpen && drawerRef.current) {
      const focusableElements = drawerRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[
        focusableElements.length - 1
      ] as HTMLElement;

      const handleTab = (e: KeyboardEvent) => {
        if (e.key === "Tab") {
          if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          } else if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      };

      document.addEventListener("keydown", handleTab);
      firstElement?.focus();

      return () => document.removeEventListener("keydown", handleTab);
    }
  }, [isOpen]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 250);
  };

  const refreshBuilds = () => {
    const builds = localStorageService.getAllBuilds();
    setSavedBuilds(builds);
  };

  // Handle export all builds
  const handleExportAll = () => {
    const exportData = localStorageService.exportAllBuilds();
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `buildmate-builds-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handle import button click
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  // Handle file selection for import
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const result: ImportResult = localStorageService.importBuilds(text);

      if (result.success && result.imported > 0) {
        setImportMessage({
          type: "success",
          text: `Imported ${result.imported} build${result.imported > 1 ? "s" : ""}${result.skipped > 0 ? ` (${result.skipped} skipped)` : ""}`,
        });
        refreshBuilds();
      } else if (result.errors.length > 0) {
        setImportMessage({
          type: "error",
          text: result.errors[0],
        });
      } else {
        setImportMessage({
          type: "error",
          text: "No builds were imported",
        });
      }

      setTimeout(() => setImportMessage(null), 5000);
    } catch {
      setImportMessage({
        type: "error",
        text: "Failed to read file",
      });
      setTimeout(() => setImportMessage(null), 5000);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handle delete build
  const handleDeleteBuild = (buildId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this build?")) {
      localStorageService.deleteBuild(buildId);
      refreshBuilds();
    }
  };

  // Navigate to build
  const handleViewBuild = (build: LocalBuild) => {
    handleClose();
    if (build.status === "completed") {
      navigate(`/complete?id=${build.id}`);
    } else {
      navigate(`/build?id=${build.id}&step=${build.currentStep}`);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Calculate total cost of a build
  const getTotalCost = (build: LocalBuild) => {
    return build.items.reduce((sum, item) => {
      if (item.selectedOption) {
        return sum + item.selectedOption.price;
      }
      if (item.existingProduct) {
        return sum + item.existingProduct.price;
      }
      return sum;
    }, 0);
  };

  // Get status badge styles
  const getStatusStyles = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500 text-white";
      case "in_progress":
        return "bg-amber-500 text-gray-900";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed":
        return "Completed";
      case "in_progress":
        return "In Progress";
      default:
        return "Draft";
    }
  };

  if (!isOpen && !isClosing) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div
        className={`absolute inset-0 bg-black/30 backdrop-blur-sm ${isClosing ? "overlay-exit" : "overlay-enter"}`}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div
        ref={drawerRef}
        className={`absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-[-4px_0_24px_rgba(0,0,0,0.15)] ${isClosing ? "drawer-exit" : "drawer-enter"}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 id="drawer-title" className="text-xl font-bold text-gray-900">
            Your Builds
          </h2>
          <button
            onClick={handleClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            aria-label="Close drawer"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Import/Export Buttons */}
        <div className="flex gap-2 border-b border-gray-200 px-6 py-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".json"
            className="hidden"
          />
          <button
            onClick={handleImportClick}
            className="flex-1 rounded-md border border-gray-200 bg-transparent px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:border-gray-300"
          >
            Import
          </button>
          <button
            onClick={handleExportAll}
            disabled={savedBuilds.length === 0}
            className="flex-1 rounded-md border border-gray-200 bg-transparent px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Export All
          </button>
        </div>

        {/* Import Message */}
        {importMessage && (
          <div
            className={`mx-6 mt-4 rounded-lg p-3 text-sm ${
              importMessage.type === "success"
                ? "bg-green-50 border border-green-200 text-green-700"
                : "bg-red-50 border border-red-200 text-red-700"
            }`}
          >
            {importMessage.text}
          </div>
        )}

        {/* Drawer Content */}
        <div
          className="flex-1 overflow-y-auto p-6"
          style={{ maxHeight: "calc(100vh - 140px)" }}
        >
          {savedBuilds.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 rounded-full bg-gray-100 p-4">
                <svg
                  className="h-8 w-8 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <p className="text-gray-500">No builds yet.</p>
              <p className="text-sm text-gray-400">
                Create your first build to get started!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {savedBuilds.map((build) => (
                <div
                  key={build.id}
                  onClick={() => handleViewBuild(build)}
                  className="cursor-pointer rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-gray-300 hover:shadow-md"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h3 className="font-medium text-gray-900 line-clamp-1">
                      {build.structure?.buildCategory ||
                        build.description.slice(0, 40)}
                    </h3>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusStyles(build.status)}`}
                    >
                      {getStatusLabel(build.status)}
                    </span>
                  </div>
                  <p className="mb-3 text-sm text-gray-500 line-clamp-2">
                    {build.description}
                  </p>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <div className="flex items-center gap-3">
                      <span>{build.items.length} items</span>
                      <span>${getTotalCost(build).toLocaleString()}</span>
                    </div>
                    <span>
                      {build.completedAt
                        ? formatDate(build.completedAt)
                        : formatDate(build.updatedAt)}
                    </span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewBuild(build);
                      }}
                      className="flex-1 rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-100"
                    >
                      {build.status === "completed" ? "View" : "Continue"}
                    </button>
                    <button
                      onClick={(e) => handleDeleteBuild(build.id, e)}
                      className="rounded-lg bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-100"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default BuildsDrawer;
