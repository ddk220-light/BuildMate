/**
 * BudgetTracker Component
 *
 * Displays budget information with progress bar and visual indicators
 */

interface BudgetTrackerProps {
  budgetMin: number;
  budgetMax: number;
  spent: number;
  remaining: number;
}

export function BudgetTracker({ budgetMin, budgetMax, spent, remaining }: BudgetTrackerProps) {
  const percentSpent = (spent / budgetMax) * 100;
  const isOverBudget = spent > budgetMax;
  const isUnderMinimum = spent < budgetMin;

  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Budget Tracker</h3>

      <div className="space-y-3">
        {/* Budget Range */}
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">Budget Range:</span>
          <span className="font-semibold text-gray-900">
            ${budgetMin.toLocaleString()} - ${budgetMax.toLocaleString()}
          </span>
        </div>

        {/* Spent */}
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">Total Spent:</span>
          <span className="font-semibold text-gray-900">
            ${spent.toLocaleString()}
          </span>
        </div>

        {/* Remaining */}
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">Remaining:</span>
          <span
            className={`font-semibold ${
              isOverBudget ? 'text-red-600' : 'text-green-600'
            }`}
          >
            ${Math.abs(remaining).toLocaleString()}
            {isOverBudget && ' over budget'}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="pt-2">
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                isOverBudget
                  ? 'bg-red-500'
                  : isUnderMinimum
                  ? 'bg-yellow-500'
                  : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(percentSpent, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>${budgetMin.toLocaleString()}</span>
            <span className="font-medium">
              {percentSpent.toFixed(0)}% of max budget
            </span>
            <span>${budgetMax.toLocaleString()}</span>
          </div>
        </div>

        {/* Warnings */}
        {isOverBudget && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
            ⚠️ You're over budget! Consider adjusting your selections.
          </div>
        )}
        {isUnderMinimum && !isOverBudget && (
          <div className="text-xs text-yellow-600 bg-yellow-50 border border-yellow-200 rounded px-2 py-1">
            ℹ️ You're under your minimum budget. You have room for upgrades!
          </div>
        )}
      </div>
    </div>
  );
}
