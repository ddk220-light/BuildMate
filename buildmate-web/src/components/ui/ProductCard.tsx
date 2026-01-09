/**
 * ProductCard Component
 *
 * Displays a product option with details and selection button
 */

import { Button } from './Button';
import { Badge } from './Badge';

export interface ProductOption {
  productName: string;
  brand: string;
  price: number;
  keySpec: string;
  compatibilityNote: string;
  reviewScore?: number;
  productUrl?: string;
  reviewUrl?: string;
  tier: 'budget' | 'midrange' | 'premium';
}

interface ProductCardProps {
  product: ProductOption;
  onSelect: () => void;
  isSelected?: boolean;
  isLoading?: boolean;
}

const tierConfig = {
  budget: { variant: 'success' as const, label: 'Budget' },
  midrange: { variant: 'primary' as const, label: 'Midrange' },
  premium: { variant: 'secondary' as const, label: 'Premium' },
};

export function ProductCard({ product, onSelect, isSelected = false, isLoading = false }: ProductCardProps) {
  const tierInfo = tierConfig[product.tier];

  return (
    <div
      className={`
        bg-white rounded-lg border-2 p-5 transition-all duration-200
        ${isSelected
          ? 'border-blue-500 ring-2 ring-blue-100 shadow-lg'
          : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
        }
      `.trim().replace(/\s+/g, ' ')}
    >
      {/* Header with Badge */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {product.productName}
          </h3>
          <p className="text-sm text-gray-600">{product.brand}</p>
        </div>
        <Badge variant={tierInfo.variant} size="sm">
          {tierInfo.label}
        </Badge>
      </div>

      {/* Price */}
      <div className="mb-3">
        <span className="text-2xl font-bold text-gray-900">
          ${product.price.toLocaleString()}
        </span>
      </div>

      {/* Key Specs */}
      <div className="mb-3">
        <p className="text-sm text-gray-700 line-clamp-2">
          {product.keySpec}
        </p>
      </div>

      {/* Compatibility Note */}
      <div className="mb-4">
        <p className="text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded px-2 py-1.5">
          ✓ {product.compatibilityNote}
        </p>
      </div>

      {/* Review Score */}
      {product.reviewScore !== undefined && product.reviewScore > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center">
            <span className="text-yellow-500">★</span>
            <span className="text-sm font-semibold text-gray-900 ml-1">
              {product.reviewScore.toFixed(1)}
            </span>
          </div>
          {product.reviewUrl && (
            <a
              href={product.reviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline"
            >
              See reviews
            </a>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          onClick={onSelect}
          isLoading={isLoading}
          variant={isSelected ? 'secondary' : 'primary'}
          size="md"
          className="flex-1"
        >
          {isSelected ? 'Selected ✓' : 'Select This'}
        </Button>
        {product.productUrl && (
          <a
            href={product.productUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            title="View product details"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}
      </div>
    </div>
  );
}
