/**
 * Toast Hook
 *
 * Manages toast notification state with auto-dismiss functionality.
 */

import { useState, useCallback, useRef } from "react";

export type ToastType = "success" | "error" | "info";

export interface ToastState {
  message: string;
  type: ToastType;
  isVisible: boolean;
}

export function useToast(duration: number = 2000) {
  const [toast, setToast] = useState<ToastState>({
    message: "",
    type: "success",
    isVisible: false,
  });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (message: string, type: ToastType = "success") => {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      setToast({ message, type, isVisible: true });

      timeoutRef.current = setTimeout(() => {
        setToast((prev) => ({ ...prev, isVisible: false }));
      }, duration);
    },
    [duration]
  );

  const hideToast = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setToast((prev) => ({ ...prev, isVisible: false }));
  }, []);

  return { toast, showToast, hideToast };
}

export default useToast;
