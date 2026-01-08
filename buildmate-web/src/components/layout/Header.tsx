/**
 * Header Component
 */

import { Link } from 'react-router-dom';

export function Header() {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">B</span>
            </div>
            <span className="text-xl font-bold text-gray-900">BuildMate</span>
          </Link>
          <nav className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              AI-Powered Shopping Assistant
            </span>
          </nav>
        </div>
      </div>
    </header>
  );
}

export default Header;
