import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import enCommon from "./locales/en/common.json";
import enAuth from "./locales/en/auth.json";
import enApps from "./locales/en/apps.json";
import enTokens from "./locales/en/tokens.json";
import enUsers from "./locales/en/users.json";
import enErrors from "./locales/en/errors.json";

import jaCommon from "./locales/ja/common.json";
import jaAuth from "./locales/ja/auth.json";
import jaApps from "./locales/ja/apps.json";
import jaTokens from "./locales/ja/tokens.json";
import jaUsers from "./locales/ja/users.json";
import jaErrors from "./locales/ja/errors.json";

export const SUPPORTED_LANGUAGES = ["en", "ja"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LOCAL_STORAGE_KEY = "dm.lang";

export const resources = {
  en: {
    common: enCommon,
    auth: enAuth,
    apps: enApps,
    tokens: enTokens,
    users: enUsers,
    errors: enErrors,
  },
  ja: {
    common: jaCommon,
    auth: jaAuth,
    apps: jaApps,
    tokens: jaTokens,
    users: jaUsers,
    errors: jaErrors,
  },
} as const;

export const NAMESPACES = [
  "common",
  "auth",
  "apps",
  "tokens",
  "users",
  "errors",
] as const;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    ns: NAMESPACES as unknown as string[],
    defaultNS: "common",
    fallbackLng: "en",
    supportedLngs: SUPPORTED_LANGUAGES as unknown as string[],
    nonExplicitSupportedLngs: true,
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: LOCAL_STORAGE_KEY,
      caches: ["localStorage"],
    },
    returnNull: false,
  });

/**
 * Normalize an arbitrary language string (e.g. "ja-JP", "en_US") to one of the
 * supported short codes. Falls back to "en" when no match.
 */
export function normalizeLanguage(input?: string | null): SupportedLanguage {
  if (!input) return "en";
  const base = input.toLowerCase().split(/[-_]/)[0];
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(base)
    ? (base as SupportedLanguage)
    : "en";
}

export default i18n;
