/**
 * Build Page - Step-by-step component selection
 *
 * Redesigned with horizontal roadmap, compact budget widget,
 * and horizontal product cards with transition animations.
 */

import { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Button,
  Spinner,
  ProductCard,
  ComponentRoadmap,
  BuildHeader,
} from "../components/ui";
import { api, ApiClientError } from "../lib/api";
import { useTracking } from "../contexts/TrackingContext";
import { useTheme } from "../contexts/ThemeContext";
import type { Build, BuildItem, ProductOption } from "../types/api";

interface OptionsResponse {
  buildId: string;
  stepIndex: number;
  options: ProductOption[];
  cached?: boolean;
}

type TransitionState = "idle" | "confirming" | "transitioning";

export function BuildPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { trackEvent } = useTracking();
  const { detectAndApply } = useTheme();

  // Get build ID from query parameter
  const id = searchParams.get("id");
  const [build, setBuild] = useState<Build | null>(null);
  const [items, setItems] = useState<BuildItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Option selection state
  const [options, setOptions] = useState<ProductOption[]>([]);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(
    null,
  );
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  // Transition state for animations
  const [transitionState, setTransitionState] =
    useState<TransitionState>("idle");
  const [confirmedOption, setConfirmedOption] = useState<ProductOption | null>(
    null,
  );

  // Build name state
  const [buildName, setBuildName] = useState<string | null>(null);

  // Get active step from URL or build state
  const urlStep = searchParams.get("step");
  const activeStep =
    urlStep !== null ? parseInt(urlStep, 10) : (build?.currentStep ?? 0);

  const fetchBuild = useCallback(async () => {
    if (!id) return;
    try {
      const response = await api.getBuild(id);
      setBuild(response.build);
      setItems(response.items);
      setBuildName(response.build.buildName || null);
      detectAndApply(response.build.description);
      return response;
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError("Failed to load build");
      }
      return null;
    }
  }, [id]);

  useEffect(() => {
    const loadBuild = async () => {
      setIsLoading(true);
      await fetchBuild();
      setIsLoading(false);
    };
    loadBuild();
  }, [fetchBuild]);

  // Fetch options when active step changes
  useEffect(() => {
    if (!build?.structure || build.status === "completed") return;

    const component = build.structure.components.find(
      (c) => c.stepIndex === activeStep,
    );
    if (!component || component.isLocked || component.isExisting) return;

    const fetchOptions = async () => {
      // If we're transitioning, keep showing transition state while loading
      if (transitionState !== "transitioning") {
        setIsLoadingOptions(true);
      }
      setOptionsError(null);

      try {
        const response = (await api.getStepOptions(
          id!,
          activeStep,
        )) as OptionsResponse;

        // Clear old state and set new options
        setOptions(response.options);
        setSelectedOptionIndex(null);
        setConfirmedOption(null);

        // Now that new options are ready, end the transition
        setTransitionState("idle");
        setIsLoadingOptions(false);
      } catch (err) {
        if (err instanceof ApiClientError) {
          setOptionsError(err.message);
        } else {
          setOptionsError("Failed to load options");
        }
        setTransitionState("idle");
        setIsLoadingOptions(false);
      }
    };

    fetchOptions();
  }, [id, activeStep, build?.structure, build?.status]);

  const handleInitialize = async () => {
    if (!id) return;
    setIsInitializing(true);
    setError(null);

    try {
      await api.initBuild(id);
      await fetchBuild();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError("Failed to initialize build");
      }
    } finally {
      setIsInitializing(false);
    }
  };

  const handleSelectOption = async (optionIndex: number) => {
    if (!id || !options[optionIndex] || transitionState !== "idle") return;

    const option = options[optionIndex];
    setSelectedOptionIndex(optionIndex);
    setConfirmedOption(option);
    setTransitionState("confirming");

    try {
      await api.selectOption(id, activeStep, option);

      // Refresh build state
      const response = await fetchBuild();

      // Show confirmation for a moment, then transition to next step
      setTimeout(() => {
        if (response?.build) {
          const totalSteps = response.build.structure?.components.length ?? 3;
          const nextStep = activeStep + 1;

          if (nextStep < totalSteps) {
            // Find next non-locked step
            let targetStep = nextStep;
            while (targetStep < totalSteps) {
              const comp = response.build.structure?.components.find(
                (c) => c.stepIndex === targetStep,
              );
              if (!comp?.isLocked && !comp?.isExisting) break;
              targetStep++;
            }

            if (targetStep < totalSteps) {
              // Set transitioning state - will stay until new options are loaded
              setTransitionState("transitioning");
              // Track step progression
              trackEvent("build_step", { buildId: id!, step: targetStep });
              // Navigate to next step - useEffect will fetch new options
              setSearchParams({ id: id!, step: targetStep.toString() });
            } else if (response.build.status === "completed") {
              trackEvent("build_completed", { buildId: id! });
              navigate(`/complete?id=${id}`);
            }
          } else if (response.build.status === "completed") {
            trackEvent("build_completed", { buildId: id! });
            navigate(`/complete?id=${id}`);
          }
        }
      }, 1000); // Time to show confirmation
    } catch (err) {
      if (err instanceof ApiClientError) {
        setOptionsError(err.message);
      } else {
        setOptionsError("Failed to save selection");
      }
      setSelectedOptionIndex(null);
      setConfirmedOption(null);
      setTransitionState("idle");
    }
  };

  const handleStepClick = (stepIndex: number) => {
    if (transitionState !== "idle") return;
    const component = build?.structure?.components.find(
      (c) => c.stepIndex === stepIndex,
    );
    if (component?.isLocked || component?.isExisting) return;

    // Reset state when manually changing steps
    setSelectedOptionIndex(null);
    setConfirmedOption(null);
    setOptions([]);
    // Track step navigation
    trackEvent("build_step", { buildId: id!, step: stepIndex });
    setSearchParams({ id: id!, step: stepIndex.toString() });
  };

  const handleNameUpdate = async (newName: string) => {
    if (!id) return;
    try {
      await api.updateBuildName(id, newName);
      setBuildName(newName);
    } catch (err) {
      console.error("Failed to update build name:", err);
      throw err;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-600">Loading your PC build...</p>
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
            {error || "This build does not exist."}
          </p>
          <Button onClick={() => navigate("/")}>Start New PC Build</Button>
        </div>
      </div>
    );
  }

  // Calculate budget info
  const spent = items.reduce((sum, item) => sum + (item.product_price || 0), 0);

  // Get current component for option selection
  const currentComponent = build.structure?.components.find(
    (c) => c.stepIndex === activeStep,
  );
  const isCurrentStepLocked =
    currentComponent?.isLocked || currentComponent?.isExisting;

  // Calculate overall progress
  const totalSteps = build.structure?.components.length ?? 0;
  const completedSteps = items.filter((i) => i.product_name != null).length;
  const progressPercent =
    totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  return (
    <div className="min-h-screen">
      {/* Overall Progress Bar */}
      <div className="h-1 bg-gray-200">
        <div
          className="h-full gradient-bg transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Build Header with Budget Widget */}
        {build.structure ? (
          <>
            <BuildHeader
              buildName={buildName}
              description={build.description}
              status={build.status}
              budgetMin={build.budget.min}
              budgetMax={build.budget.max}
              spent={spent}
              onNameUpdate={handleNameUpdate}
            />

            {/* Component Roadmap */}
            <div className="mt-8 mb-8 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <ComponentRoadmap
                components={build.structure.components}
                items={items}
                currentStep={activeStep}
                onStepClick={handleStepClick}
              />
            </div>

            {/* Current Component Context */}
            {currentComponent && !isCurrentStepLocked && (
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Select {currentComponent.componentType}
                </h2>
                <p className="text-gray-600">{currentComponent.description}</p>
              </div>
            )}

            {/* Main Content */}
            {isCurrentStepLocked ? (
              /* Locked Step Display */
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-amber-500 text-white rounded-full flex items-center justify-center">
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
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {currentComponent?.componentType}
                    </h3>
                    <p className="text-sm text-amber-700">
                      Already owned - locked
                    </p>
                  </div>
                </div>
                {currentComponent?.existingProduct && (
                  <div className="bg-white rounded-lg p-4 border border-amber-200">
                    <p className="font-medium text-gray-900">
                      {currentComponent.existingProduct.productName}
                    </p>
                    <p className="text-sm text-gray-500">
                      {currentComponent.existingProduct.brand}
                    </p>
                    <p className="text-sm text-gray-600 mt-2">
                      {currentComponent.existingProduct.keySpec}
                    </p>
                    <p className="font-semibold text-amber-700 mt-2">
                      ~$
                      {currentComponent.existingProduct.price?.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            ) : currentComponent ? (
              /* Option Selection UI */
              <div>
                {isLoadingOptions ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="text-center">
                      <Spinner size="lg" className="mx-auto mb-4" />
                      <p className="text-gray-600">
                        Finding the best parts for you...
                      </p>
                    </div>
                  </div>
                ) : optionsError ? (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                    <p className="text-red-700">{optionsError}</p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => window.location.reload()}
                    >
                      Try Again
                    </Button>
                  </div>
                ) : transitionState === "confirming" && confirmedOption ? (
                  /* Selection Confirmed State */
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center bg-white rounded-2xl shadow-lg border border-green-200 p-8 max-w-md animate-in zoom-in-95 duration-300">
                      <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg
                          className="w-8 h-8 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {currentComponent.componentType} Selected!
                      </h3>
                      <p className="text-gray-600 mb-4">
                        {confirmedOption.brand} {confirmedOption.productName}
                      </p>
                      <p className="text-2xl font-bold text-green-600">
                        ${confirmedOption.price.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-500 mt-4">
                        Moving to next part...
                      </p>
                    </div>
                  </div>
                ) : transitionState === "transitioning" ? (
                  /* Transitioning to next step */
                  <div className="flex items-center justify-center py-16 opacity-0 animate-out fade-out duration-300">
                    <Spinner size="lg" />
                  </div>
                ) : options.length > 0 ? (
                  <>
                    {/* Horizontal Product Cards with animation */}
                    <div
                      className={`grid grid-cols-1 md:grid-cols-3 gap-4 transition-all duration-300 ${
                        transitionState === "idle"
                          ? "opacity-100 translate-y-0"
                          : "opacity-0 translate-y-4"
                      }`}
                    >
                      {options.map((option, index) => (
                        <ProductCard
                          key={`${activeStep}-${index}`}
                          option={option}
                          isSelected={selectedOptionIndex === index}
                          onSelect={() =>
                            transitionState === "idle" &&
                            handleSelectOption(index)
                          }
                        />
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
                    <p className="text-gray-600">
                      No options available for this step.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
                <p className="text-gray-600">
                  Select a component from the roadmap above.
                </p>
              </div>
            )}
          </>
        ) : (
          /* No Structure Yet - Auto-initialize or show loading */
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <div className="w-16 h-16 bg-[var(--color-accent-surface)] rounded-full flex items-center justify-center mx-auto mb-4">
              {isInitializing ? (
                <Spinner size="lg" />
              ) : (
                <span className="text-3xl">🔧</span>
              )}
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {isInitializing
                ? "Analyzing Your Requirements"
                : "Ready to Start"}
            </h2>
            <p className="text-gray-600 mb-6">
              {isInitializing
                ? "AI is finding the best parts for your PC. This may take a few seconds..."
                : "Click below to start analyzing your PC build requirements."}
            </p>
            {!isInitializing && (
              <Button size="lg" onClick={handleInitialize}>
                Analyze My Build →
              </Button>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="mt-8 flex gap-4">
          <Button variant="outline" onClick={() => navigate("/")}>
            ← Start Over
          </Button>
          {build.status === "completed" && (
            <Button onClick={() => navigate(`/complete?id=${id}`)}>
              View Complete PC Build →
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default BuildPage;
