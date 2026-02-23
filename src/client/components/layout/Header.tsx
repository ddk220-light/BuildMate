/**
 * Header Component - with Your Builds drawer trigger
 */

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { BuildsDrawer } from "../ui/BuildsDrawer";
import { localStorageService } from "../../lib/localStorage";

export function Header() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [buildCount, setBuildCount] = useState(0);

  // Load build count on mount and when drawer closes
  useEffect(() => {
    const updateCount = () => {
      const builds = localStorageService.getAllBuilds();
      setBuildCount(builds.length);
    };
    updateCount();

    // Listen for storage changes (in case builds are added/removed in another tab)
    window.addEventListener("storage", updateCount);
    return () => window.removeEventListener("storage", updateCount);
  }, []);

  // Refresh count when drawer closes
  const handleDrawerClose = () => {
    setIsDrawerOpen(false);
    const builds = localStorageService.getAllBuilds();
    setBuildCount(builds.length);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-[var(--color-bg-card)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 gradient-bg rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">B</span>
              </div>
              <span className="text-xl font-bold text-gray-900">BuildMate</span>
            </Link>
            <nav className="flex items-center gap-4">
              <button
                onClick={() => setIsDrawerOpen(true)}
                className="relative inline-flex items-center gap-2 rounded-md border border-gray-200 bg-transparent px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:border-gray-300"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                  />
                </svg>
                My PC Builds
                {buildCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full gradient-bg text-xs font-medium text-white">
                    {buildCount > 9 ? "9+" : buildCount}
                  </span>
                )}
              </button>
            </nav>
          </div>
        </div>
        {/* Gradient bottom border */}
        <div className="h-0.5 gradient-border" />
      </header>

      <BuildsDrawer isOpen={isDrawerOpen} onClose={handleDrawerClose} />
    </>
  );
}

export default Header;
