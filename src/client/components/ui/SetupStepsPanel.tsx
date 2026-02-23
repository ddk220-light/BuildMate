/**
 * Setup Steps Panel Component
 *
 * Slide-out panel displaying 3-5 functional setup steps for a completed build.
 * Steps group components by function (not one-by-one).
 */

import { useEffect, useRef, useState } from "react";
import type { SetupStep } from "../../types/api";
import { Spinner } from "./Spinner";

interface SetupStepsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  steps: SetupStep[] | null;
  isLoading: boolean;
  error: string | null;
}

export function SetupStepsPanel({
  isOpen,
  onClose,
  steps,
  isLoading,
  error,
}: SetupStepsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [isClosing, setIsClosing] = useState(false);

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

  // Trap focus within panel
  useEffect(() => {
    if (isOpen && panelRef.current) {
      const focusableElements = panelRef.current.querySelectorAll(
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

  // Prevent body scroll when panel is open
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

  if (!isOpen && !isClosing) return null;

  // Step number icons with circled numbers
  const stepIcons = ["①", "②", "③", "④", "⑤"];

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div
        className={`absolute inset-0 bg-black/30 backdrop-blur-sm ${isClosing ? "overlay-exit" : "overlay-enter"}`}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={`absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-[-4px_0_24px_rgba(0,0,0,0.15)] ${isClosing ? "drawer-exit" : "drawer-enter"}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="setup-steps-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full gradient-bg flex items-center justify-center">
              <span className="text-white text-lg">📋</span>
            </div>
            <h2
              id="setup-steps-title"
              className="text-xl font-bold text-gray-900"
            >
              Assembly Guide
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            aria-label="Close panel"
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

        {/* Content */}
        <div
          className="flex-1 overflow-y-auto p-6"
          style={{ maxHeight: "calc(100vh - 80px)" }}
        >
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-16">
              <Spinner size="lg" className="mb-4" />
              <p className="text-gray-500">Generating assembly guide...</p>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
              <p className="text-red-700">{error}</p>
              <button
                onClick={handleClose}
                className="mt-3 text-sm text-red-600 underline hover:text-red-700"
              >
                Close
              </button>
            </div>
          )}

          {!isLoading && !error && steps && (
            <div className="space-y-4">
              {steps.map((step, index) => (
                <div
                  key={step.stepNumber}
                  className="rounded-xl border border-gray-200 bg-white p-4 transition-all hover:shadow-md hover:border-gray-300"
                >
                  {/* Step Header */}
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-2xl text-[var(--color-accent)] leading-none">
                      {stepIcons[index] || `${step.stepNumber}.`}
                    </span>
                    <h3 className="font-semibold text-gray-900 text-lg leading-tight">
                      {step.title}
                    </h3>
                  </div>

                  {/* Description */}
                  <p className="text-gray-600 text-sm leading-relaxed mb-3 pl-9">
                    {step.description}
                  </p>

                  {/* Components Involved */}
                  <div className="pl-9 mb-2">
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-xs text-gray-500 mr-1">Uses:</span>
                      {step.componentsInvolved.map((component) => (
                        <span
                          key={component}
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
                        >
                          {component}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Tip */}
                  {step.tip && (
                    <div className="pl-9 mt-3">
                      <div className="flex items-start gap-2 rounded-lg bg-[var(--color-accent-surface)] border border-[var(--color-border-accent)] px-3 py-2">
                        <span className="text-sm leading-none mt-0.5">💡</span>
                        <p className="text-xs text-[var(--color-accent)] leading-relaxed">
                          {step.tip}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Footer note */}
              <div className="text-center pt-4 pb-2">
                <p className="text-xs text-gray-400">
                  Steps are tailored to your specific PC build
                </p>
              </div>
            </div>
          )}

          {!isLoading && !error && !steps && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 rounded-full bg-gray-100 p-4">
                <span className="text-2xl">📋</span>
              </div>
              <p className="text-gray-500">No assembly steps available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SetupStepsPanel;
