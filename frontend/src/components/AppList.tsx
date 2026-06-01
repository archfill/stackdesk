import { useMemo, useState } from "react";
import {
  CircleSlash2,
  Plus,
  Search,
  ServerCog,
  TriangleAlert,
  Wifi,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { useApps } from "../hooks/useApps";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";
import { translateError } from "../lib/translateError";
import AppCard from "./AppCard";
import LogViewer from "./LogViewer";
import UpdateChecker from "./UpdateChecker";

type StatusFilter = "all" | "running" | "stopped" | "error";

const FILTERS: StatusFilter[] = ["all", "running", "stopped", "error"];

export default function AppList() {
  const { t } = useTranslation("apps");
  const { t: tErr } = useTranslation("errors");
  const { t: tCommon } = useTranslation("common");
  const {
    data: apps = [],
    error,
    isPending,
    refetch,
  } = useApps();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedAppForLogs, setSelectedAppForLogs] = useState<string | null>(
    null,
  );
  const [selectedAppForUpdates, setSelectedAppForUpdates] = useState<
    string | null
  >(null);

  const fetchApps = () => {
    void refetch();
  };

  const counts = useMemo(() => {
    const c = { all: apps.length, running: 0, stopped: 0, error: 0 };
    for (const a of apps) {
      if (a.status === "running") c.running++;
      else if (a.status === "error") c.error++;
      else c.stopped++;
    }
    return c;
  }, [apps]);

  const filteredApps = useMemo(() => {
    let f = apps;
    if (statusFilter !== "all") f = f.filter((a) => a.status === statusFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      f = f.filter((a) => a.name.toLowerCase().includes(q));
    }
    return f;
  }, [apps, statusFilter, searchQuery]);

  if (selectedAppForLogs) {
    return (
      <LogViewer
        appName={selectedAppForLogs}
        onClose={() => setSelectedAppForLogs(null)}
      />
    );
  }

  if (selectedAppForUpdates) {
    return (
      <UpdateChecker
        appName={selectedAppForUpdates}
        onClose={() => setSelectedAppForUpdates(null)}
        onRefresh={fetchApps}
      />
    );
  }

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-[color:var(--color-rule)] bg-[color:var(--color-ink-0)]/80 px-8 py-4 backdrop-blur-sm">
        <div className="flex items-baseline gap-3">
          <h1 className="font-display text-[22px] font-semibold leading-none tracking-[-0.02em] text-[color:var(--color-text-0)]">
            {t("title")}
          </h1>
          <span className="label-eyebrow">
            <span className="num text-[color:var(--color-text-2)]">
              {counts.all.toString().padStart(2, "0")}
            </span>{" "}
            {t("onHost")}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <StatusPulse
            counts={counts}
            labels={{
              up: t("indicators.up"),
              down: t("indicators.down"),
              err: t("indicators.err"),
            }}
          />
          <Button variant="neutral" size="md">
            <Plus className="size-[14px]" strokeWidth={1.75} />
            <span>{t("addApplication")}</span>
          </Button>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[color:var(--color-rule)] px-8 py-3">
        <div className="flex items-center gap-1.5 rounded-[3px] border border-[color:var(--color-rule)] bg-[color:var(--color-ink-1)] p-0.5">
          {FILTERS.map((id) => {
            const active = statusFilter === id;
            return (
              <button
                key={id}
                onClick={() => setStatusFilter(id)}
                className={cn(
                  "flex h-7 items-center gap-1.5 rounded-[2px] px-2.5 font-mono text-[11px] uppercase tracking-[0.1em] transition-colors",
                  active
                    ? "bg-[color:var(--color-ink-3)] text-[color:var(--color-text-0)]"
                    : "text-[color:var(--color-text-2)] hover:text-[color:var(--color-text-0)]",
                )}
              >
                <FilterDot id={id} active={active} />
                <span>{t(`filters.${id}`)}</span>
                <span
                  className={cn(
                    "num ml-0.5 text-[10.5px]",
                    active
                      ? "text-[color:var(--color-acid)]"
                      : "text-[color:var(--color-text-3)]",
                  )}
                >
                  {counts[id]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative flex h-8 w-full max-w-[320px] items-center">
          <Search
            className="absolute left-2.5 size-[14px] text-[color:var(--color-text-3)]"
            strokeWidth={1.5}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("search.placeholder")}
            className={cn(
              "h-full w-full rounded-[3px] border border-[color:var(--color-rule)] bg-[color:var(--color-ink-1)]",
              "pl-8 pr-2 text-[12.5px] text-[color:var(--color-text-0)] placeholder:text-[color:var(--color-text-3)]",
              "focus:outline-none focus:border-[color:var(--color-acid)] focus:bg-[color:var(--color-ink-2)]",
            )}
          />
          <span className="kbd absolute right-1.5">/</span>
        </div>
      </div>

      <section className="flex-1 overflow-auto">
        {isPending && apps.length === 0 ? (
          <EmptyState
            icon={<Wifi className="size-5" strokeWidth={1.4} />}
            title={t("empty.connecting.title")}
            subtitle={t("empty.connecting.subtitle")}
            labelHint={t("empty.labelLookupHint")}
          />
        ) : error && apps.length === 0 ? (
          <EmptyState
            icon={
              <TriangleAlert
                className="size-5 text-[color:var(--color-err)]"
                strokeWidth={1.4}
              />
            }
            title={t("empty.error.title")}
            subtitle={translateError(error, tErr)}
            action={
              <Button variant="neutral" size="sm" onClick={fetchApps}>
                {tCommon("actions.retry")}
              </Button>
            }
            tone="err"
            labelHint={t("empty.labelLookupHint")}
          />
        ) : filteredApps.length === 0 ? (
          <EmptyState
            icon={<CircleSlash2 className="size-5" strokeWidth={1.4} />}
            title={
              searchQuery || statusFilter !== "all"
                ? t("empty.noMatches.title")
                : t("empty.noProjects.title")
            }
            subtitle={
              searchQuery || statusFilter !== "all"
                ? t("empty.noMatches.subtitle")
                : t("empty.noProjects.subtitle")
            }
            labelHint={t("empty.labelLookupHint")}
          />
        ) : (
          <table className="w-full border-separate border-spacing-0 text-[12.5px]">
            <thead>
              <tr className="text-left">
                {[
                  { label: t("table.project"), w: "w-[34%]" },
                  { label: t("table.status"), w: "w-[14%]" },
                  { label: t("table.services"), w: "w-[24%]" },
                  { label: t("table.lastDeployed"), w: "w-[16%]" },
                  { label: "", w: "w-[12%] text-right" },
                ].map((h, i) => (
                  <th
                    key={`${h.label}-${i}`}
                    className={cn(
                      "label-eyebrow border-b border-[color:var(--color-rule)] bg-[color:var(--color-ink-0)] px-4 py-2.5",
                      "sticky top-0 z-10",
                      h.w,
                    )}
                  >
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredApps.map((app, i) => (
                <AppCard
                  key={app.name}
                  app={app}
                  index={i}
                  onRefresh={fetchApps}
                  onViewLogs={setSelectedAppForLogs}
                  onCheckUpdates={setSelectedAppForUpdates}
                />
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}

function FilterDot({ id, active }: { id: StatusFilter; active: boolean }) {
  if (id === "all")
    return (
      <span
        className={cn(
          "size-1.5 rounded-full",
          active
            ? "bg-[color:var(--color-acid)]"
            : "bg-[color:var(--color-text-3)]",
        )}
      />
    );
  const map: Record<Exclude<StatusFilter, "all">, string> = {
    running: "up",
    stopped: "down",
    error: "err",
  };
  return <span className={cn("status-dot", map[id])} />;
}

function StatusPulse({
  counts,
  labels,
}: {
  counts: { running: number; stopped: number; error: number };
  labels: { up: string; down: string; err: string };
}) {
  return (
    <div className="hidden items-center gap-3 px-3 md:flex">
      <Indicator tone="up" value={counts.running} label={labels.up} />
      <Indicator tone="down" value={counts.stopped} label={labels.down} />
      {counts.error > 0 && (
        <Indicator tone="err" value={counts.error} label={labels.err} />
      )}
    </div>
  );
}

function Indicator({
  tone,
  value,
  label,
}: {
  tone: "up" | "down" | "err";
  value: number;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("status-dot", tone)} />
      <span className="num text-[12.5px] font-medium text-[color:var(--color-text-0)]">
        {value}
      </span>
      <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--color-text-3)]">
        {label}
      </span>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  subtitle,
  action,
  tone,
  labelHint,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
  tone?: "err";
  labelHint: string;
}) {
  return (
    <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-3 px-8 py-16 text-center">
      <div
        className={cn(
          "flex size-12 items-center justify-center rounded-[6px] border",
          tone === "err"
            ? "border-[color:color-mix(in_srgb,var(--color-err)_35%,transparent)] bg-[color:var(--color-err-soft)] text-[color:var(--color-err)]"
            : "border-[color:var(--color-rule)] bg-[color:var(--color-ink-1)] text-[color:var(--color-text-2)]",
        )}
      >
        {icon}
      </div>
      <h2 className="font-display text-[15px] font-semibold tracking-tight text-[color:var(--color-text-0)]">
        {title}
      </h2>
      <p className="max-w-md text-[12.5px] leading-relaxed text-[color:var(--color-text-2)]">
        {subtitle}
      </p>
      {action}
      <span className="mt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-text-4)]">
        <ServerCog className="mr-1 inline size-3 align-[-2px]" /> {labelHint}
      </span>
    </div>
  );
}
