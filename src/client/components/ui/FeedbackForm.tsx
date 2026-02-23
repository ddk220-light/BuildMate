/**
 * Feedback Form Component
 *
 * Collects anonymous user feedback on build completion.
 */

import { useState } from "react";
import { Button, Spinner } from "./index";

const MAX_CHARS = 1000;
const FEEDBACK_STORAGE_KEY = "buildmate_feedback_status";

interface FeedbackFormProps {
  buildId: string;
  onSubmit: (feedback: string) => Promise<void>;
}

interface FeedbackStatus {
  [buildId: string]: "submitted" | "dismissed";
}

function getFeedbackStatus(buildId: string): "submitted" | "dismissed" | null {
  try {
    const data = localStorage.getItem(FEEDBACK_STORAGE_KEY);
    if (!data) return null;
    const status = JSON.parse(data) as FeedbackStatus;
    return status[buildId] || null;
  } catch {
    return null;
  }
}

function setFeedbackStatus(buildId: string, status: "submitted" | "dismissed") {
  try {
    const data = localStorage.getItem(FEEDBACK_STORAGE_KEY);
    const existing = data ? JSON.parse(data) : {};
    existing[buildId] = status;
    localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(existing));
  } catch {
    console.error("Failed to save feedback status");
  }
}

export function FeedbackForm({ buildId, onSubmit }: FeedbackFormProps) {
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitted" | "dismissed">(
    () => getFeedbackStatus(buildId) || "idle"
  );
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!feedback.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(feedback.trim());
      setFeedbackStatus(buildId, "submitted");
      setStatus("submitted");
    } catch (err) {
      console.error("Failed to submit feedback:", err);
      setError("Failed to submit feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDismiss = () => {
    setFeedbackStatus(buildId, "dismissed");
    setStatus("dismissed");
  };

  // Already submitted
  if (status === "submitted") {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg
            className="w-6 h-6 text-green-600"
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
        <h3 className="font-semibold text-green-800 mb-1">Thank You!</h3>
        <p className="text-sm text-green-600">
          Your feedback helps us improve BuildMate.
        </p>
      </div>
    );
  }

  // Dismissed
  if (status === "dismissed") {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="font-semibold text-gray-900 mb-2">
        How was your experience?
      </h3>
      <p className="text-sm text-gray-500 mb-4">
        Your feedback helps us improve BuildMate for everyone.
      </p>

      <div className="relative">
        <textarea
          value={feedback}
          onChange={(e) => {
            if (e.target.value.length <= MAX_CHARS) {
              setFeedback(e.target.value);
            }
          }}
          placeholder="What did you like? What could be better? Any suggestions?"
          className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-focus)] focus:border-[var(--color-focus)] resize-none"
          disabled={isSubmitting}
        />
        <div className="absolute bottom-3 right-3 text-xs text-gray-400">
          {feedback.length}/{MAX_CHARS}
        </div>
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}

      <div className="mt-4 flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handleDismiss}
          disabled={isSubmitting}
        >
          Maybe Later
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || !feedback.trim()}
        >
          {isSubmitting ? (
            <>
              <Spinner size="sm" className="mr-2" />
              Submitting...
            </>
          ) : (
            "Submit Feedback"
          )}
        </Button>
      </div>
    </div>
  );
}

export default FeedbackForm;
