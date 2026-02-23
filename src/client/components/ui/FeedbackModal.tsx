/**
 * Feedback Modal Component
 *
 * Centered modal for collecting user feedback after viewing assembly guide.
 */

import { useState, useEffect, useRef } from "react";
import { Button } from "./Button";
import { Spinner } from "./Spinner";

const MAX_CHARS = 500;

interface FeedbackModalProps {
  isOpen: boolean;
  buildId: string;
  onClose: () => void;
  onSubmit: (feedback: string) => Promise<void>;
}

export function FeedbackModal({
  isOpen,
  buildId: _buildId,
  onClose,
  onSubmit,
}: FeedbackModalProps) {
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus trap and keyboard handling
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    // Focus textarea when modal opens
    setTimeout(() => textareaRef.current?.focus(), 100);

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  const handleSubmit = async () => {
    if (!feedback.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(feedback.trim());
      setIsSubmitted(true);
      setTimeout(() => {
        onClose();
        // Reset state for next time
        setFeedback("");
        setIsSubmitted(false);
      }, 1500);
    } catch (err) {
      console.error("Failed to submit feedback:", err);
      setError("Failed to submit feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay-enter"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.4)" }}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-modal-title"
    >
      <div
        ref={modalRef}
        className="w-full max-w-[480px] bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.15)] modal-enter"
        onClick={(e) => e.stopPropagation()}
      >
        {isSubmitted ? (
          // Thank you state
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Thank You!
            </h3>
            <p className="text-gray-500">
              Your feedback helps us improve BuildMate.
            </p>
          </div>
        ) : (
          // Feedback form
          <>
            {/* Header */}
            <div className="relative px-8 pt-8 pb-4">
              <button
                type="button"
                onClick={onClose}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                aria-label="Close"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
              <h2
                id="feedback-modal-title"
                className="text-xl font-semibold text-gray-900 text-center"
              >
                How was your experience?
              </h2>
              <p className="text-sm text-gray-500 text-center mt-2">
                Your feedback helps improve BuildMate
              </p>
            </div>

            {/* Content */}
            <div className="px-8 pb-6">
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={feedback}
                  onChange={(e) => {
                    if (e.target.value.length <= MAX_CHARS) {
                      setFeedback(e.target.value);
                    }
                  }}
                  placeholder="What did you like? What could be better?"
                  className="w-full h-28 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm"
                  disabled={isSubmitting}
                />
                <div className="absolute bottom-3 right-3 text-xs text-gray-400">
                  {feedback.length}/{MAX_CHARS}
                </div>
              </div>

              {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            </div>

            {/* Actions */}
            <div className="px-8 pb-8 flex items-center justify-between gap-4">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Maybe Later
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !feedback.trim()}
                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 border-0"
              >
                {isSubmitting ? (
                  <>
                    <Spinner size="sm" />
                    Sending...
                  </>
                ) : (
                  "Send Feedback"
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default FeedbackModal;
