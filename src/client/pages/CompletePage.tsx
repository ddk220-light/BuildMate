/**
 * Build Completion Page
 *
 * Redesigned to fit on a single screen with receipt-style summary,
 * compact icon actions, and feedback via modal.
 */

import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Button,
  Spinner,
  ReceiptCard,
  Toast,
  FeedbackModal,
  SetupStepsPanel,
} from "../components/ui";
import { api, ApiClientError } from "../lib/api";
import { localStorageService, apiToLocalBuild } from "../lib/localStorage";
import { useToast } from "../hooks/useToast";
import { useTracking } from "../contexts/TrackingContext";
import { useTheme } from "../contexts/ThemeContext";
import type { Build, BuildItem, SetupStep } from "../types/api";

const FEEDBACK_STORAGE_KEY = "buildmate_feedback_status";

function getFeedbackStatus(buildId: string): "submitted" | "dismissed" | null {
  try {
    const data = localStorage.getItem(FEEDBACK_STORAGE_KEY);
    if (!data) return null;
    const status = JSON.parse(data);
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

export function CompletePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { trackEvent } = useTracking();
  const { detectAndApply } = useTheme();

  // Get build ID from query parameter
  const id = searchParams.get("id");
  const [build, setBuild] = useState<Build | null>(null);
  const [items, setItems] = useState<BuildItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showSetupPanel, setShowSetupPanel] = useState(false);
  const [setupSteps, setSetupSteps] = useState<SetupStep[] | null>(null);
  const [isLoadingSteps, setIsLoadingSteps] = useState(false);
  const [setupStepsError, setSetupStepsError] = useState<string | null>(null);
  const { toast, showToast } = useToast();
  const hasViewedGuide = useRef(false);

  useEffect(() => {
    if (!id) return;

    const fetchBuild = async () => {
      try {
        const response = await api.getBuild(id);
        setBuild(response.build);
        setItems(response.items);
        detectAndApply(response.build.description);
      } catch (err) {
        if (err instanceof ApiClientError) {
          setError(err.message);
        } else {
          setError("Failed to load build");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchBuild();
  }, [id]);

  const handleSaveToLocal = () => {
    if (!build) return;

    try {
      const savedBuilds = JSON.parse(
        localStorage.getItem("buildmate_saved_builds") || "[]",
      );

      const buildToSave = {
        id: build.id,
        savedAt: new Date().toISOString(),
        category: build.structure?.buildCategory || "Unknown",
        description: build.description,
        totalCost: items.reduce(
          (sum, item) => sum + (item.product_price || 0),
          0,
        ),
        items: items.map((item) => ({
          type: item.component_type,
          name: item.product_name,
          price: item.product_price,
        })),
      };

      const existingIndex = savedBuilds.findIndex(
        (b: { id: string }) => b.id === build.id,
      );
      if (existingIndex >= 0) {
        savedBuilds[existingIndex] = buildToSave;
      } else {
        savedBuilds.push(buildToSave);
      }

      localStorage.setItem(
        "buildmate_saved_builds",
        JSON.stringify(savedBuilds),
      );
      showToast("Saved to browser!", "success");
    } catch (err) {
      console.error("Failed to save build:", err);
      showToast("Failed to save", "error");
    }
  };

  const handleDownloadJSON = async () => {
    if (!id) return;

    try {
      const exportData = await api.exportBuild(id);
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `buildmate-${build?.structure?.buildCategory || "build"}-${
        new Date().toISOString().split("T")[0]
      }.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      trackEvent("build_exported", { buildId: id! });
      showToast("Downloaded!", "success");
    } catch (err) {
      console.error("Failed to export build:", err);
      showToast("Download failed", "error");
    }
  };

  const handleShare = async () => {
    if (!id || !build) return;

    const localBuild = localStorageService.getBuild(id);
    if (localBuild?.shareUrl) {
      await copyToClipboard(localBuild.shareUrl);
      trackEvent("build_shared", { buildId: id! });
      showToast("Link copied!", "success");
      return;
    }

    setIsSharing(true);
    try {
      const buildToShare = apiToLocalBuild(build, items);
      const response = await api.shareBuild(id, buildToShare);

      if (localBuild) {
        localStorageService.saveBuild({
          ...localBuild,
          shareUrl: response.shareUrl,
        });
      }

      await copyToClipboard(response.shareUrl);
      trackEvent("build_shared", { buildId: id! });
      showToast("Link copied!", "success");
    } catch (err) {
      console.error("Failed to share build:", err);
      showToast("Failed to share", "error");
    } finally {
      setIsSharing(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }
  };

  const handleViewSetupSteps = async () => {
    if (!id) return;

    // Open panel immediately
    setShowSetupPanel(true);
    setSetupStepsError(null);

    // If we already have steps, don't refetch
    if (setupSteps) return;

    setIsLoadingSteps(true);
    try {
      const response = await api.getSetupSteps(id);
      setSetupSteps(response.steps);
      hasViewedGuide.current = true;

      // Check if feedback should be shown (not already submitted/dismissed)
      const feedbackStatus = getFeedbackStatus(id);
      if (!feedbackStatus) {
        setTimeout(() => {
          setShowFeedbackModal(true);
        }, 5000);
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        setSetupStepsError(err.message);
      } else {
        setSetupStepsError("Failed to load setup steps");
      }
    } finally {
      setIsLoadingSteps(false);
    }
  };

  const handleFeedbackSubmit = async (feedback: string) => {
    if (!id) return;
    await api.submitFeedback(id, feedback);
    setFeedbackStatus(id, "submitted");
  };

  const handleFeedbackClose = () => {
    setShowFeedbackModal(false);
    if (id) {
      setFeedbackStatus(id, "dismissed");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-600">Loading your PC build...</p>
        </div>
      </div>
    );
  }

  if (error || !build) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Build Not Found
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={() => navigate("/")}>Start New PC Build</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Celebration Header */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3 celebration-pop">
          <span className="text-3xl">🎉</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold gradient-text mb-1">
          PC Build Complete!
        </h1>
        <p className="text-gray-500 text-lg">
          {build.structure?.buildCategory || "Your Build"}
        </p>
      </div>

      {/* Receipt Card */}
      <div className="fade-up mb-6">
        <ReceiptCard
          description={build.description}
          items={items}
          budgetMin={build.budget.min}
          budgetMax={build.budget.max}
          onSave={handleSaveToLocal}
          onDownload={handleDownloadJSON}
          onShare={handleShare}
          isSharing={isSharing}
        />
      </div>

      {/* Primary CTA - View Assembly Guide */}
      <div className="w-full max-w-[450px] mx-auto mb-4">
        <button
          onClick={handleViewSetupSteps}
          className="w-full h-14 flex items-center justify-center gap-2
            gradient-bg
            hover:opacity-90
            text-white font-semibold text-lg rounded-xl
            shadow-lg
            hover:shadow-xl
            hover:scale-[1.02]
            transition-all duration-200"
        >
          <span>📋</span>
          View Assembly Guide
        </button>
      </div>

      {/* Secondary Navigation */}
      <div className="w-full max-w-[450px] mx-auto flex gap-3">
        <Button
          variant="outline"
          onClick={() => navigate(`/build?id=${id}`)}
          className="flex-1"
        >
          ← Back to Build
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate("/")}
          className="flex-1"
        >
          Start New PC Build
        </Button>
      </div>

      {/* Toast Notifications */}
      <Toast toast={toast} />

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={showFeedbackModal}
        buildId={id!}
        onClose={handleFeedbackClose}
        onSubmit={handleFeedbackSubmit}
      />

      {/* Setup Steps Panel */}
      <SetupStepsPanel
        isOpen={showSetupPanel}
        onClose={() => setShowSetupPanel(false)}
        steps={setupSteps}
        isLoading={isLoadingSteps}
        error={setupStepsError}
      />
    </div>
  );
}

export default CompletePage;
