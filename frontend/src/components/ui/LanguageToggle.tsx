import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useLocale } from "../../hooks/useLocale";
import { cn } from "../../lib/utils";
import type { SupportedLanguage } from "../../i18n";

interface LanguageToggleProps {
  /** Compact (icon-only) for tight footers vs default labelled chips. */
  compact?: boolean;
  className?: string;
}

const ORDER: SupportedLanguage[] = ["en", "ja"];

export function LanguageToggle({ compact, className }: LanguageToggleProps) {
  const { t } = useTranslation("common");
  const { locale, setLocale, isPersisting } = useLocale();

  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-[3px] border border-[color:var(--color-rule)] bg-[color:var(--color-ink-1)] p-0.5",
        className,
      )}
      aria-label={t("language.label")}
    >
      {!compact && (
        <Languages
          className="mx-1 size-[12px] text-[color:var(--color-text-3)]"
          strokeWidth={1.6}
          aria-hidden
        />
      )}
      {ORDER.map((code) => {
        const active = locale === code;
        return (
          <button
            key={code}
            onClick={() => {
              if (!active) void setLocale(code);
            }}
            disabled={isPersisting}
            aria-pressed={active}
            className={cn(
              "h-5 rounded-[2px] px-1.5 font-mono text-[10.5px] uppercase tracking-[0.12em] transition-colors",
              active
                ? "bg-[color:var(--color-ink-3)] text-[color:var(--color-acid)]"
                : "text-[color:var(--color-text-3)] hover:text-[color:var(--color-text-0)]",
              isPersisting && "opacity-60",
            )}
          >
            {t(`language.${code}`)}
          </button>
        );
      })}
    </div>
  );
}
