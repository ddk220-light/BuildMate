/**
 * 404 Not Found Page
 */

import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-5xl">🔍</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Page Not Found</h1>
        <p className="text-gray-600 mb-8">
          Sorry, we couldn't find the page you're looking for. It might have
          been moved or doesn't exist.
        </p>
        <Button onClick={() => navigate('/')} size="lg">
          Go to Home
        </Button>
      </div>
    </div>
  );
}

export default NotFoundPage;
