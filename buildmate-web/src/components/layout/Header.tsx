/**
 * Header Component
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { Icon, HelpModal } from "../ui";

export function Header() {
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  return (
    <>
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">B</span>
              </div>
              <span className="text-xl font-bold text-gray-900">BuildMate</span>
            </Link>
            <nav className="flex items-center gap-4">
              <span className="text-sm text-gray-500 hidden sm:inline">
                AI-Powered Shopping Assistant
              </span>
              <button
                onClick={() => setIsHelpOpen(true)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Help"
                title="Help"
              >
                <Icon name="help-circle" size="md" />
              </button>
            </nav>
          </div>
        </div>
      </header>

      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </>
  );
}

export default Header;
