/**
 * Assembly Guide Component
 *
 * Displays step-by-step assembly instructions with warnings and tips.
 * Supports collapsible steps and print-friendly styling.
 */

import { useState } from "react";
import type { AssemblyInstructions } from "../../types/api";
import { Icon } from "./Icon";

interface AssemblyGuideProps {
  instructions: AssemblyInstructions;
}

export function AssemblyGuide({ instructions }: AssemblyGuideProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(
    new Set(instructions.steps.map((step) => step.stepNumber)),
  );

  const toggleStep = (stepNumber: number) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepNumber)) {
      newExpanded.delete(stepNumber);
    } else {
      newExpanded.add(stepNumber);
    }
    setExpandedSteps(newExpanded);
  };

  const expandAll = () => {
    setExpandedSteps(
      new Set(instructions.steps.map((step) => step.stepNumber)),
    );
  };

  const collapseAll = () => {
    setExpandedSteps(new Set());
  };

  const handlePrint = () => {
    // Expand all steps before printing
    expandAll();
    setTimeout(() => {
      window.print();
    }, 100);
  };

  return (
    <div className="assembly-guide bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {instructions.title}
        </h2>
        {instructions.estimatedTime && (
          <p className="text-sm text-gray-600">
            Estimated Time: {instructions.estimatedTime}
          </p>
        )}
        {instructions.overview && (
          <p className="mt-3 text-gray-700">{instructions.overview}</p>
        )}
      </div>

      {/* Controls */}
      <div className="mb-4 flex gap-3 print:hidden">
        <button
          onClick={expandAll}
          className="text-sm px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
        >
          Expand All
        </button>
        <button
          onClick={collapseAll}
          className="text-sm px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
        >
          Collapse All
        </button>
        <button
          onClick={handlePrint}
          className="text-sm px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition ml-auto inline-flex items-center gap-1.5"
        >
          <Icon name="print" size="sm" aria-hidden />
          Print Guide
        </button>
      </div>

      {/* Steps */}
      <div className="space-y-4">
        {instructions.steps.map((step) => {
          const isExpanded = expandedSteps.has(step.stepNumber);
          return (
            <div
              key={step.stepNumber}
              className="border border-gray-200 rounded-lg overflow-hidden print:border-gray-300 print:break-inside-avoid"
            >
              {/* Step Header */}
              <button
                onClick={() => toggleStep(step.stepNumber)}
                className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition text-left print:bg-white print:cursor-default"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                    {step.stepNumber}
                  </div>
                  <h3 className="font-semibold text-gray-900">{step.title}</h3>
                </div>
                <span className="text-gray-500 print:hidden">
                  <Icon
                    name={isExpanded ? "chevron-down" : "chevron-right"}
                    size="sm"
                    aria-hidden
                  />
                </span>
              </button>

              {/* Step Content */}
              {isExpanded && (
                <div className="p-4 space-y-4 print:block">
                  {/* Description */}
                  <p className="text-gray-700 leading-relaxed">
                    {step.description}
                  </p>

                  {/* Warnings */}
                  {step.warnings && step.warnings.length > 0 && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                      <div className="flex items-start gap-2">
                        <Icon
                          name="warning"
                          size="md"
                          className="text-yellow-600 flex-shrink-0 mt-0.5"
                          aria-hidden
                        />
                        <div className="flex-1">
                          <h4 className="font-semibold text-yellow-800 mb-2">
                            Warning
                          </h4>
                          <ul className="space-y-1 text-sm text-yellow-900">
                            {step.warnings.map((warning, idx) => (
                              <li key={idx} className="flex gap-2">
                                <span>•</span>
                                <span>{warning}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tips */}
                  {step.tips && step.tips.length > 0 && (
                    <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
                      <div className="flex items-start gap-2">
                        <Icon
                          name="lightbulb"
                          size="md"
                          className="text-blue-600 flex-shrink-0 mt-0.5"
                          aria-hidden
                        />
                        <div className="flex-1">
                          <h4 className="font-semibold text-blue-800 mb-2">
                            Tips
                          </h4>
                          <ul className="space-y-1 text-sm text-blue-900">
                            {step.tips.map((tip, idx) => (
                              <li key={idx} className="flex gap-2">
                                <span>•</span>
                                <span>{tip}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Final Checks */}
      {instructions.finalChecks && instructions.finalChecks.length > 0 && (
        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4 print:break-inside-avoid">
          <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
            <Icon
              name="check-circle"
              size="md"
              className="text-green-600"
              aria-hidden
            />
            Final Checks
          </h3>
          <ul className="space-y-2">
            {instructions.finalChecks.map((check, idx) => (
              <li key={idx} className="flex gap-2 text-sm text-green-900">
                <input
                  type="checkbox"
                  className="mt-0.5 print:appearance-none print:w-4 print:h-4 print:border print:border-gray-400"
                />
                <span>{check}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            background: white;
          }
          .assembly-guide {
            box-shadow: none;
            border: none;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
          .print\\:break-inside-avoid {
            break-inside: avoid;
          }
          .print\\:bg-white {
            background: white !important;
          }
          .print\\:cursor-default {
            cursor: default !important;
          }
          .print\\:border-gray-300 {
            border-color: #d1d5db !important;
          }
          /* Expand all steps for printing */
          .assembly-guide button + div {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}

export default AssemblyGuide;
