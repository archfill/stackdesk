import { cn } from "../../lib/utils";

interface BrandIconProps {
  className?: string;
}

export function BrandIcon({ className }: BrandIconProps) {
  return (
    <svg
      className={cn("flex-none", className)}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden
    >
      <rect
        x="5.5"
        y="5.5"
        width="53"
        height="53"
        rx="8"
        fill="var(--color-ink-1)"
        stroke="var(--color-rule-bright)"
      />
      <path
        d="M12 18h8l4 4"
        stroke="var(--color-rule-bright)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M52 44h-8l-4-4"
        stroke="var(--color-rule-bright)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 44 32 53 48 44 32 35Z"
        fill="var(--color-ink-2)"
        stroke="var(--color-text-3)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M21 34 32 40 43 34 32 28Z"
        fill="var(--color-ink-3)"
        stroke="var(--color-acid)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M21 27 32 33 43 27 32 21Z"
        fill="var(--color-ink-3)"
        stroke="var(--color-acid)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M21 20 32 26 43 20 32 14Z"
        fill="var(--color-acid)"
        stroke="var(--color-acid-strong)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M21 20v7l11 6v-7Z"
        fill="var(--color-acid)"
        stroke="var(--color-ink-0)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M43 20v7l-11 6v-7Z"
        fill="color-mix(in srgb, var(--color-acid) 78%, var(--color-ink-0))"
        stroke="var(--color-ink-0)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="15" cy="18" r="2.5" fill="var(--color-acid)" />
      <circle cx="49" cy="44" r="2.5" fill="var(--color-up)" />
    </svg>
  );
}
