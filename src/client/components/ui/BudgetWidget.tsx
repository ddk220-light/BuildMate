/**
 * BudgetWidget Component
 *
 * Compact circular progress widget showing budget usage.
 * Replaces the inline budget table.
 */

import { useTheme } from '../../contexts/ThemeContext';

interface BudgetWidgetProps {
  budgetMin: number;
  budgetMax: number;
  spent: number;
  className?: string;
}

export function BudgetWidget({
  budgetMin,
  budgetMax,
  spent,
  className = "",
}: BudgetWidgetProps) {
  const { theme } = useTheme();

  // Theme-aware gradient colors for SVG (CSS vars don't work in SVG stop elements)
  const gradientColors = {
    neutral: { from: '#3b82f6', to: '#6366f1' },
    gaming: { from: '#06b6d4', to: '#d946ef' },
    creative: { from: '#f59e0b', to: '#e11d48' },
    budget: { from: '#059669', to: '#0d9488' },
  };
  const colors = gradientColors[theme];

  const remaining = budgetMax - spent;
  const isOverBudget = spent > budgetMax;
  const percentage = Math.min((spent / budgetMax) * 100, 100);

  // SVG circle properties
  const size = 120;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Colors based on budget status
  const progressColor = isOverBudget
    ? "url(#overBudgetGradient)"
    : "url(#normalGradient)";
  const remainingTextColor = isOverBudget ? "text-red-500" : "text-green-600";

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-gray-100 p-4 w-[220px] ${className}`}
    >
      <h3 className="text-sm font-medium text-gray-500 mb-3 text-center">
        Budget Tracker
      </h3>

      {/* Circular Progress */}
      <div className="relative flex items-center justify-center">
        <svg width={size} height={size} className="transform -rotate-90">
          <defs>
            <linearGradient
              id="normalGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor={colors.from} />
              <stop offset="100%" stopColor={colors.to} />
            </linearGradient>
            <linearGradient
              id="overBudgetGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="#EF4444" />
              <stop offset="100%" stopColor="#F97316" />
            </linearGradient>
          </defs>

          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#E5E7EB"
            strokeWidth={strokeWidth}
          />

          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={progressColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-500 ease-out"
          />
        </svg>

        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-gray-900">
            ${spent.toLocaleString()}
          </span>
          <span className="text-xs text-gray-500">spent</span>
        </div>
      </div>

      {/* Bottom Text */}
      <div className="mt-3 text-center">
        <p className={`text-sm font-semibold ${remainingTextColor}`}>
          {isOverBudget ? "-" : ""}${Math.abs(remaining).toLocaleString()}{" "}
          {isOverBudget ? "over" : "remaining"}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          of ${budgetMin.toLocaleString()} - ${budgetMax.toLocaleString()}
        </p>
      </div>
    </div>
  );
}

export default BudgetWidget;
