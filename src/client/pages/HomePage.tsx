/**
 * Home Page - Redesigned Build Input Form
 * Compact layout with all inputs above the fold
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input, Textarea } from "../components/ui";
import { api, ApiClientError } from "../lib/api";
import { useTracking } from "../contexts/TrackingContext";

const EXAMPLE_PROMPTS = [
  "A gaming PC for 1440p that can run Cyberpunk",
  "A suitable dress set for a black tie dinner",
  "An astrophotography setup without a telescope",
  "A bike for occasional hiking tracks",
  "An electric skateboard for stunts",
];

export function HomePage() {
  const navigate = useNavigate();
  const { trackEvent } = useTracking();
  const [description, setDescription] = useState("");
  const [budgetMin, setBudgetMin] = useState("500");
  const [budgetMax, setBudgetMax] = useState("1500");
  const [existingItems, setExistingItems] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState<
    "creating" | "analyzing" | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [showExamples, setShowExamples] = useState(false);
  // Track partially created build for recovery
  const [pendingBuildId, setPendingBuildId] = useState<string | null>(null);

  const handleExampleClick = (example: string) => {
    setDescription(example);
    setShowExamples(false);
  };

  const validateForm = (): boolean => {
    if (!description.trim()) {
      setError("Please describe what you want to build");
      return false;
    }

    const min = parseFloat(budgetMin);
    const max = parseFloat(budgetMax);

    if (isNaN(min) || isNaN(max)) {
      setError("Please enter valid budget amounts");
      return false;
    }

    if (min < 0 || max < 0) {
      setError("Budget cannot be negative");
      return false;
    }

    if (min >= max) {
      setError("Minimum budget must be less than maximum budget");
      return false;
    }

    setError(null);
    return true;
  };

  // Retry initialization for a pending build
  const retryInit = async () => {
    if (!pendingBuildId) return;

    setIsLoading(true);
    setLoadingStage("analyzing");
    setError(null);

    try {
      await api.initBuild(pendingBuildId);
      trackEvent("build_started", { buildId: pendingBuildId });
      navigate(`/build?id=${pendingBuildId}&step=0`);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(
          `AI analysis failed: ${err.message}. You can try again or start a new build.`,
        );
      } else {
        setError("AI analysis failed. You can try again or start a new build.");
      }
      console.error("Error initializing build:", err);
    } finally {
      setIsLoading(false);
      setLoadingStage(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setLoadingStage("creating");
    setError(null);
    setPendingBuildId(null);

    try {
      // Step 1: Create the build
      const response = await api.createBuild({
        description: description.trim(),
        budgetMin: parseFloat(budgetMin),
        budgetMax: parseFloat(budgetMax),
        existingItemsText: existingItems.trim() || undefined,
      });

      // Track the build ID in case init fails
      setPendingBuildId(response.buildId);

      // Step 2: Initialize the build structure (AI analysis)
      setLoadingStage("analyzing");
      await api.initBuild(response.buildId);

      // Track build started event
      trackEvent("build_started", { buildId: response.buildId });

      // Success - clear pending state and navigate
      setPendingBuildId(null);
      navigate(`/build?id=${response.buildId}&step=0`);
    } catch (err) {
      if (err instanceof ApiClientError) {
        // Check if we failed during init (build was created but analysis failed)
        if (loadingStage === "analyzing" && pendingBuildId) {
          setError(`Build created but AI analysis failed: ${err.message}`);
        } else {
          setError(err.message);
          setPendingBuildId(null);
        }
      } else {
        setError("Failed to create build. Please try again.");
        setPendingBuildId(null);
      }
      console.error("Error creating build:", err);
    } finally {
      setIsLoading(false);
      setLoadingStage(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Compact Explainer Section */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold gradient-text mb-2">
          Build Smarter with AI
        </h1>
        <div className="mx-auto w-12 h-0.5 gradient-bg rounded-full mb-3" />
        <p className="text-gray-500">
          Describe what you want to build, set your budget, and get AI-selected
          compatible components.
        </p>
      </div>

      {/* Main Input Card */}
      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-2xl shadow-lg border-l-4 border-l-blue-500 p-6 md:p-8">
          {/* Two-column grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Left Column - 60% */}
            <div className="md:col-span-7 space-y-4">
              {/* Description Input */}
              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-900 mb-1.5"
                >
                  What would you like to build?
                </label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your project... e.g., 'A gaming PC for 1440p that can run Cyberpunk'"
                  rows={4}
                  className="w-full resize-none text-base"
                />
              </div>

              {/* Examples Toggle */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowExamples(!showExamples)}
                  className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors"
                >
                  <span>💡</span>
                  <span className="underline underline-offset-2">
                    {showExamples ? "Hide examples" : "See example prompts"}
                  </span>
                </button>

                {/* Collapsible Examples */}
                <div
                  className={`overflow-hidden transition-all duration-200 ease-out ${showExamples
                      ? "max-h-40 opacity-100 mt-3"
                      : "max-h-0 opacity-0"
                    }`}
                >
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex flex-wrap gap-2">
                      {EXAMPLE_PROMPTS.map((example) => (
                        <button
                          key={example}
                          type="button"
                          onClick={() => handleExampleClick(example)}
                          className="px-3 py-1.5 text-sm bg-white hover:bg-blue-50 text-gray-700 hover:text-blue-700 rounded-full border border-gray-200 hover:border-blue-200 transition-colors"
                        >
                          {example}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - 40% */}
            <div className="md:col-span-5 space-y-4">
              {/* Budget Range */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1.5">
                  Budget Range
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                      $
                    </span>
                    <Input
                      type="number"
                      value={budgetMin}
                      onChange={(e) => setBudgetMin(e.target.value)}
                      onFocus={(e) => e.target.select()}
                      placeholder="Min"
                      min="0"
                      step="100"
                      className="pl-6 text-sm"
                      aria-label="Minimum budget"
                    />
                  </div>
                  <span className="text-gray-400 text-sm">to</span>
                  <div className="flex-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                      $
                    </span>
                    <Input
                      type="number"
                      value={budgetMax}
                      onChange={(e) => setBudgetMax(e.target.value)}
                      onFocus={(e) => e.target.select()}
                      placeholder="Max"
                      min="0"
                      step="100"
                      className="pl-6 text-sm"
                      aria-label="Maximum budget"
                    />
                  </div>
                </div>
              </div>

              {/* Existing Components */}
              <div>
                <label
                  htmlFor="existing-items"
                  className="block text-sm font-medium text-gray-900 mb-1.5"
                >
                  Existing Components{" "}
                  <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <Textarea
                  id="existing-items"
                  value={existingItems}
                  onChange={(e) => setExistingItems(e.target.value)}
                  placeholder="Items you already have... e.g., NVIDIA RTX 4070, Corsair 750W PSU"
                  rows={3}
                  className="w-full resize-none text-sm"
                />
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
              {/* Show retry button if build was created but init failed */}
              {pendingBuildId && (
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={retryInit}
                    disabled={isLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
                  >
                    Retry AI Analysis
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPendingBuildId(null);
                      setError(null);
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                  >
                    Start Over
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Submit Button - Full Width */}
          <div className="mt-6">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full gradient-bg text-white font-semibold py-3.5 px-6 rounded-lg shadow-md hover:shadow-lg hover:scale-[1.02] transition-all duration-150 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isLoading ? (
                <span className="inline-flex items-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  {loadingStage === "creating" && "Creating build..."}
                  {loadingStage === "analyzing" &&
                    "AI analyzing your requirements..."}
                </span>
              ) : (
                "Start Building →"
              )}
            </button>
          </div>

          {/* Loading Progress Indicator */}
          {isLoading && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  {loadingStage === "creating" ? (
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-white animate-pulse"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                        />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-white animate-pulse"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                        />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900">
                    {loadingStage === "creating" && "Setting up your build..."}
                    {loadingStage === "analyzing" &&
                      "AI is determining the best components for your project"}
                  </p>
                  <p className="text-xs text-blue-600 mt-0.5">
                    {loadingStage === "creating" && "This takes just a moment"}
                    {loadingStage === "analyzing" &&
                      "This may take a few seconds"}
                  </p>
                </div>
              </div>
              {/* Progress dots */}
              <div className="flex gap-1.5 mt-3 justify-center">
                <div
                  className={`w-2 h-2 rounded-full ${loadingStage === "creating" || loadingStage === "analyzing" ? "bg-blue-500" : "bg-blue-200"}`}
                />
                <div
                  className={`w-2 h-2 rounded-full ${loadingStage === "analyzing" ? "bg-blue-500" : "bg-blue-200"}`}
                />
                <div className="w-2 h-2 rounded-full bg-blue-200" />
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}

export default HomePage;
