/**
 * Build Page - Step-by-step component selection wizard
 * Epic 5: Refactored for interactive wizard flow with navigation
 */

import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  Button,
  Spinner,
  BudgetTracker,
  ProductCard,
  ProgressStepper,
  StepNavigation,
  type ProductOption,
} from "../components/ui";
import { api, ApiClientError } from "../lib/api";
import type { Build, BuildItem } from "../types/api";

/**
 * Component for initializing the build structure
 */
function BuildStructureInitializer({
  buildId,
  onStructureGenerated,
}: {
  buildId: string;
  onStructureGenerated: () => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateStructure = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await api.initBuild(buildId);
      onStructureGenerated();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError("Failed to generate build structure. Please try again.");
      }
      console.error("Error generating structure:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="text-3xl">🔧</span>
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">
        Ready to Build
      </h2>
      <p className="text-gray-600 mb-6">
        Click the button below to have AI analyze your requirements and
        determine the components you{"'"}ll need.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <Button size="lg" isLoading={isLoading} onClick={handleGenerateStructure}>
        Generate Build Structure →
      </Button>
    </div>
  );
}

export function BuildPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Get current step from URL (default to 0)
  const currentStep = parseInt(searchParams.get("step") || "0");

  // State
  const [build, setBuild] = useState<Build | null>(null);
  const [items, setItems] = useState<BuildItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Wizard state
  const [stepOptions, setStepOptions] = useState<ProductOption[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [optionsError, setOptionsError] = useState<string | null>(null);

  // Fetch build data
  useEffect(() => {
    if (!id) return;

    const fetchBuild = async () => {
      try {
        const response = await api.getBuild(id);
        setBuild(response.build);
        setItems(response.items);
      } catch (err) {
        if (err instanceof ApiClientError) {
          setError(err.message);
        } else {
          setError("Failed to load build");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchBuild();
  }, [id]);

  // Fetch options for current step
  useEffect(() => {
    if (!build || !build.structure || build.status !== "in_progress") return;
    if (currentStep < 0 || currentStep > 2) return;

    const fetchOptions = async () => {
      setIsLoadingOptions(true);
      setOptionsError(null);

      try {
        const response = (await api.getStepOptions(
          id!,
          currentStep,
          false,
        )) as any;
        setStepOptions(response.options || []);
      } catch (err) {
        if (err instanceof ApiClientError) {
          setOptionsError(err.message);
        } else {
          setOptionsError("Failed to load product options");
        }
        console.error("Error fetching options:", err);
      } finally {
        setIsLoadingOptions(false);
      }
    };

    fetchOptions();
  }, [id, currentStep, build?.structure, build?.status]);

  // Handle product selection
  const handleSelectOption = async (product: ProductOption) => {
    if (!id) return;

    setIsSubmitting(true);

    try {
      await api.selectOption(id, currentStep, {
        productName: product.productName,
        brand: product.brand,
        price: product.price,
        keySpec: product.keySpec,
        compatibilityNote: product.compatibilityNote,
        tier: product.tier,
        productUrl: product.productUrl,
        reviewScore: product.reviewScore,
        reviewUrl: product.reviewUrl,
      });

      // Refresh build state
      const response = await api.getBuild(id);
      setBuild(response.build);
      setItems(response.items);

      // Navigate to next step or complete page
      if (currentStep < 2) {
        setSearchParams({ step: String(currentStep + 1) });
      } else {
        navigate(`/build/${id}/complete`);
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        alert(`Error: ${err.message}`);
      } else {
        alert("Failed to save selection. Please try again.");
      }
      console.error("Error selecting option:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle back navigation
  const handleGoBack = () => {
    if (currentStep > 0) {
      setSearchParams({ step: String(currentStep - 1) });
    }
  };

  // Handle refresh options
  const handleRefreshOptions = async () => {
    if (!id) return;

    setIsLoadingOptions(true);
    setOptionsError(null);

    try {
      const response = (await api.getStepOptions(id, currentStep, true)) as any;
      setStepOptions(response.options || []);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setOptionsError(err.message);
      } else {
        setOptionsError("Failed to refresh options");
      }
      console.error("Error refreshing options:", err);
    } finally {
      setIsLoadingOptions(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-600">Loading your build...</p>
        </div>
      </div>
    );
  }

  // Error state
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
          <Button onClick={() => navigate("/")}>Start New Build</Button>
        </div>
      </div>
    );
  }

  // No structure yet - show initializer
  if (!build.structure) {
    return (
      <div className="max-w-2xl mx-auto">
        <BuildStructureInitializer
          buildId={id!}
          onStructureGenerated={async () => {
            try {
              const response = await api.getBuild(id!);
              setBuild(response.build);
              setItems(response.items);
              setSearchParams({ step: "0" }); // Start at step 0
            } catch (err) {
              console.error("Error refreshing build:", err);
            }
          }}
        />
      </div>
    );
  }

  // Calculate budget
  const spent = items.reduce((sum, item) => sum + (item.product_price || 0), 0);
  const remaining = build.budget.max - spent;

  // Get completed steps
  const completedSteps = items
    .filter((item) => item.product_name != null)
    .map((item) => item.step_index);

  // Get current component info
  const currentComponent = build.structure.components[currentStep];

  // If build is completed, show completion view
  if (build.status === "completed") {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Build Complete!
          </h2>
          <p className="text-gray-600 mb-6">
            Your build is ready. View the complete summary and assembly
            instructions.
          </p>
          <Button onClick={() => navigate(`/build/${id}/complete`)}>
            View Complete Build →
          </Button>
        </div>
      </div>
    );
  }

  // Wizard view
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Progress Stepper */}
      <ProgressStepper
        currentStep={currentStep}
        totalSteps={3}
        completedSteps={completedSteps}
        onStepClick={(step) => {
          // Allow navigation to completed steps
          if (completedSteps.includes(step) || step <= currentStep) {
            setSearchParams({ step: String(step) });
          }
        }}
      />

      {/* Budget Tracker */}
      <BudgetTracker
        budgetMin={build.budget.min}
        budgetMax={build.budget.max}
        spent={spent}
        remaining={remaining}
      />

      {/* Component Selection Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {/* Component Info */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {currentComponent.componentType}
          </h2>
          <p className="text-gray-600">{currentComponent.description}</p>
        </div>

        {/* Options Loading */}
        {isLoadingOptions && (
          <div className="py-12 text-center">
            <Spinner size="lg" className="mx-auto mb-4" />
            <p className="text-gray-600">Loading product options...</p>
          </div>
        )}

        {/* Options Error */}
        {optionsError && !isLoadingOptions && (
          <div className="py-12 text-center">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-700">{optionsError}</p>
            </div>
            <Button onClick={() => handleRefreshOptions()}>Try Again</Button>
          </div>
        )}

        {/* Product Options Grid */}
        {!isLoadingOptions && !optionsError && stepOptions.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {stepOptions.map((option, index) => (
                <ProductCard
                  key={index}
                  product={option}
                  onSelect={() => handleSelectOption(option)}
                  isLoading={isSubmitting}
                />
              ))}
            </div>

            {/* Refresh Options Button */}
            <div className="text-center pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={handleRefreshOptions}
                disabled={isLoadingOptions || isSubmitting}
              >
                🔄 Get New Recommendations
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Step Navigation */}
      <StepNavigation
        onBack={handleGoBack}
        canGoBack={currentStep > 0}
        isLoading={isSubmitting}
      />

      {/* Quick Actions */}
      <div className="text-center pt-4">
        <Button variant="outline" size="sm" onClick={() => navigate("/")}>
          ← Start Over
        </Button>
      </div>
    </div>
  );
}

export default BuildPage;
