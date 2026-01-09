/**
 * Home Page - Build Input Form
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Input, Textarea } from "../components/ui";
import { api, ApiClientError } from "../lib/api";

interface SavedBuild {
  id: string;
  savedAt: string;
  category: string;
  description: string;
  totalCost: number;
  items: Array<{ type: string; name: string; price: number }>;
}

const EXAMPLE_PROMPTS = [
  "A gaming PC for 1440p gaming",
  "Home theater system for my living room",
  "Smart home starter kit",
  "Budget workstation for video editing",
  "Streaming setup for beginners",
];

export function HomePage() {
  const navigate = useNavigate();
  const [description, setDescription] = useState("");
  const [budgetMin, setBudgetMin] = useState("500");
  const [budgetMax, setBudgetMax] = useState("1500");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedBuilds, setSavedBuilds] = useState<SavedBuild[]>([]);

  // Load saved builds from localStorage on mount
  useEffect(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem("buildmate_saved_builds") || "[]",
      );
      setSavedBuilds(saved);
    } catch (err) {
      console.error("Failed to load saved builds:", err);
    }
  }, []);

  const handleExampleClick = (example: string) => {
    setDescription(example);
  };

  const handleDeleteBuild = (buildId: string) => {
    const updated = savedBuilds.filter((b) => b.id !== buildId);
    localStorage.setItem("buildmate_saved_builds", JSON.stringify(updated));
    setSavedBuilds(updated);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const validateForm = (): boolean => {
    if (!description.trim()) {
      setError("Please describe what you want to build");
      return false;
    }

    const min = parseFloat(budgetMin);
    const max = parseFloat(budgetMax);

    if (isNaN(min) || isNaN(max)) {
      setError("Please enter valid budget amounts");
      return false;
    }

    if (min < 0 || max < 0) {
      setError("Budget cannot be negative");
      return false;
    }

    if (min >= max) {
      setError("Minimum budget must be less than maximum budget");
      return false;
    }

    setError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.createBuild({
        description: description.trim(),
        budgetMin: parseFloat(budgetMin),
        budgetMax: parseFloat(budgetMax),
      });

      navigate(`/build/${response.buildId}`);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError("Failed to create build. Please try again.");
      }
      console.error("Error creating build:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Hero Section */}
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Build Smarter with AI
        </h1>
        <p className="text-lg text-gray-600">
          Tell us what you want to build, and we'll guide you through selecting
          compatible components within your budget.
        </p>
      </div>

      {/* Build Input Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {/* Description Input */}
          <div className="mb-6">
            <label className="block text-lg font-medium text-gray-900 mb-2">
              What would you like to build?
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your project... e.g., 'A gaming PC that can run modern games at 4K with good ray tracing performance'"
              rows={4}
              className="text-lg"
            />
          </div>

          {/* Example Prompts */}
          <div className="mb-6">
            <p className="text-sm text-gray-500 mb-2">Try an example:</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_PROMPTS.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => handleExampleClick(example)}
                  className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          {/* Budget Range */}
          <div>
            <label className="block text-lg font-medium text-gray-900 mb-2">
              Budget Range
            </label>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    $
                  </span>
                  <Input
                    type="number"
                    value={budgetMin}
                    onChange={(e) => setBudgetMin(e.target.value)}
                    placeholder="Min"
                    min="0"
                    step="100"
                    className="pl-7"
                  />
                </div>
              </div>
              <span className="text-gray-400">to</span>
              <div className="flex-1">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    $
                  </span>
                  <Input
                    type="number"
                    value={budgetMax}
                    onChange={(e) => setBudgetMax(e.target.value)}
                    placeholder="Max"
                    min="0"
                    step="100"
                    className="pl-7"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          size="lg"
          isLoading={isLoading}
          className="w-full"
        >
          Start Building →
        </Button>
      </form>

      {/* Info Section */}
      <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl">🎯</span>
          </div>
          <h3 className="font-medium text-gray-900 mb-1">Smart Selection</h3>
          <p className="text-sm text-gray-500">
            AI picks the best components for your needs
          </p>
        </div>
        <div className="text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl">✓</span>
          </div>
          <h3 className="font-medium text-gray-900 mb-1">Compatible</h3>
          <p className="text-sm text-gray-500">
            All parts verified to work together
          </p>
        </div>
        <div className="text-center">
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl">💰</span>
          </div>
          <h3 className="font-medium text-gray-900 mb-1">Budget-Aware</h3>
          <p className="text-sm text-gray-500">
            Stays within your specified range
          </p>
        </div>
      </div>

      {/* Saved Builds Section */}
      {savedBuilds.length > 0 && (
        <div className="mt-10">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Your Saved Builds
          </h2>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-gray-200">
            {savedBuilds.map((build) => (
              <div
                key={build.id}
                className="p-4 flex items-center justify-between"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate">
                    {build.category}
                  </h3>
                  <p className="text-sm text-gray-500 truncate">
                    {build.description}
                  </p>
                </div>
                <div className="flex items-center gap-4 ml-4">
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      ${build.totalCost.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(build.savedAt)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/build/${build.id}/complete`)}
                    >
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteBuild(build.id)}
                      className="text-red-600 hover:text-red-700 hover:border-red-300"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default HomePage;
