import { useState, useEffect } from 'react';
import type { ComposeApp } from '../types';
import { apiClient } from '../api/client';
import AppCard from './AppCard';
import LogViewer from './LogViewer';
import UpdateChecker from './UpdateChecker';

export default function AppList() {
  const [apps, setApps] = useState<ComposeApp[]>([]);
  const [filteredApps, setFilteredApps] = useState<ComposeApp[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAppForLogs, setSelectedAppForLogs] = useState<string | null>(null);
  const [selectedAppForUpdates, setSelectedAppForUpdates] = useState<string | null>(null);

  const fetchApps = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiClient.listApps();
      setApps(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch applications');
      console.error('Error fetching apps:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
    const interval = setInterval(fetchApps, 5000); // 5秒ごとに更新
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let filtered = apps;

    // ステータスフィルター
    if (statusFilter !== 'all') {
      filtered = filtered.filter((app) => app.status === statusFilter);
    }

    // 検索フィルター
    if (searchQuery) {
      filtered = filtered.filter((app) =>
        app.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredApps(filtered);
  }, [apps, statusFilter, searchQuery]);

  const statusFilters = [
    { id: 'all', label: 'All', icon: 'filter_list' },
    { id: 'running', label: 'Running', icon: 'check_circle', color: 'text-green-400' },
    { id: 'stopped', label: 'Stopped', icon: 'cancel', color: 'text-gray-400' },
    { id: 'error', label: 'Error', icon: 'error', color: 'text-orange-400' },
  ];

  if (selectedAppForLogs) {
    return (
      <LogViewer
        appName={selectedAppForLogs}
        onClose={() => setSelectedAppForLogs(null)}
      />
    );
  }

  if (selectedAppForUpdates) {
    return (
      <UpdateChecker
        appName={selectedAppForUpdates}
        onClose={() => setSelectedAppForUpdates(null)}
        onRefresh={fetchApps}
      />
    );
  }

  return (
    <main className="flex-1 p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-wrap justify-between items-center gap-4 mb-6">
          <h1 className="text-white text-4xl font-black leading-tight tracking-[-0.033em]">
            Applications
          </h1>
          <button className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-primary/90 transition-colors duration-150">
            <span className="material-symbols-outlined mr-2 text-base">add</span>
            <span className="truncate">Add Application</span>
          </button>
        </header>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <label className="flex flex-col min-w-40 h-12 w-full">
              <div className="flex w-full flex-1 items-stretch rounded-lg h-full bg-gray-800">
                <div className="text-gray-400 flex items-center justify-center pl-4">
                  <span className="material-symbols-outlined">search</span>
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-white focus:outline-0 focus:ring-0 border-none bg-transparent h-full placeholder:text-gray-400 px-4 pl-2 text-base font-normal leading-normal"
                  placeholder="Search by application name..."
                />
              </div>
            </label>
          </div>

          <div className="flex items-center gap-3 overflow-x-auto pb-2">
            {statusFilters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setStatusFilter(filter.id)}
                className={`flex h-12 shrink-0 cursor-pointer items-center justify-center gap-x-2 rounded-lg px-4 transition-colors duration-150 ${
                  statusFilter === filter.id
                    ? 'bg-primary/20'
                    : 'bg-gray-800 hover:bg-gray-700'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-base ${
                    filter.color || 'text-gray-300'
                  }`}
                >
                  {filter.icon}
                </span>
                <p
                  className={`text-sm font-medium leading-normal ${
                    statusFilter === filter.id ? 'text-white' : 'text-gray-300'
                  }`}
                >
                  {filter.label}
                </p>
              </button>
            ))}
          </div>
        </div>

        {isLoading && apps.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-gray-400 text-lg">Loading applications...</p>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-red-400 text-lg mb-2">Error loading applications</p>
              <p className="text-gray-400 text-sm">{error}</p>
              <button
                onClick={fetchApps}
                className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
              >
                Retry
              </button>
            </div>
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-gray-400 text-lg">
              {searchQuery || statusFilter !== 'all'
                ? 'No applications found matching your filters'
                : 'No Docker Compose applications running'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredApps.map((app) => (
              <AppCard
                key={app.name}
                app={app}
                onRefresh={fetchApps}
                onViewLogs={setSelectedAppForLogs}
                onCheckUpdates={setSelectedAppForUpdates}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
