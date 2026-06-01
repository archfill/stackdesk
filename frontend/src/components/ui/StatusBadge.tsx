import { cn } from "../../lib/utils";

type Tone = "up" | "down" | "warn" | "err" | "admin" | "member" | "muted";

const TONE_CLASS: Record<Tone, string> = {
  up: "text-[color:var(--color-up)] bg-[color:var(--color-up-soft)] border-[color:color-mix(in_srgb,var(--color-up)_35%,transparent)]",
  down: "text-[color:var(--color-text-2)] bg-[color:var(--color-down-soft)] border-[color:var(--color-rule-bright)]",
  warn: "text-[color:var(--color-warn)] bg-[color:var(--color-warn-soft)] border-[color:color-mix(in_srgb,var(--color-warn)_35%,transparent)]",
  err: "text-[color:var(--color-err)] bg-[color:var(--color-err-soft)] border-[color:color-mix(in_srgb,var(--color-err)_35%,transparent)]",
  admin:
    "text-[color:var(--color-role-admin)] bg-[color:var(--color-role-admin-soft)] border-[color:color-mix(in_srgb,var(--color-role-admin)_35%,transparent)]",
  member:
    "text-[color:var(--color-role-member)] bg-[color:var(--color-role-member-soft)] border-[color:color-mix(in_srgb,var(--color-role-member)_35%,transparent)]",
  muted:
    "text-[color:var(--color-text-3)] bg-[color:var(--color-ink-2)] border-[color:var(--color-rule)]",
};

const DOT_CLASS: Record<Tone, string | undefined> = {
  up: "up",
  down: "down",
  warn: "warn",
  err: "err",
  admin: undefined,
  member: undefined,
  muted: undefined,
};

interface StatusBadgeProps {
  tone: Tone;
  children: React.ReactNode;
  withDot?: boolean;
  className?: string;
}

export function StatusBadge({
  tone,
  children,
  withDot = false,
  className,
}: StatusBadgeProps) {
  const dotClass = DOT_CLASS[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[3px] border px-1.5 py-[3px]",
        "font-mono text-[10.5px] font-medium uppercase tracking-[0.08em]",
        TONE_CLASS[tone],
        className,
      )}
    >
      {withDot && dotClass && <span className={cn("status-dot", dotClass)} />}
      {children}
    </span>
  );
}
