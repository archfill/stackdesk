import { useState, useEffect } from 'react';
import type { ImageUpdate } from '../types';
import { apiClient } from '../api/client';

interface UpdateCheckerProps {
  appName: string;
  onClose: () => void;
  onRefresh: () => void;
}

export default function UpdateChecker({ appName, onClose, onRefresh }: UpdateCheckerProps) {
  const [updates, setUpdates] = useState<ImageUpdate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPulling, setIsPulling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUpdates = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await apiClient.checkUpdates(appName);
        setUpdates(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to check for updates');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUpdates();
  }, [appName]);

  const handlePullImages = async () => {
    try {
      setIsPulling(true);
      await apiClient.pullImages(appName);
      alert('Images pulled successfully! Please restart the application to use the new images.');
      onRefresh();
      onClose();
    } catch (err) {
      alert(`Failed to pull images: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsPulling(false);
    }
  };

  const hasUpdates = updates.some((update) => update.updateRequired);

  return (
    <main className="flex-1 p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center gap-4 mb-6">
          <div>
            <h1 className="text-white text-4xl font-black leading-tight tracking-[-0.033em]">
              Image Updates
            </h1>
            <p className="text-gray-400 text-lg mt-2">{appName}</p>
          </div>
          <div className="flex gap-3">
            {hasUpdates && (
              <button
                onClick={handlePullImages}
                disabled={isPulling}
                className="flex items-center justify-center h-10 px-4 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors duration-150 disabled:opacity-50"
              >
                <span className="material-symbols-outlined mr-2">download</span>
                {isPulling ? 'Pulling...' : 'Pull Images'}
              </button>
            )}
            <button
              onClick={onClose}
              className="flex items-center justify-center h-10 px-4 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors duration-150"
            >
              <span className="material-symbols-outlined mr-2">arrow_back</span>
              Back
            </button>
          </div>
        </header>

        <div className="bg-gray-800/50 rounded-lg p-6">
          {isLoading ? (
            <p className="text-gray-400">Checking for updates...</p>
          ) : error ? (
            <p className="text-red-400">Error: {error}</p>
          ) : updates.length === 0 ? (
            <div className="text-center py-8">
              <span className="material-symbols-outlined text-green-400 text-6xl mb-4">
                check_circle
              </span>
              <p className="text-white text-lg">All images are up to date!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {updates.map((update, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="text-white font-medium">{update.serviceName}</p>
                    <p className="text-gray-400 text-sm mt-1">{update.currentImage}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {update.updateRequired ? (
                      <div className="flex items-center gap-2 text-orange-400">
                        <span className="material-symbols-outlined">warning</span>
                        <span className="text-sm font-medium">Update Available</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-green-400">
                        <span className="material-symbols-outlined">check_circle</span>
                        <span className="text-sm font-medium">Up to date</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
