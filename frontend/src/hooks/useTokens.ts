import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api/client";

const TOKENS_KEY = ["mcp-tokens"] as const;

export function useMCPTokens() {
  return useQuery({
    queryKey: TOKENS_KEY,
    queryFn: () => apiClient.listTokens().then((r) => r.tokens),
    staleTime: 30_000,
  });
}

export function useCreateMCPToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => apiClient.createToken(name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TOKENS_KEY });
    },
  });
}

export function useRevokeMCPToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.revokeToken(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TOKENS_KEY });
    },
  });
}
