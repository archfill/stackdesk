import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../api/client";

const VERSION_KEY = ["app", "version"] as const;

export function useAppVersion() {
  return useQuery({
    queryKey: VERSION_KEY,
    queryFn: async () => {
      const res = await apiClient.version();
      return res.version;
    },
    staleTime: Infinity,
    retry: false,
  });
}
