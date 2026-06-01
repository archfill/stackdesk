import { useCallback, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import i18n, {
  LOCAL_STORAGE_KEY,
  type SupportedLanguage,
  SUPPORTED_LANGUAGES,
  normalizeLanguage,
} from "../i18n";
import { apiClient } from "../api/client";
import type { AuthUser } from "../types";
import { useCurrentUser } from "./useAuth";

const AUTH_KEY = ["auth", "me"] as const;

/**
 * useLocale
 *
 * Returns the current language plus a setter that:
 *  - immediately switches i18next and persists to localStorage
 *  - while signed in, also PATCHes /api/auth/me/language so the choice
 *    follows the user across devices/browsers
 *
 * Reading priority on mount/login:
 *  - DB value from /me (authoritative)
 *  - localStorage (set by detector)
 *  - navigator.language → fallback en
 */
export function useLocale() {
  const user = useCurrentUser();
  const qc = useQueryClient();

  // Sync the DB value back into i18next once /me resolves.
  useEffect(() => {
    if (!user.data) return;
    const fromUser = normalizeLanguage(user.data.language);
    if (i18n.resolvedLanguage !== fromUser) {
      void i18n.changeLanguage(fromUser);
      localStorage.setItem(LOCAL_STORAGE_KEY, fromUser);
    }
  }, [user.data]);

  const persist = useMutation({
    mutationFn: (next: SupportedLanguage) => apiClient.updateMyLanguage(next),
    onSuccess: (res) => {
      qc.setQueryData<AuthUser | null>(AUTH_KEY, res.user);
    },
  });

  const setLocale = useCallback(
    async (next: SupportedLanguage) => {
      const normalized = normalizeLanguage(next);
      if (i18n.resolvedLanguage !== normalized) {
        await i18n.changeLanguage(normalized);
      }
      localStorage.setItem(LOCAL_STORAGE_KEY, normalized);
      if (user.data) {
        try {
          await persist.mutateAsync(normalized);
        } catch (err) {
          // Keep the local switch in place; surface the error through the mutation.
          console.warn("Failed to persist language to backend:", err);
        }
      }
    },
    [user.data, persist],
  );

  return {
    locale: normalizeLanguage(i18n.resolvedLanguage),
    setLocale,
    isPersisting: persist.isPending,
    supported: SUPPORTED_LANGUAGES,
  } as const;
}
