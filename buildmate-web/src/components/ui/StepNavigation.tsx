/**
 * StepNavigation Component
 *
 * Navigation buttons for wizard flow (Back/Next)
 */

import { Button } from './Button';

interface StepNavigationProps {
  onBack?: () => void;
  canGoBack?: boolean;
  isLoading?: boolean;
  backLabel?: string;
}

export function StepNavigation({
  onBack,
  canGoBack = false,
  isLoading = false,
  backLabel = '← Back'
}: StepNavigationProps) {
  return (
    <div className="flex justify-between items-center pt-6 border-t border-gray-200">
      {/* Back Button */}
      {canGoBack && onBack ? (
        <Button
          onClick={onBack}
          variant="outline"
          disabled={isLoading}
          size="md"
        >
          {backLabel}
        </Button>
      ) : (
        <div />
      )}

      {/* Helper text */}
      <p className="text-sm text-gray-500 italic">
        {isLoading ? 'Processing...' : 'Select a product to continue'}
      </p>
    </div>
  );
}
