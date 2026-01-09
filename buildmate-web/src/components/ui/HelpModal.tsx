/**
 * HelpModal Component
 *
 * A comprehensive help modal with tabbed sections explaining how to use BuildMate.
 * Includes How It Works, Features, Tips, and FAQ sections.
 */

import { useState, useEffect, useCallback } from 'react';
import { Icon } from './Icon';
import { Button } from './Button';

const TOUR_COMPLETED_KEY = 'buildmate_tour_completed';

type TabId = 'how-it-works' | 'features' | 'tips' | 'faq';

interface Tab {
  id: TabId;
  label: string;
}

const tabs: Tab[] = [
  { id: 'how-it-works', label: 'How It Works' },
  { id: 'features', label: 'Features' },
  { id: 'tips', label: 'Tips' },
  { id: 'faq', label: 'FAQ' },
];

interface FAQItem {
  question: string;
  answer: string;
}

const faqItems: FAQItem[] = [
  {
    question: 'Can I go back and change my selections?',
    answer:
      'Yes, you can navigate back to any previous step by clicking on the completed step indicators at the top of the build page. Your previous selections will be highlighted.',
  },
  {
    question: 'How accurate are the prices shown?',
    answer:
      'Prices are estimates based on current market data. We recommend verifying prices on the retailer\'s website before making a purchase, as prices can change frequently.',
  },
  {
    question: 'Can I save multiple builds?',
    answer:
      'Yes, you can save as many builds as you want. Use "Save to Browser" to store builds locally, or "Download JSON" to export builds for backup or sharing.',
  },
  {
    question: 'What if I need different components?',
    answer:
      'Simply start a new build with different requirements. You can be more specific in your description to get different component recommendations.',
  },
  {
    question: 'How does the compatibility check work?',
    answer:
      'Our AI analyzes component specifications and common compatibility requirements to ensure all recommended parts work well together.',
  },
];

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestartTour?: () => void;
}

