/**
 * ProductCard Component
 *
 * Displays a product option with "Best for" functionality focus.
 * Redesigned for horizontal layout with differentiation text.
 */

import type { ProductOption } from "../../types/api";

interface ProductCardProps {
  option: ProductOption;
  isSelected?: boolean;
  onSelect?: () => void;
}

export function ProductCard({
  option,
  isSelected,
  onSelect,
}: ProductCardProps) {
  return (
    <div
      className={`
        relative bg-white rounded-xl border-2 p-5 transition-all duration-200 cursor-pointer
        flex flex-col h-full min-h-[200px]
        ${
          isSelected
            ? "border-[var(--color-accent)] ring-2 ring-[var(--color-accent-surface)] shadow-lg bg-[var(--color-accent-surface)]"
            : "border-gray-200 hover:border-[var(--color-border-accent)] hover:shadow-md hover:-translate-y-0.5"
        }
      `}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect?.();
        }
      }}
    >
      {/* Best For Badge */}
      <div className="mb-3">
        <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold bg-[var(--color-accent-surface)] text-[var(--color-accent)] border border-[var(--color-border-accent)]">
          <svg
            className="w-4 h-4 mr-1.5 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          Best for: {option.bestFor}
        </span>
      </div>

      {/* Product Name with Brand */}
      <h3 className="font-bold text-gray-900 text-lg leading-snug mb-2 line-clamp-2">
        {option.brand} {option.productName}
      </h3>

      {/* Differentiation Text */}
      <p className="text-sm text-gray-600 italic mb-4 flex-grow line-clamp-2">
        "{option.differentiationText || option.compatibilityNote}"
      </p>

      {/* Price and Selection */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-auto">
        <span className="text-2xl font-bold text-gray-900">
          ${option.price.toLocaleString()}
        </span>

        {/* Selection Indicator */}
        <div
          className={`
            w-7 h-7 rounded-full flex items-center justify-center transition-all
            ${
              isSelected
                ? "gradient-bg"
                : "border-2 border-gray-300 hover:border-[var(--color-accent)]"
            }
          `}
        >
          {isSelected && (
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProductCard;
