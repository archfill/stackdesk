import { useState } from "react";
import { Download, FileText, Play, RotateCw, Square } from "lucide-react";
import { useTranslation } from "react-i18next";

import { apiClient } from "../api/client";
import type { ComposeApp } from "../types";
import { cn } from "../lib/utils";
import { translateError } from "../lib/translateError";
import { StatusBadge } from "./ui/StatusBadge";

interface AppCardProps {
  app: ComposeApp;
  index: number;
  onRefresh: () => void;
  onViewLogs: (appName: string) => void;
  onCheckUpdates: (appName: string) => void;
}

export default function AppCard({
  app,
  index,
  onRefresh,
  onViewLogs,
  onCheckUpdates,
}: AppCardProps) {
  const { t } = useTranslation("apps");
  const { t: tErr } = useTranslation("errors");
  const [isLoading, setIsLoading] = useState(false);

  const handleAction = async (action: () => Promise<void>) => {
    setIsLoading(true);
    try {
      await action();
      await new Promise((r) => setTimeout(r, 500));
      onRefresh();
    } catch (err) {
      console.error("Action failed:", err);
      alert(t("alerts.actionFailed", { message: translateError(err, tErr) }));
    } finally {
      setIsLoading(false);
    }
  };

  const tone =
    app.status === "running" ? "up" : app.status === "error" ? "err" : "down";

  return (
    <tr
      className={cn(
        "group transition-colors",
        index % 2 === 1
          ? "bg-[color:color-mix(in_srgb,var(--color-ink-1)_55%,transparent)]"
          : undefined,
        "hover:bg-[color:var(--color-ink-2)]",
      )}
    >
      <td className="border-b border-[color:var(--color-rule)] px-4 py-2.5 align-middle">
        <div className="flex items-center gap-2">
          <span className={cn("status-dot", tone)} aria-hidden />
          <span className="font-display text-[13.5px] font-semibold tracking-tight text-[color:var(--color-text-0)]">
            {app.name}
          </span>
        </div>
      </td>

      <td className="border-b border-[color:var(--color-rule)] px-4 py-2.5 align-middle">
        <StatusBadge tone={tone}>{app.status}</StatusBadge>
      </td>

      <td className="border-b border-[color:var(--color-rule)] px-4 py-2.5 align-middle">
        <ServiceChips
          services={app.services}
          noServiceLabel={t("table.noService")}
        />
      </td>

      <td className="border-b border-[color:var(--color-rule)] px-4 py-2.5 align-middle">
        <span className="num text-[11.5px] text-[color:var(--color-text-2)]">
          {formatTimestamp(app.lastDeployed, t("table.neverRecorded"))}
        </span>
      </td>

      <td className="border-b border-[color:var(--color-rule)] px-4 py-2 align-middle">
        <div className="flex items-center justify-end gap-1 opacity-60 transition-opacity group-hover:opacity-100">
          <RowAction
            label={t("actions.start")}
            disabled={isLoading || app.status === "running"}
            onClick={() => handleAction(() => apiClient.startApp(app.name))}
            icon={<Play className="size-[14px]" strokeWidth={1.6} />}
            tone="up"
          />
          <RowAction
            label={t("actions.stop")}
            disabled={isLoading || app.status === "stopped"}
            onClick={() => handleAction(() => apiClient.stopApp(app.name))}
            icon={<Square className="size-[14px]" strokeWidth={1.6} />}
          />
          <RowAction
            label={t("actions.restart")}
            disabled={isLoading}
            onClick={() => handleAction(() => apiClient.restartApp(app.name))}
            icon={<RotateCw className="size-[14px]" strokeWidth={1.6} />}
          />
          <RowAction
            label={t("actions.logs")}
            onClick={() => onViewLogs(app.name)}
            icon={<FileText className="size-[14px]" strokeWidth={1.6} />}
          />
          <RowAction
            label={t("actions.updates")}
            onClick={() => onCheckUpdates(app.name)}
            icon={<Download className="size-[14px]" strokeWidth={1.6} />}
          />
        </div>
      </td>
    </tr>
  );
}

function RowAction({
  label,
  icon,
  disabled,
  onClick,
  tone,
}: {
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
  tone?: "up";
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn(
        "flex size-7 items-center justify-center rounded-[3px] border border-transparent transition-colors",
        "text-[color:var(--color-text-2)] hover:border-[color:var(--color-rule-bright)] hover:bg-[color:var(--color-ink-3)] hover:text-[color:var(--color-text-0)]",
        tone === "up" &&
          "hover:text-[color:var(--color-up)] hover:border-[color:color-mix(in_srgb,var(--color-up)_40%,transparent)] hover:bg-[color:var(--color-up-soft)]",
        "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-transparent",
      )}
    >
      {icon}
    </button>
  );
}

function ServiceChips({
  services,
  noServiceLabel,
}: {
  services: ComposeApp["services"];
  noServiceLabel: string;
}) {
  if (!services || services.length === 0) {
    return (
      <span className="text-[11.5px] text-[color:var(--color-text-3)]">
        {noServiceLabel}
      </span>
    );
  }
  const visible = services.slice(0, 3);
  const remaining = services.length - visible.length;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {visible.map((s) => {
        const isUp = s.status === "running";
        return (
          <span
            key={s.containerId}
            className={cn(
              "inline-flex items-center gap-1 rounded-[2px] border px-1.5 py-0.5",
              "font-mono text-[10.5px] tracking-[-0.01em]",
              isUp
                ? "border-[color:color-mix(in_srgb,var(--color-up)_25%,transparent)] bg-[color:var(--color-up-soft)] text-[color:var(--color-up)]"
                : "border-[color:var(--color-rule)] bg-[color:var(--color-ink-1)] text-[color:var(--color-text-2)]",
            )}
            title={`${s.name} · ${s.image} · ${s.state}`}
          >
            <span
              className={cn("status-dot", isUp ? "up" : "down")}
              style={{ width: 6, height: 6 }}
            />
            {s.name}
          </span>
        );
      })}
      {remaining > 0 && (
        <span className="font-mono text-[10.5px] text-[color:var(--color-text-3)]">
          +{remaining}
        </span>
      )}
    </div>
  );
}

function formatTimestamp(ts: string | undefined, neverLabel: string): string {
  if (!ts) return "—";
  if (ts.startsWith("0001-")) return neverLabel;
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString();
}
