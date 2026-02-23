/**
 * Receipt Card Component
 *
 * Receipt-style build summary with item list, totals, and icon actions.
 */

import type { BuildItem } from "../../types/api";
import { IconButton } from "./IconButton";

interface ReceiptCardProps {
  description: string;
  items: BuildItem[];
  budgetMin: number;
  budgetMax: number;
  onSave: () => void;
  onDownload: () => void;
  onShare: () => void;
  isSharing?: boolean;
}

export function ReceiptCard({
  description,
  items,
  budgetMin,
  budgetMax,
  onSave,
  onDownload,
  onShare,
  isSharing = false,
}: ReceiptCardProps) {
  const totalCost = items.reduce(
    (sum, item) => sum + (item.product_price || 0),
    0
  );
  const isUnderBudget = totalCost <= budgetMax;
  const budgetDiff = isUnderBudget
    ? budgetMax - totalCost
    : totalCost - budgetMax;

  return (
    <div className="w-full max-w-[450px] mx-auto bg-white rounded-2xl border border-gray-200 shadow-[0_4px_24px_rgba(0,0,0,0.08)]">
      {/* Accent line at top */}
      <div className="h-1 rounded-t-2xl gradient-bg" />

      {/* Header with description and actions */}
      <div className="px-6 pt-5 pb-4 flex items-start justify-between gap-4">
        <p className="text-sm text-gray-500 italic line-clamp-2 flex-1">
          "{description}"
        </p>
        <div className="flex items-center gap-1 shrink-0">
          <IconButton icon="💾" label="Save to browser" onClick={onSave} />
          <IconButton icon="📄" label="Download as JSON" onClick={onDownload} />
          <IconButton
            icon="🔗"
            label="Copy share link"
            onClick={onShare}
            isLoading={isSharing}
          />
        </div>
      </div>

      {/* Divider */}
      <div className="mx-6 border-t border-gray-100" />

      {/* Items list */}
      <div className="px-6 py-4">
        {items.map((item, index) => (
          <div
            key={item.id || index}
            className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
          >
            {/* Number badge */}
            <div className="w-6 h-6 rounded-full gradient-bg flex items-center justify-center shrink-0">
              <span className="text-xs font-semibold text-white">
                {index + 1}
              </span>
            </div>

            {/* Item details */}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 text-[15px]">
                {item.component_type}
              </p>
              <p className="text-sm text-gray-500 truncate">
                {item.product_name || "Not selected"}
              </p>
            </div>

            {/* Price */}
            <p className="font-medium text-gray-900 text-[15px] tabular-nums shrink-0">
              ${item.product_price?.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }) || "—"}
            </p>
          </div>
        ))}
      </div>

      {/* Totals section */}
      <div className="mx-6 border-t border-dashed border-gray-200" />

      <div className="px-6 py-4 space-y-2">
        {/* Subtotal */}
        <div className="flex justify-between text-sm text-gray-500">
          <span>Subtotal ({items.length} items)</span>
          <span className="tabular-nums">
            ${totalCost.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>

        {/* Budget */}
        <div className="flex justify-between text-sm text-gray-500">
          <span>Budget</span>
          <span className="tabular-nums">
            ${budgetMin.toLocaleString()} – ${budgetMax.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Total separator */}
      <div className="mx-6 border-t-2 border-gray-200" />

      {/* Total */}
      <div className="px-6 py-4">
        <div className="flex justify-between items-baseline">
          <span className="text-lg font-bold text-gray-900 uppercase tracking-wide">
            Total
          </span>
          <span className="text-2xl font-bold text-gray-900 tabular-nums">
            ${totalCost.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>

        {/* Budget status */}
        <div className="mt-2 text-right">
          <span
            className={`text-sm font-medium ${
              isUnderBudget ? "text-green-600" : "text-red-500"
            }`}
          >
            {isUnderBudget ? "✓" : "⚠"} $
            {budgetDiff.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
            {isUnderBudget ? "under budget" : "over budget"}
          </span>
        </div>
      </div>
    </div>
  );
}

export default ReceiptCard;
