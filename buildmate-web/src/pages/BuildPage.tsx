/**
 * Build Page - Step-by-step component selection
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Spinner } from '../components/ui';
import { api, ApiClientError } from '../lib/api';
import type { Build, BuildItem } from '../types/api';

export function BuildPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [build, setBuild] = useState<Build | null>(null);
  const [items, setItems] = useState<BuildItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          setError('Failed to load build');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchBuild();
  }, [id]);

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
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Build Not Found
          </h2>
          <p className="text-gray-600 mb-6">{error || 'This build does not exist.'}</p>
          <Button onClick={() => navigate('/')}>Start New Build</Button>
        </div>
      </div>
    );
  }

  // Calculate budget info
  const spent = items.reduce((sum, item) => sum + (item.product_price || 0), 0);
  const remaining = build.budget.max - spent;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Build Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Your Build
            </h1>
            <p className="text-gray-600">{build.description}</p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              build.status === 'completed'
                ? 'bg-green-100 text-green-700'
                : build.status === 'in_progress'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            {build.status === 'in_progress' ? 'In Progress' : build.status}
          </span>
        </div>

        {/* Budget Tracker */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Budget</span>
            <span className="text-sm font-medium">
              ${build.budget.min.toLocaleString()} - ${build.budget.max.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Spent</span>
            <span className="text-sm font-medium">${spent.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Remaining</span>
            <span
              className={`text-sm font-medium ${
                remaining < 0 ? 'text-red-600' : 'text-green-600'
              }`}
            >
              ${remaining.toLocaleString()}
            </span>
          </div>
          {/* Progress Bar */}
          <div className="mt-3">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  spent > build.budget.max ? 'bg-red-500' : 'bg-blue-500'
                }`}
                style={{
                  width: `${Math.min((spent / build.budget.max) * 100, 100)}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Build Structure / Steps */}
      {build.structure ? (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Components ({build.structure.components.length})
          </h2>

          {build.structure.components.map((component, index) => {
            const item = items.find((i) => i.step_index === index);
            const isCurrentStep = index === build.currentStep;
            const isCompleted = item?.product_name != null;

            return (
              <div
                key={index}
                className={`bg-white rounded-xl shadow-sm border p-6 ${
                  isCurrentStep
                    ? 'border-blue-500 ring-2 ring-blue-100'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Step Number */}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isCompleted
                        ? 'bg-green-500 text-white'
                        : isCurrentStep
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {isCompleted ? (
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
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </div>

                  {/* Component Info */}
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {component.componentType}
                    </h3>
                    <p className="text-sm text-gray-500">{component.description}</p>

                    {/* Selected Product */}
                    {item?.product_name && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">
                              {item.product_name}
                            </p>
                            <p className="text-sm text-gray-500">
                              {item.product_brand}
                            </p>
                          </div>
                          <p className="font-semibold text-gray-900">
                            ${item.product_price?.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* No Structure Yet - Need to Initialize */
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🔧</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Ready to Build
          </h2>
          <p className="text-gray-600 mb-6">
            Click the button below to have AI analyze your requirements and
            determine the components you'll need.
          </p>
          <Button size="lg">Generate Build Structure →</Button>
          <p className="mt-4 text-sm text-gray-400">
            This feature is coming soon in Epic 3
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="mt-8 flex gap-4">
        <Button variant="outline" onClick={() => navigate('/')}>
          ← Start Over
        </Button>
        {build.status === 'completed' && (
          <Button onClick={() => navigate(`/build/${id}/complete`)}>
            View Complete Build →
          </Button>
        )}
      </div>
    </div>
  );
}

export default BuildPage;
