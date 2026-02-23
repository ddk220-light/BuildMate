/**
 * ComponentRoadmap Component
 *
 * Horizontal stepper showing all build components with their states.
 * Replaces the vertical sidebar navigation.
 */

import type { BuildComponent, BuildItem } from "../../types/api";

interface ComponentRoadmapProps {
  components: BuildComponent[];
  items: BuildItem[];
  currentStep: number;
  onStepClick: (stepIndex: number) => void;
}

type StepState = "completed" | "current" | "upcoming" | "locked";

function getStepState(
  component: BuildComponent,
  item: BuildItem | undefined,
  currentStep: number,
): StepState {
  // Check if locked (existing item)
  if (component.isLocked || component.isExisting) {
    return "locked";
  }

  // Check if completed (has a selected product)
  if (item?.product_name) {
    if (component.stepIndex === currentStep) {
      return "current";
    }
    return "completed";
  }

  // Check if current
  if (component.stepIndex === currentStep) {
    return "current";
  }

  // Otherwise upcoming
  return "upcoming";
}

function getSelectedProductName(item: BuildItem | undefined): string | null {
  if (!item?.product_name) return null;
  // Truncate long names
  const name = item.product_name;
  return name.length > 20 ? `${name.substring(0, 18)}...` : name;
}

export function ComponentRoadmap({
  components,
  items,
  currentStep,
  onStepClick,
}: ComponentRoadmapProps) {
  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="flex items-center justify-between min-w-max px-4">
        {components.map((component, index) => {
          const item = items.find((i) => i.step_index === component.stepIndex);
          const state = getStepState(component, item, currentStep);
          const isLast = index === components.length - 1;
          const isClickable = state === "completed" || state === "current";
          const selectedProduct = getSelectedProductName(item);

          return (
            <div key={component.stepIndex} className="flex items-center">
              {/* Step Circle and Info */}
              <button
                type="button"
                onClick={() => isClickable && onStepClick(component.stepIndex)}
                disabled={!isClickable}
                className={`flex flex-col items-center min-w-[100px] transition-all ${
                  isClickable
                    ? "cursor-pointer hover:scale-105"
                    : "cursor-default"
                }`}
              >
                {/* Circle */}
                <div
                  className={`
                    relative w-10 h-10 rounded-full flex items-center justify-center
                    transition-all duration-300 font-semibold text-sm
                    ${state === "completed" ? "bg-green-500 text-white" : ""}
                    ${state === "current" ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white ring-4 ring-blue-100" : ""}
                    ${state === "upcoming" ? "border-2 border-gray-300 text-gray-400 bg-white" : ""}
                    ${state === "locked" ? "bg-amber-100 border-2 border-amber-400 text-amber-600" : ""}
                  `}
                >
                  {state === "completed" ? (
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
                  ) : state === "locked" ? (
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
                    component.stepIndex + 1
                  )}

                  {/* Pulsing animation for current step */}
                  {state === "current" && (
                    <span className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-25" />
                  )}
                </div>

                {/* Component Name */}
                <span
                  className={`
                    mt-2 text-xs font-medium text-center max-w-[90px] truncate
                    ${state === "current" ? "text-blue-600 font-semibold" : ""}
                    ${state === "completed" ? "text-gray-700" : ""}
                    ${state === "upcoming" ? "text-gray-400" : ""}
                    ${state === "locked" ? "text-amber-600" : ""}
                  `}
                  title={component.componentType}
                >
                  {component.componentType}
                </span>

                {/* Status/Selection */}
                <span
                  className={`
                    text-[10px] mt-0.5 max-w-[90px] truncate
                    ${state === "current" ? "text-blue-500" : "text-gray-400"}
                  `}
                  title={
                    selectedProduct ||
                    (state === "locked" ? "Owned" : undefined)
                  }
                >
                  {state === "locked"
                    ? "Owned"
                    : state === "current" && !selectedProduct
                      ? "Selecting..."
                      : selectedProduct || "Not selected"}
                </span>
              </button>

              {/* Connector Line */}
              {!isLast && (
                <div
                  className={`
                    h-0.5 w-12 mx-2 transition-all
                    ${state === "completed" || state === "locked" ? "bg-gradient-to-r from-green-400 to-green-500" : ""}
                    ${state === "current" ? "bg-gradient-to-r from-blue-400 to-gray-300" : ""}
                    ${state === "upcoming" ? "bg-gray-200 border-t border-dashed border-gray-300" : ""}
                  `}
                  style={
                    state === "upcoming"
                      ? { background: "none", borderTopWidth: "2px" }
                      : {}
                  }
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ComponentRoadmap;
