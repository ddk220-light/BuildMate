/**
 * Shared Build Page
 *
 * Read-only view of a shared build accessed via share code.
 */

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button, Spinner } from "../components/ui";
import { api, ApiClientError } from "../lib/api";
import { localStorageService, type LocalBuild } from "../lib/localStorage";
import { useBuilds } from "../contexts/BuildsContext";
import { useTracking } from "../contexts/TrackingContext";
import { useTheme } from "../contexts/ThemeContext";

export function SharedBuildPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { addBuild } = useBuilds();
  const { trackEvent } = useTracking();
  const { detectAndApply } = useTheme();
  const [build, setBuild] = useState<LocalBuild | null>(null);
  const [sharedAt, setSharedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCloning, setIsCloning] = useState(false);
  const [cloneSuccess, setCloneSuccess] = useState(false);

  useEffect(() => {
    if (!code) return;

    const fetchSharedBuild = async () => {
      try {
        const response = await api.getSharedBuild(code);
        setBuild(response.build as LocalBuild);
        setSharedAt(response.sharedAt);
        detectAndApply((response.build as LocalBuild).description);
      } catch (err) {
        if (err instanceof ApiClientError) {
          setError(err.message);
        } else {
          setError("Failed to load shared build");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchSharedBuild();
  }, [code]);

  const handleClone = async () => {
    if (!build) return;

    setIsCloning(true);
    try {
      // Create a new local build from the shared one
      const clonedBuild: LocalBuild = {
        ...build,
        id: `cloned_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncedToServer: false,
        shareUrl: undefined,
      };

      // Save to localStorage
      localStorageService.saveBuild(clonedBuild);
      addBuild(clonedBuild);
      trackEvent("build_cloned", { buildId: clonedBuild.id });
      setCloneSuccess(true);

      // Navigate to the cloned build after a brief delay
      setTimeout(() => {
        navigate(`/complete?id=${clonedBuild.id}`);
      }, 1500);
    } catch (err) {
      console.error("Failed to clone build:", err);
      setError("Failed to clone build to your collection");
    } finally {
      setIsCloning(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-600">Loading shared PC build...</p>
        </div>
      </div>
    );
  }

  if (error || !build) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Build Not Found
          </h2>
          <p className="text-gray-600 mb-6">
            {error || "This shared build does not exist or has been removed."}
          </p>
          <Button onClick={() => navigate("/")}>Start a New Build</Button>
        </div>
      </div>
    );
  }

  // Calculate total cost
  const totalCost = build.items.reduce(
    (sum, item) => sum + (item.selectedOption?.price || 0),
    0,
  );

  return (
    <div className="max-w-3xl mx-auto">
      {/* Shared Badge */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
            <svg
              className="w-5 h-5 text-purple-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
              />
            </svg>
          </div>
          <div>
            <p className="font-medium text-purple-900">Shared PC Build</p>
            <p className="text-sm text-purple-600">
              Shared on{" "}
              {sharedAt
                ? new Date(sharedAt).toLocaleDateString()
                : "Unknown date"}
            </p>
          </div>
        </div>
        <Button
          onClick={handleClone}
          disabled={isCloning || cloneSuccess}
          className="bg-purple-600 hover:bg-purple-700"
        >
          {cloneSuccess ? (
            <>
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Cloned!
            </>
          ) : isCloning ? (
            <>
              <Spinner size="sm" className="mr-2" />
              Cloning...
            </>
          ) : (
            "Clone to My PC Builds"
          )}
        </Button>
      </div>

      {/* Build Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {build.structure?.buildCategory || "Build"}
        </h1>
        <p className="text-gray-600 mb-4">{build.description}</p>

        <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="text-sm text-gray-500">Budget</p>
            <p className="font-semibold text-gray-900">
              ${build.budget.min.toLocaleString()} - $
              {build.budget.max.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Cost</p>
            <p className="font-semibold text-green-600">
              ${totalCost.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Build Items */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">
          PC Parts ({build.items.length})
        </h2>

        {build.items.map((item, index) => (
          <div
            key={index}
            className={`bg-white rounded-xl shadow-sm border p-5 ${
              item.isLocked || item.isExisting
                ? "border-amber-300 bg-amber-50/30"
                : "border-gray-200"
            }`}
          >
            <div className="flex items-start gap-4">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  item.isLocked || item.isExisting
                    ? "bg-amber-500 text-white"
                    : "bg-green-500 text-white"
                }`}
              >
                {item.isLocked || item.isExisting ? (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900">
                    {item.componentType}
                  </h3>
                  {(item.isLocked || item.isExisting) && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                      Already Owned
                    </span>
                  )}
                </div>

                {item.selectedOption ? (
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium text-gray-900">
                          {item.selectedOption.productName}
                        </p>
                        <p className="text-sm text-gray-500">
                          {item.selectedOption.brand}
                        </p>
                      </div>
                      <p className="font-semibold text-gray-900">
                        ${item.selectedOption.price.toLocaleString()}
                      </p>
                    </div>
                    {item.selectedOption.bestFor && (
                      <p className="text-sm text-purple-600">
                        Best for: {item.selectedOption.bestFor}
                      </p>
                    )}
                    <p className="text-sm text-gray-600 mt-1">
                      {item.selectedOption.keySpec}
                    </p>
                  </div>
                ) : item.existingProduct ? (
                  <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {item.existingProduct.productName}
                        </p>
                        <p className="text-sm text-gray-500">
                          {item.existingProduct.brand}
                        </p>
                      </div>
                      <p className="font-semibold text-amber-700">
                        ~${item.existingProduct.price?.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 mt-2">No selection</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="mt-8 flex gap-4">
        <Button variant="outline" onClick={() => navigate("/")}>
          ← Start a New Build
        </Button>
        <Button onClick={handleClone} disabled={isCloning || cloneSuccess}>
          {cloneSuccess ? "Cloned!" : "Clone to My PC Builds"}
        </Button>
      </div>
    </div>
  );
}

export default SharedBuildPage;
