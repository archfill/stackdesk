import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../api/client'
import type { ComposeApp } from '../types'

const APPS_QUERY_KEY = ['apps']

export function useApps() {
  return useQuery<ComposeApp[]>({
    queryKey: APPS_QUERY_KEY,
    queryFn: () => apiClient.listApps(),
    refetchInterval: 5000, // 5秒ごとに自動更新
  })
}

export function useStartApp() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (name: string) => apiClient.startApp(name),
    onSuccess: () => {
      // アプリ一覧を再取得
      queryClient.invalidateQueries({ queryKey: APPS_QUERY_KEY })
    },
  })
}

export function useStopApp() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (name: string) => apiClient.stopApp(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: APPS_QUERY_KEY })
    },
  })
}

export function useRestartApp() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (name: string) => apiClient.restartApp(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: APPS_QUERY_KEY })
    },
  })
}

export function useLogs(name: string) {
  return useQuery({
    queryKey: ['logs', name],
    queryFn: () => apiClient.getLogs(name),
    enabled: !!name, // nameが存在する場合のみクエリを実行
    refetchInterval: 2000, // 2秒ごとに自動更新
  })
}

export function useCheckUpdates(name: string) {
  return useQuery({
    queryKey: ['updates', name],
    queryFn: () => apiClient.checkUpdates(name),
    enabled: !!name,
  })
}

export function usePullImages() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (name: string) => apiClient.pullImages(name),
    onSuccess: (_data, name) => {
      // 更新チェックとアプリ一覧を再取得
      queryClient.invalidateQueries({ queryKey: ['updates', name] })
      queryClient.invalidateQueries({ queryKey: APPS_QUERY_KEY })
    },
  })
}
