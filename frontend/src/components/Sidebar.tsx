import { Boxes, KeyRound, LogOut, Users2 } from "lucide-react";

import { useCurrentUser, useLogout } from "../hooks/useAuth";
import { cn } from "../lib/utils";

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  shortcut?: string;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

export default function Sidebar({ activeView, onViewChange }: SidebarProps) {
  const user = useCurrentUser();
  const logout = useLogout();
  const isAdmin = user.data?.role === "admin";

  const sections: NavSection[] = [
    {
      label: "workloads",
      items: [{ id: "all", label: "Applications", icon: Boxes, shortcut: "A" }],
    },
    {
      label: "access",
      items: [
        { id: "tokens", label: "MCP Tokens", icon: KeyRound, shortcut: "T" },
        ...(isAdmin
          ? [
              {
                id: "users",
                label: "Users",
                icon: Users2,
                shortcut: "U",
              } as NavItem,
            ]
          : []),
      ],
    },
  ];

  return (
    <aside className="surface flex w-[248px] flex-shrink-0 flex-col border-y-0 border-l-0 border-r border-[color:var(--color-rule)] bg-[color:var(--color-ink-1)]">
      {/* brand row */}
      <div className="flex items-center gap-2.5 border-b border-[color:var(--color-rule)] px-4 py-3.5">
        <BrandGlyph />
        <div className="flex flex-col leading-none">
          <span className="font-display text-[13px] font-semibold tracking-tight text-[color:var(--color-text-0)]">
            docker-manager
          </span>
          <span className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.16em] text-[color:var(--color-text-3)]">
            operator console
          </span>
        </div>
      </div>

      {/* nav */}
      <nav className="flex flex-1 flex-col gap-5 px-3 py-4">
        {sections.map((sec) => (
          <div key={sec.label} className="flex flex-col gap-0.5">
            <div className="px-2 pb-1.5 label-eyebrow">{sec.label}</div>
            {sec.items.map((item) => {
              const Icon = item.icon;
              const active = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onViewChange(item.id)}
                  className={cn(
                    "group relative flex h-8 items-center gap-2.5 rounded-[4px] px-2 text-[12.5px] transition-colors",
                    active
                      ? "bg-[color:var(--color-ink-2)] text-[color:var(--color-text-0)]"
                      : "text-[color:var(--color-text-2)] hover:bg-[color:var(--color-ink-2)] hover:text-[color:var(--color-text-0)]",
                  )}
                >
                  {/* left active stripe */}
                  <span
                    className={cn(
                      "absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-r",
                      active
                        ? "bg-[color:var(--color-acid)]"
                        : "bg-transparent",
                    )}
                  />
                  <Icon
                    className={cn(
                      "size-[15px]",
                      active
                        ? "text-[color:var(--color-acid)]"
                        : "text-[color:var(--color-text-3)] group-hover:text-[color:var(--color-text-1)]",
                    )}
                    strokeWidth={1.5}
                  />
                  <span className="flex-1 text-left tracking-tight">
                    {item.label}
                  </span>
                  {item.shortcut && (
                    <span className="kbd hidden group-hover:inline-block">
                      {item.shortcut}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* user footer */}
      <div className="border-t border-[color:var(--color-rule)] p-3">
        <div className="flex items-center gap-2.5 px-1 pb-2.5">
          <Avatar name={user.data?.username ?? "?"} />
          <div className="flex min-w-0 flex-1 flex-col leading-tight">
            <span className="truncate text-[12.5px] font-medium text-[color:var(--color-text-0)]">
              {user.data?.username ?? "—"}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--color-text-3)]">
              {user.data?.role === "admin" ? "admin · root" : "member"}
            </span>
          </div>
        </div>
        <button
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
          className={cn(
            "flex h-8 w-full items-center gap-2 rounded-[3px] border border-[color:var(--color-rule)] px-2.5",
            "bg-transparent text-[12px] text-[color:var(--color-text-2)]",
            "transition-colors hover:bg-[color:var(--color-ink-2)] hover:text-[color:var(--color-text-0)] hover:border-[color:var(--color-rule-bright)]",
            "disabled:opacity-50",
          )}
        >
          <LogOut className="size-[14px]" strokeWidth={1.5} />
          <span className="flex-1 text-left">
            {logout.isPending ? "signing out…" : "sign out"}
          </span>
        </button>
      </div>
    </aside>
  );
}

function BrandGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect
        x="1.5"
        y="1.5"
        width="19"
        height="19"
        stroke="var(--color-acid)"
        strokeWidth="1"
      />
      <rect x="7" y="7" width="8" height="8" fill="var(--color-acid)" />
    </svg>
  );
}

function Avatar({ name }: { name: string }) {
  const initial = (name || "?").trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      className="flex size-7 items-center justify-center rounded-[3px] border border-[color:var(--color-rule-bright)] bg-[color:var(--color-ink-2)] font-display text-[12px] font-semibold text-[color:var(--color-acid)]"
      aria-hidden
    >
      {initial}
    </span>
  );
}
