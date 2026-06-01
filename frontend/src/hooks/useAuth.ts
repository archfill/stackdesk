import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import type { AuthUser } from "../types";

const AUTH_KEY = ["auth", "me"] as const;
const SETUP_KEY = ["auth", "setup-status"] as const;

interface ApiError extends Error {
  status?: number;
}

export function useCurrentUser() {
  return useQuery({
    queryKey: AUTH_KEY,
    queryFn: async () => {
      try {
        const res = await apiClient.me();
        return res.user;
      } catch (err) {
        const apiErr = err as ApiError;
        if (apiErr.status === 401) return null;
        throw err;
      }
    },
    retry: false,
    staleTime: 30_000,
  });
}

export function useSetupStatus() {
  return useQuery({
    queryKey: SETUP_KEY,
    queryFn: () => apiClient.setupStatus(),
    retry: false,
    staleTime: 30_000,
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { username: string; password: string }) =>
      apiClient.login(vars.username, vars.password),
    onSuccess: (data) => {
      qc.setQueryData<AuthUser | null>(AUTH_KEY, data.user);
    },
  });
}

export function useSetup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { username: string; password: string }) =>
      apiClient.setup(vars.username, vars.password),
    onSuccess: (data) => {
      qc.setQueryData<AuthUser | null>(AUTH_KEY, data.user);
      qc.setQueryData(SETUP_KEY, { needsSetup: false });
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.logout(),
    onSuccess: () => {
      qc.setQueryData<AuthUser | null>(AUTH_KEY, null);
    },
  });
}
