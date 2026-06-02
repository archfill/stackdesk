import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { apiClient } from "../api/client";
import type { ComposeApp } from "../types";

const APPS_QUERY_KEY = ["apps"];
const APPS_REFETCH_INTERVAL_MS = 5000;
const APPS_ERROR_REFETCH_INTERVAL_MS = 15000;

export function useApps() {
  return useQuery<ComposeApp[]>({
    queryKey: APPS_QUERY_KEY,
    queryFn: ({ signal }) => apiClient.listApps({ signal }),
    placeholderData: keepPreviousData,
    refetchInterval: (query) =>
      query.state.error
        ? APPS_ERROR_REFETCH_INTERVAL_MS
        : APPS_REFETCH_INTERVAL_MS,
    refetchIntervalInBackground: false,
    staleTime: APPS_REFETCH_INTERVAL_MS,
  });
}

export function useStartApp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => apiClient.startApp(name),
    onSuccess: () => {
      // アプリ一覧を再取得
      queryClient.invalidateQueries({ queryKey: APPS_QUERY_KEY });
    },
  });
}

export function useStopApp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => apiClient.stopApp(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: APPS_QUERY_KEY });
    },
  });
}

export function useRestartApp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => apiClient.restartApp(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: APPS_QUERY_KEY });
    },
  });
}

const LOGS_REFETCH_INTERVAL_MS = 3000;

export function useLogs(name: string, options?: { paused?: boolean }) {
  return useQuery({
    queryKey: ["logs", name],
    queryFn: () => apiClient.getLogs(name),
    enabled: !!name,
    refetchInterval: options?.paused ? false : LOGS_REFETCH_INTERVAL_MS,
    refetchIntervalInBackground: false,
  });
}

export function useCheckUpdates(name: string) {
  return useQuery({
    queryKey: ["updates", name],
    queryFn: () => apiClient.checkUpdates(name),
    enabled: !!name,
  });
}

export function usePullImages() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => apiClient.pullImages(name),
    onSuccess: (_data, name) => {
      // 更新チェックとアプリ一覧を再取得
      queryClient.invalidateQueries({ queryKey: ["updates", name] });
      queryClient.invalidateQueries({ queryKey: APPS_QUERY_KEY });
    },
  });
}
