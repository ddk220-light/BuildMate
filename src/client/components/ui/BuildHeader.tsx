/**
 * BuildHeader Component
 *
 * Compact header with build name (editable), status badge, and inline budget info.
 */

import { useState, useRef, useEffect } from "react";

interface BuildHeaderProps {
  buildName: string | null;
  description: string;
  status: "in_progress" | "completed" | "abandoned";
  budgetMin: number;
  budgetMax: number;
  spent: number;
  onNameUpdate?: (newName: string) => Promise<void>;
}

function getStatusBadge(status: string) {
  switch (status) {
    case "in_progress":
      return {
        label: "In Progress",
        className: "bg-[var(--color-accent-surface)] text-[var(--color-accent)] border-[var(--color-border-accent)]",
      };
    case "completed":
      return {
        label: "Completed",
        className: "bg-green-100 text-green-700 border-green-200",
      };
    case "abandoned":
      return {
        label: "Abandoned",
        className: "bg-gray-100 text-gray-600 border-gray-200",
      };
    default:
      return {
        label: status,
        className: "bg-gray-100 text-gray-600 border-gray-200",
      };
  }
}

export function BuildHeader({
  buildName,
  description,
  status,
  budgetMin,
  budgetMax,
  spent,
  onNameUpdate,
}: BuildHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(buildName || "");
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const statusBadge = getStatusBadge(status);
  const displayName = buildName || "Untitled Build";
  const remaining = budgetMax - spent;
  const isOverBudget = spent > budgetMax;
  const progressPercent = Math.min((spent / budgetMax) * 100, 100);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    setEditValue(buildName || "");
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!onNameUpdate || !editValue.trim()) {
      setIsEditing(false);
      return;
    }

    const trimmed = editValue.trim();
    if (trimmed === buildName) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onNameUpdate(trimmed);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to save build name:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(buildName || "");
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        {/* Build Name with Edit */}
        <div className="flex items-center gap-2 min-w-0 flex-shrink">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleSave}
                maxLength={50}
                className="text-xl font-bold text-gray-900 bg-white border border-[var(--color-border-accent)] rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] w-[200px]"
                disabled={isSaving}
              />
              {isSaving && (
                <div className="w-4 h-4 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
              )}
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-gray-900 truncate max-w-[300px]">
                {displayName}
              </h1>
              {onNameUpdate && (
                <button
                  type="button"
                  onClick={handleStartEdit}
                  className="p-1 text-gray-400 hover:text-[var(--color-accent)] transition-colors flex-shrink-0"
                  title="Rename build"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                    />
                  </svg>
                </button>
              )}
            </>
          )}

          {/* Status Badge */}
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border flex-shrink-0 ${statusBadge.className}`}
          >
            {statusBadge.label}
          </span>
        </div>

        {/* Divider */}
        <div className="hidden sm:block w-px h-8 bg-gray-200" />

        {/* Compact Budget Info */}
        <div className="flex items-center gap-4 flex-shrink-0">
          {/* Spent */}
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">
              ${spent.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">spent</div>
          </div>

          {/* Mini Progress Bar */}
          <div className="w-24">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  isOverBudget
                    ? "bg-gradient-to-r from-red-400 to-red-500"
                    : "gradient-bg"
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5 text-center">
              ${budgetMin.toLocaleString()} - ${budgetMax.toLocaleString()}
            </div>
          </div>

          {/* Remaining */}
          <div className="text-center">
            <div
              className={`text-lg font-bold ${isOverBudget ? "text-red-500" : "text-green-600"}`}
            >
              {isOverBudget ? "-" : ""}${Math.abs(remaining).toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">
              {isOverBudget ? "over" : "left"}
            </div>
          </div>
        </div>

        {/* Description - Full Width Below on Small Screens */}
        <div className="w-full sm:hidden">
          <p
            className="text-gray-500 text-sm line-clamp-1 mt-1"
            title={description}
          >
            {description}
          </p>
        </div>
      </div>

      {/* Description - Inline on Larger Screens */}
      <p
        className="hidden sm:block text-gray-500 text-sm line-clamp-1 mt-2"
        title={description}
      >
        {description}
      </p>
    </div>
  );
}

export default BuildHeader;