export function HelpModal({ isOpen, onClose, onRestartTour }: HelpModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('how-it-works');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Handle escape key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleRestartTour = useCallback(() => {
    localStorage.removeItem(TOUR_COMPLETED_KEY);
    onClose();
    if (onRestartTour) {
      onRestartTour();
    } else {
      // Reload the page to trigger the tour
      window.location.reload();
    }
  }, [onClose, onRestartTour]);

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-labelledby="help-title"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 id="help-title" className="text-lg font-semibold text-gray-900">
              How to Use BuildMate
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close help"
            >
              <Icon name="x" size="md" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200" role="tablist">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`panel-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600 -mb-px'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* How It Works */}
            {activeTab === 'how-it-works' && (
              <div id="panel-how-it-works" role="tabpanel">
                <ol className="space-y-6">
                  <li className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm">
                      1
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">
                        Describe Your Project
                      </h3>
                      <p className="text-sm text-gray-600">
                        Tell us what you want to build in your own words. Be as specific as
                        possible about your needs and use case.
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm">
                      2
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">
                        Set Your Budget
                      </h3>
                      <p className="text-sm text-gray-600">
                        Enter your minimum and maximum budget amounts. This helps our AI
                        recommend components that fit your price range.
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm">
                      3
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">
                        AI Generates Structure
                      </h3>
                      <p className="text-sm text-gray-600">
                        Our AI analyzes your requirements and determines the key components
                        you need for your build.
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm">
                      4
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">
                        Select Components
                      </h3>
                      <p className="text-sm text-gray-600">
                        For each component, choose from three options: Budget, Midrange, or
                        Premium. All options are verified for compatibility.
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm">
                      5
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">
                        Complete and Save
                      </h3>
                      <p className="text-sm text-gray-600">
                        Review your build summary, save it to your browser or download as
                        JSON, and get AI-generated assembly instructions.
                      </p>
                    </div>
                  </li>
                </ol>
              </div>
            )}

            {/* Features */}
            {activeTab === 'features' && (
              <div id="panel-features" role="tabpanel">
                <div className="grid gap-4">
                  <div className="flex gap-3 p-4 bg-gray-50 rounded-lg">
                    <Icon name="target" size="lg" className="text-blue-600 flex-shrink-0" aria-hidden />
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">Smart Recommendations</h3>
                      <p className="text-sm text-gray-600">
                        Our AI analyzes your specific needs to recommend the best components
                        for your project.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 p-4 bg-gray-50 rounded-lg">
                    <Icon name="check-circle" size="lg" className="text-green-600 flex-shrink-0" aria-hidden />
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">Compatibility Verified</h3>
                      <p className="text-sm text-gray-600">
                        All recommended parts are checked for compatibility, so you can build
                        with confidence.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 p-4 bg-gray-50 rounded-lg">
                    <Icon name="dollar" size="lg" className="text-purple-600 flex-shrink-0" aria-hidden />
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">Budget Tracking</h3>
                      <p className="text-sm text-gray-600">
                        Real-time budget tracking shows you exactly how much you're spending
                        as you select components.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 p-4 bg-gray-50 rounded-lg">
                    <Icon name="clipboard" size="lg" className="text-orange-600 flex-shrink-0" aria-hidden />
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">Assembly Guide</h3>
                      <p className="text-sm text-gray-600">
                        Get AI-generated step-by-step assembly instructions customized for
                        your specific build.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 p-4 bg-gray-50 rounded-lg">
                    <Icon name="save" size="lg" className="text-indigo-600 flex-shrink-0" aria-hidden />
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">Save and Export</h3>
                      <p className="text-sm text-gray-600">
                        Save builds to your browser for later, or export as JSON for backup
                        and sharing.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tips */}
            {activeTab === 'tips' && (
              <div id="panel-tips" role="tabpanel">
                <div className="space-y-4">
                  <div className="flex gap-3 p-4 border border-blue-200 bg-blue-50 rounded-lg">
                    <Icon name="lightbulb" size="md" className="text-blue-600 flex-shrink-0 mt-0.5" aria-hidden />
                    <div>
                      <h3 className="font-semibold text-blue-900 mb-1">Be Specific</h3>
                      <p className="text-sm text-blue-800">
                        The more detail you provide in your project description, the better
                        our AI can tailor recommendations to your needs.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 p-4 border border-blue-200 bg-blue-50 rounded-lg">
                    <Icon name="lightbulb" size="md" className="text-blue-600 flex-shrink-0 mt-0.5" aria-hidden />
                    <div>
                      <h3 className="font-semibold text-blue-900 mb-1">Set Realistic Budgets</h3>
                      <p className="text-sm text-blue-800">
                        Research typical prices for your project type before setting your
                        budget range to get the most useful recommendations.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 p-4 border border-blue-200 bg-blue-50 rounded-lg">
                    <Icon name="lightbulb" size="md" className="text-blue-600 flex-shrink-0 mt-0.5" aria-hidden />
                    <div>
                      <h3 className="font-semibold text-blue-900 mb-1">Consider All Tiers</h3>
                      <p className="text-sm text-blue-800">
                        Don't dismiss budget options automatically. Sometimes they offer the
                        best value for components that don't significantly impact performance.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 p-4 border border-blue-200 bg-blue-50 rounded-lg">
                    <Icon name="lightbulb" size="md" className="text-blue-600 flex-shrink-0 mt-0.5" aria-hidden />
                    <div>
                      <h3 className="font-semibold text-blue-900 mb-1">Use Refresh for Alternatives</h3>
                      <p className="text-sm text-blue-800">
                        If you don't like the initial recommendations, use the "Refresh
                        Options" button to get new suggestions.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* FAQ */}
            {activeTab === 'faq' && (
              <div id="panel-faq" role="tabpanel">
                <div className="space-y-2">
                  {faqItems.map((item, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleFaq(index)}
                        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                        aria-expanded={expandedFaq === index}
                      >
                        <span className="font-medium text-gray-900 pr-4">
                          {item.question}
                        </span>
                        <Icon
                          name={expandedFaq === index ? 'chevron-down' : 'chevron-right'}
                          size="sm"
                          className="text-gray-400 flex-shrink-0"
                          aria-hidden
                        />
                      </button>
                      {expandedFaq === index && (
                        <div className="px-4 pb-4 text-sm text-gray-600">
                          {item.answer}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={handleRestartTour}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Take the Tour Again
            </button>
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HelpModal;
