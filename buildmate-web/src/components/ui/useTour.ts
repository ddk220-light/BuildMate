/**
 * useTour Hook
 *
 * Manages the onboarding tour state.
 * Separated from OnboardingTour component for fast refresh compatibility.
 */

import { useState, useEffect, useCallback } from 'react';

const TOUR_COMPLETED_KEY = 'buildmate_tour_completed';

export function useTour() {
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    const tourCompleted = localStorage.getItem(TOUR_COMPLETED_KEY);
    if (!tourCompleted) {
      // Small delay to let the page render first
      const timer = setTimeout(() => setShowTour(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const completeTour = useCallback(() => {
    setShowTour(false);
  }, []);

  const resetTour = useCallback(() => {
    localStorage.removeItem(TOUR_COMPLETED_KEY);
    setShowTour(true);
  }, []);

  return { showTour, completeTour, resetTour };
}
