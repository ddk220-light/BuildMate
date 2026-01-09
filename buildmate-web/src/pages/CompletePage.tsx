/**
 * Build Completion Page
 */

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button, Spinner, Icon, AssemblyGuide } from "../components/ui";
import { api, ApiClientError } from "../lib/api";
import type { Build, BuildItem, AssemblyInstructions } from "../types/api";

export function CompletePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [build, setBuild] = useState<Build | null>(null);
  const [items, setItems] = useState<BuildItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [instructions, setInstructions] = useState<AssemblyInstructions | null>(
    null,
  );
  const [isLoadingInstructions, setIsLoadingInstructions] = useState(false);
  const [instructionsError, setInstructionsError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!id) return;

    const fetchBuild = async () => {
      try {
        const response = await api.getBuild(id);
        setBuild(response.build);
        setItems(response.items);
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

      // Check if already saved
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
      setSaveMessage("Build saved to browser storage!");
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      console.error("Failed to save build:", err);
      setSaveMessage("Failed to save build");
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
    } catch (err) {
      console.error("Failed to export build:", err);
    }
  };

  const handleGetInstructions = async () => {
    if (!id) return;

    setIsLoadingInstructions(true);
    setInstructionsError(null);

    try {
      const response = await api.getInstructions(id);
      setInstructions(response.instructions);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setInstructionsError(err.message);
      } else {
        setInstructionsError("Failed to generate assembly instructions");
      }
      console.error("Failed to get instructions:", err);
    } finally {
      setIsLoadingInstructions(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-600">Loading your build...</p>
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
          <Button onClick={() => navigate("/")}>Start New Build</Button>
        </div>
      </div>
    );
  }

  const totalCost = items.reduce(
    (sum, item) => sum + (item.product_price || 0),
    0,
  );
  const isUnderBudget = totalCost <= build.budget.max;
  const budgetDiff = Math.abs(build.budget.max - totalCost);

  return (
    <div className="max-w-3xl mx-auto">
      {/* Success Header */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Icon
            name="celebration"
            size="xl"
            className="text-green-600"
            aria-hidden
          />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Build Complete
        </h1>
        <p className="text-gray-600">
          {build.structure?.buildCategory || "Your Build"}
        </p>
      </div>

      {/* Build Summary */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Build Summary
        </h2>
        <p className="text-gray-600 mb-6">{build.description}</p>

        {/* Items List */}
        <div className="space-y-4">
          {items.map((item, index) => (
            <div
              key={item.id || index}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
                  {index + 1}
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {item.product_name || "Not selected"}
                  </p>
                  <p className="text-sm text-gray-500">
                    {item.component_type}
                    {item.product_brand && ` • ${item.product_brand}`}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">
                  ${item.product_price?.toLocaleString() || "—"}
                </p>
                {item.product_url && (
                  <a
                    href={item.product_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-500 hover:text-blue-600"
                  >
                    View Product
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-lg font-semibold text-gray-900">Total</span>
            <span className="text-2xl font-bold text-gray-900">
              ${totalCost.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">
              Budget: ${build.budget.min.toLocaleString()} - $
              {build.budget.max.toLocaleString()}
            </span>
            <span
              className={`font-medium inline-flex items-center gap-1 ${
                isUnderBudget ? "text-green-600" : "text-red-600"
              }`}
            >
              <Icon
                name={isUnderBudget ? "check" : "warning"}
                size="sm"
                aria-hidden
              />
              ${budgetDiff.toLocaleString()} {isUnderBudget ? "under" : "over"}{" "}
              budget
            </span>
          </div>
        </div>
      </div>

      {/* Save Message */}
      {saveMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          {saveMessage}
        </div>
      )}

      {/* Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h3 className="font-semibold text-gray-900 mb-4">Save Your Build</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Button variant="outline" onClick={handleSaveToLocal}>
            <Icon name="save" size="sm" className="mr-2" aria-hidden />
            Save to Browser
          </Button>
          <Button variant="outline" onClick={handleDownloadJSON}>
            <Icon name="download" size="sm" className="mr-2" aria-hidden />
            Download JSON
          </Button>
          <Button
            variant="outline"
            onClick={handleGetInstructions}
            disabled={isLoadingInstructions || !!instructions}
          >
            {isLoadingInstructions ? (
              <>
                <Spinner size="sm" className="inline mr-2" />
                Generating...
              </>
            ) : instructions ? (
              <>
                <Icon name="check" size="sm" className="mr-2" aria-hidden />
                Guide Ready
              </>
            ) : (
              <>
                <Icon name="clipboard" size="sm" className="mr-2" aria-hidden />
                Get Assembly Guide
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Instructions Error */}
      {instructionsError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {instructionsError}
        </div>
      )}

      {/* Assembly Instructions */}
      {instructions && (
        <div className="mb-6">
          <AssemblyGuide instructions={instructions} />
        </div>
      )}

      {/* Navigation */}
      <div className="mt-8 flex gap-4 justify-center">
        <Button variant="outline" onClick={() => navigate(`/build/${id}`)}>
          Back to Build
        </Button>
        <Button onClick={() => navigate("/")}>Start New Build</Button>
      </div>
    </div>
  );
}

export default CompletePage;
