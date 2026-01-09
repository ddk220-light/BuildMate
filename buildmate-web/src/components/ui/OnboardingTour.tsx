/**
 * OnboardingTour Component
 *
 * A guided walkthrough for first-time users explaining how BuildMate works.
 * Uses localStorage to track completion and only shows once per user.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { Icon } from "./Icon";
import { Button } from "./Button";

const TOUR_COMPLETED_KEY = "buildmate_tour_completed";

interface TourStep {
  id: string;
  title: string;
  description: string;
  targetSelector?: string;
}

const tourSteps: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to BuildMate",
    description:
      "BuildMate is an AI-powered assistant that helps you build compatible product bundles within your budget. Let us show you how it works.",
  },
  {
    id: "description",
    title: "Describe What You Want to Build",
    description:
      'Tell us about your project in natural language. For example, "A gaming PC for 1440p gaming" or "Smart home starter kit". The more detail you provide, the better recommendations you\'ll get.',
    targetSelector: '[data-tour="description"]',
  },
  {
    id: "budget",
    title: "Set Your Budget Range",
    description:
      "Enter your minimum and maximum budget. Our AI will recommend components that fit within this range and help you get the best value for your money.",
    targetSelector: '[data-tour="budget"]',
  },
  {
    id: "analysis",
    title: "AI Analyzes Your Request",
    description:
      "Once you start, our AI will analyze your requirements and determine the key components you need. For most projects, we'll guide you through selecting 3 essential components.",
  },
  {
    id: "selection",
    title: "Choose Your Components",
    description:
      "For each component, you'll see 3 options: Budget, Midrange, and Premium. Each option is verified for compatibility and fits within your remaining budget.",
  },
  {
    id: "completion",
    title: "Complete Your Build",
    description:
      "After selecting all components, you'll get a summary with total cost, the option to save your build, and AI-generated assembly instructions.",
  },
];

interface OnboardingTourProps {
  onComplete: () => void;
}

export function OnboardingTour({ onComplete }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const step = tourSteps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === tourSteps.length - 1;

  // Compute highlight position from DOM - using useMemo to avoid setState in effect
  const highlightPosition = useMemo(() => {
    if (!step.targetSelector) return null;

    // This runs synchronously during render, which is fine for reading DOM
    const element = document.querySelector(step.targetSelector) as HTMLElement;
    if (!element) return null;

    return {
      top: element.offsetTop - 8,
      left: element.offsetLeft - 8,
      width: element.offsetWidth + 16,
      height: element.offsetHeight + 16,
    };
  }, [step.targetSelector]);

  // Handle scrolling to highlighted element
  useEffect(() => {
    if (step.targetSelector) {
      const element = document.querySelector(
        step.targetSelector,
      ) as HTMLElement;
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [step.targetSelector]);

  const handleNext = useCallback(() => {
    if (isLastStep) {
      localStorage.setItem(TOUR_COMPLETED_KEY, "true");
      onComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  }, [isLastStep, onComplete]);

  const handleSkip = useCallback(() => {
    localStorage.setItem(TOUR_COMPLETED_KEY, "true");
    onComplete();
  }, [onComplete]);

  const handleBack = useCallback(() => {
    if (!isFirstStep) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [isFirstStep]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleSkip();
      } else if (e.key === "Enter" || e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "ArrowLeft" && !isFirstStep) {
        handleBack();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSkip, handleNext, handleBack, isFirstStep]);

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 transition-opacity"
        onClick={handleSkip}
      />

      {/* Highlight overlay for targeted elements */}
      {highlightPosition && (
        <div
          className="absolute bg-white rounded-lg shadow-2xl ring-4 ring-blue-500 ring-offset-4 z-10 pointer-events-none"
          style={{
            top: highlightPosition.top,
            left: highlightPosition.left,
            width: highlightPosition.width,
            height: highlightPosition.height,
          }}
        />
      )}

      {/* Modal */}
      <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 pointer-events-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tour-title"
        >
          {/* Progress indicator */}
          <div className="flex justify-center gap-1.5 mb-6">
            {tourSteps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentStep
                    ? "bg-blue-500"
                    : index < currentStep
                      ? "bg-blue-300"
                      : "bg-gray-200"
                }`}
                aria-label={`Step ${index + 1} of ${tourSteps.length}`}
              />
            ))}
          </div>

          {/* Step icon */}
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center">
              {step.id === "welcome" && (
                <Icon
                  name="celebration"
                  size="lg"
                  className="text-blue-600"
                  aria-hidden
                />
              )}
              {step.id === "description" && (
                <Icon
                  name="clipboard"
                  size="lg"
                  className="text-blue-600"
                  aria-hidden
                />
              )}
              {step.id === "budget" && (
                <Icon
                  name="dollar"
                  size="lg"
                  className="text-blue-600"
                  aria-hidden
                />
              )}
              {step.id === "analysis" && (
                <Icon
                  name="wrench"
                  size="lg"
                  className="text-blue-600"
                  aria-hidden
                />
              )}
              {step.id === "selection" && (
                <Icon
                  name="check-circle"
                  size="lg"
                  className="text-blue-600"
                  aria-hidden
                />
              )}
              {step.id === "completion" && (
                <Icon
                  name="star-filled"
                  size="lg"
                  className="text-blue-600"
                  aria-hidden
                />
              )}
            </div>
          </div>

          {/* Content */}
          <h2
            id="tour-title"
            className="text-xl font-bold text-gray-900 text-center mb-3"
          >
            {step.title}
          </h2>
          <p className="text-gray-600 text-center mb-6 leading-relaxed">
            {step.description}
          </p>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleSkip}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Skip Tour
            </button>

            <div className="flex gap-2">
              {!isFirstStep && (
                <Button variant="outline" size="sm" onClick={handleBack}>
                  Back
                </Button>
              )}
              <Button size="sm" onClick={handleNext}>
                {isLastStep ? "Get Started" : "Next"}
              </Button>
            </div>
          </div>

          {/* Keyboard hint */}
          <p className="text-xs text-gray-400 text-center mt-4">
            Press Enter to continue, Esc to skip
          </p>
        </div>
      </div>
    </div>
  );
}

export default OnboardingTour;
