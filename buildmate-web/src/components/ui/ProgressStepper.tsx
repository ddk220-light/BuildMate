/**
 * ProgressStepper Component
 *
 * Visual indicator showing progress through multi-step wizard
 */

import { Icon } from "./Icon";

interface ProgressStepperProps {
  currentStep: number;
  totalSteps: number;
  onStepClick?: (step: number) => void;
  completedSteps?: number[];
}

export function ProgressStepper({
  currentStep,
  totalSteps,
  onStepClick,
  completedSteps = [],
}: ProgressStepperProps) {
  const steps = Array.from({ length: totalSteps }, (_, i) => i);

  const isCompleted = (step: number) => completedSteps.includes(step);
  const isCurrent = (step: number) => step === currentStep;
  const isClickable = (step: number) =>
    onStepClick && (isCompleted(step) || step <= currentStep);

  return (
    <div className="w-full">
      {/* Step Title */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Step {currentStep + 1} of {totalSteps}
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          {currentStep < totalSteps - 1
            ? "Select your component"
            : "Final component selection"}
        </p>
      </div>

      {/* Visual Stepper */}
      <div className="flex items-center justify-center">
        {steps.map((step, index) => (
          <div key={step} className="flex items-center">
            {/* Step Circle */}
            <button
              onClick={() => isClickable(step) && onStepClick?.(step)}
              disabled={!isClickable(step)}
              className={`
                relative flex items-center justify-center w-10 h-10 rounded-full border-2
                font-semibold text-sm transition-all duration-200
                ${
                  isCurrent(step)
                    ? "bg-blue-500 border-blue-500 text-white scale-110 shadow-lg"
                    : isCompleted(step)
                      ? "bg-green-500 border-green-500 text-white"
                      : "bg-white border-gray-300 text-gray-500"
                }
                ${
                  isClickable(step)
                    ? "cursor-pointer hover:scale-105"
                    : "cursor-not-allowed opacity-60"
                }
              `
                .trim()
                .replace(/\s+/g, " ")}
              aria-label={`Step ${step + 1}`}
              aria-current={isCurrent(step) ? "step" : undefined}
            >
              {isCompleted(step) ? (
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <span>{step + 1}</span>
              )}
            </button>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div
                className={`
                  w-12 sm:w-16 md:w-24 h-0.5 mx-1 transition-colors duration-200
                  ${
                    isCompleted(step) || step < currentStep
                      ? "bg-green-500"
                      : "bg-gray-300"
                  }
                `
                  .trim()
                  .replace(/\s+/g, " ")}
              />
            )}
          </div>
        ))}
      </div>

      {/* Mobile-friendly step labels */}
      <div className="flex justify-center gap-4 mt-4 text-xs text-gray-500">
        {steps.map((step) => (
          <span
            key={step}
            className={`
              ${isCurrent(step) ? "font-semibold text-blue-600" : ""}
              ${isCompleted(step) ? "text-green-600" : ""}
            `.trim()}
          >
            {isCompleted(step) ? (
              <Icon name="check" size="xs" aria-hidden />
            ) : (
              step + 1
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
