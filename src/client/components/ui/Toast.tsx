/**
 * Toast Component
 *
 * Fixed position notification that auto-dismisses.
 */

import type { ToastState, ToastType } from "../../hooks/useToast";

interface ToastProps {
  toast: ToastState;
}

const typeStyles: Record<ToastType, string> = {
  success: "bg-green-600 text-white",
  error: "bg-red-600 text-white",
  info: "bg-gray-800 text-white",
};

const typeIcons: Record<ToastType, string> = {
  success: "✓",
  error: "✕",
  info: "ℹ",
};

export function Toast({ toast }: ToastProps) {
  if (!toast.isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 toast-enter">
      <div
        className={`
          flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg
          ${typeStyles[toast.type]}
        `}
        role="alert"
        aria-live="polite"
      >
        <span className="text-sm font-medium">{typeIcons[toast.type]}</span>
        <span className="text-sm font-medium">{toast.message}</span>
      </div>
    </div>
  );
}

export default Toast;
