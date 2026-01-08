/**
 * Footer Component
 */

export function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} BuildMate. All rights reserved.
          </p>
          <p className="text-sm text-gray-400">
            AI recommendations may not be 100% accurate. Please verify compatibility before purchasing.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
