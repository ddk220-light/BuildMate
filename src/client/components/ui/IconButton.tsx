/**
 * Icon Button Component
 *
 * Small action buttons with icon, tooltip, and click feedback.
 */

import type { ButtonHTMLAttributes } from "react";
import { useState } from "react";
import { Spinner } from "./Spinner";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: string;
  label: string;
  successIcon?: string;
  isLoading?: boolean;
}

export function IconButton({
  icon,
  label,
  successIcon = "✓",
  isLoading = false,
  onClick,
  disabled,
  className = "",
  ...props
}: IconButtonProps) {
  const [showSuccess, setShowSuccess] = useState(false);

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || isLoading || showSuccess) return;

    if (onClick) {
      await onClick(e);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 1500);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isLoading}
      title={label}
      aria-label={label}
      className={`
        w-9 h-9 flex items-center justify-center
        rounded-lg text-gray-500
        transition-all duration-200
        hover:bg-gray-100 hover:text-gray-700
        active:scale-95
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      {...props}
    >
      {isLoading ? (
        <Spinner size="sm" />
      ) : showSuccess ? (
        <span className="text-green-600">{successIcon}</span>
      ) : (
        <span className="text-lg">{icon}</span>
      )}
    </button>
  );
}

export default IconButton;
