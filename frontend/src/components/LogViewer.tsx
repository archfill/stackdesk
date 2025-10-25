import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';

interface LogViewerProps {
  appName: string;
  onClose: () => void;
}

export default function LogViewer({ appName, onClose }: LogViewerProps) {
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await apiClient.getLogs(appName);
        setLogs(data.logs || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch logs');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogs();
  }, [appName]);

  return (
    <main className="flex-1 p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center gap-4 mb-6">
          <div>
            <h1 className="text-white text-4xl font-black leading-tight tracking-[-0.033em]">
              Logs
            </h1>
            <p className="text-gray-400 text-lg mt-2">{appName}</p>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center h-10 px-4 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors duration-150"
          >
            <span className="material-symbols-outlined mr-2">arrow_back</span>
            Back
          </button>
        </header>

        <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm overflow-auto max-h-[calc(100vh-200px)]">
          {isLoading ? (
            <p className="text-gray-400">Loading logs...</p>
          ) : error ? (
            <p className="text-red-400">Error: {error}</p>
          ) : logs.length === 0 ? (
            <p className="text-gray-400">No logs available</p>
          ) : (
            <div className="space-y-1">
              {logs.map((log, index) => (
                <div key={index} className="text-gray-300">
                  {log}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
