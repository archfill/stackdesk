import { useState } from 'react';
import type { ComposeApp } from '../types';
import { apiClient } from '../api/client';

interface AppCardProps {
  app: ComposeApp;
  onRefresh: () => void;
  onViewLogs: (appName: string) => void;
  onCheckUpdates: (appName: string) => void;
}

export default function AppCard({ app, onRefresh, onViewLogs, onCheckUpdates }: AppCardProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleAction = async (action: () => Promise<void>) => {
    setIsLoading(true);
    try {
      await action();
      await new Promise((resolve) => setTimeout(resolve, 500));
      onRefresh();
    } catch (error) {
      console.error('Action failed:', error);
      alert(`操作に失敗しました: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = () => {
    switch (app.status) {
      case 'running':
        return 'bg-green-500';
      case 'stopped':
        return 'bg-gray-500';
      case 'error':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (app.status) {
      case 'running':
        return 'Running';
      case 'stopped':
        return 'Stopped';
      case 'error':
        return 'Error';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="flex items-center gap-4 bg-gray-800/50 px-4 py-3 rounded-lg hover:bg-gray-800 transition-colors duration-150">
      <input
        type="checkbox"
        className="size-4 rounded border-gray-600 bg-gray-700 text-primary focus:ring-primary focus:ring-offset-gray-900"
      />

      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium leading-normal truncate">
          {app.name}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <div className={`size-2 rounded-full ${getStatusColor()}`}></div>
        <p className="text-gray-300 text-sm font-normal leading-normal w-16">
          {getStatusText()}
        </p>
      </div>

      <div className="w-20">
        <p className="text-gray-300 text-sm font-normal leading-normal">
          {app.services.length} service{app.services.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="w-32">
        <p className="text-gray-400 text-sm font-normal leading-normal">
          {app.lastDeployed || '—'}
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => handleAction(() => apiClient.startApp(app.name))}
          disabled={isLoading || app.status === 'running'}
          className="flex items-center justify-center size-8 rounded-lg hover:bg-white/5 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Start"
        >
          <span className="material-symbols-outlined text-gray-400 text-xl">
            play_arrow
          </span>
        </button>

        <button
          onClick={() => handleAction(() => apiClient.stopApp(app.name))}
          disabled={isLoading || app.status === 'stopped'}
          className="flex items-center justify-center size-8 rounded-lg hover:bg-white/5 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Stop"
        >
          <span className="material-symbols-outlined text-gray-400 text-xl">
            stop
          </span>
        </button>

        <button
          onClick={() => handleAction(() => apiClient.restartApp(app.name))}
          disabled={isLoading}
          className="flex items-center justify-center size-8 rounded-lg hover:bg-white/5 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Restart"
        >
          <span className="material-symbols-outlined text-gray-400 text-xl">
            refresh
          </span>
        </button>

        <button
          onClick={() => onViewLogs(app.name)}
          className="flex items-center justify-center size-8 rounded-lg hover:bg-white/5 transition-colors duration-150"
          title="View Logs"
        >
          <span className="material-symbols-outlined text-gray-400 text-xl">
            description
          </span>
        </button>

        <button
          onClick={() => onCheckUpdates(app.name)}
          className="flex items-center justify-center size-8 rounded-lg hover:bg-white/5 transition-colors duration-150"
          title="Check for Updates"
        >
          <span className="material-symbols-outlined text-gray-400 text-xl">
            update
          </span>
        </button>
      </div>
    </div>
  );
}
