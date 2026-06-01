import type { TFunction } from "i18next";

interface MaybeApiError {
  code?: string;
  message?: string;
  status?: number;
}

/**
 * Translate an error thrown by api/client.ts (or anywhere) into a
 * user-facing localized string. Prefers the backend `error` code via the
 * `errors.codes.<code>` catalogue, then falls back to the raw message,
 * then to a generic catalogue fallback.
 *
 * `t` should be bound to the `errors` namespace (`useTranslation("errors")`).
 */
export function translateError(err: unknown, t: TFunction<"errors">): string {
  if (!err) return t("fallback");
  const e = err as MaybeApiError;
  if (e.code) {
    const localized = t(`codes.${e.code}` as never, {
      defaultValue: "",
    });
    if (localized) return localized;
  }
  if (e.message) return e.message;
  return t("fallback");
}
