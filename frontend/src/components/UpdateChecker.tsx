import {
  ArrowLeft,
  CheckCircle2,
  CloudDownload,
  RefreshCcw,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { useCheckUpdates, usePullImages } from "../hooks/useApps";
import { Button } from "./ui/button";
import { StatusBadge } from "./ui/StatusBadge";
import { cn } from "../lib/utils";
import { translateError } from "../lib/translateError";

interface UpdateCheckerProps {
  appName: string;
  onClose: () => void;
  onRefresh: () => void;
}

export default function UpdateChecker({
  appName,
  onClose,
  onRefresh,
}: UpdateCheckerProps) {
  const { t } = useTranslation("apps");
  const { t: tErr } = useTranslation("errors");
  const { t: tCommon } = useTranslation("common");

  const updatesQuery = useCheckUpdates(appName);
  const updates = updatesQuery.data ?? [];
  const isLoading = updatesQuery.isLoading || updatesQuery.isFetching;
  const error = updatesQuery.error;

  const pullMutation = usePullImages();
  const isPulling = pullMutation.isPending;

  const handlePullImages = async () => {
    try {
      await pullMutation.mutateAsync(appName);
      alert(t("updates.pullSuccess"));
      onRefresh();
      onClose();
    } catch (err) {
      alert(t("updates.pullFail", { message: translateError(err, tErr) }));
    }
  };

  const hasUpdates = updates.some((u) => u.updateRequired);
  const upToDateCount = updates.filter((u) => !u.updateRequired).length;
  const updateCount = updates.filter((u) => u.updateRequired).length;

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-[color:var(--color-rule)] bg-[color:var(--color-ink-0)]/80 px-8 py-4 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            title={tCommon("actions.back")}
          >
            <ArrowLeft className="size-[15px]" strokeWidth={1.6} />
          </Button>
          <div className="flex items-center gap-2">
            <CloudDownload
              className="size-[14px] text-[color:var(--color-acid)]"
              strokeWidth={1.6}
            />
            <h1 className="font-display text-[18px] font-semibold leading-none tracking-[-0.02em] text-[color:var(--color-text-0)]">
              {t("updates.titlePrefix")}
              <span className="text-[color:var(--color-text-3)]"> · </span>
              <span className="font-mono text-[14px] font-medium text-[color:var(--color-text-2)]">
                {appName}
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="neutral"
            size="md"
            onClick={() => updatesQuery.refetch()}
          >
            <RefreshCcw
              className={cn("size-[13px]", isLoading && "animate-spin")}
              strokeWidth={1.7}
            />
            {t("updates.recheck")}
          </Button>
          {hasUpdates && (
            <Button
              variant="accent"
              size="md"
              onClick={handlePullImages}
              disabled={isPulling}
            >
              <CloudDownload className="size-[14px]" strokeWidth={1.7} />
              {isPulling ? t("updates.pulling") : t("updates.pull")}
            </Button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-auto px-8 py-6">
        <div className="mx-auto flex max-w-5xl flex-col gap-6">
          <section className="surface flex flex-wrap items-center justify-between gap-4 rounded-[5px] px-5 py-4">
            <div className="flex items-center gap-4">
              <SummaryStat
                tone="up"
                value={upToDateCount}
                label={t("updates.summary.upToDate")}
              />
              <span className="h-6 w-px bg-[color:var(--color-rule)]" />
              <SummaryStat
                tone="warn"
                value={updateCount}
                label={t("updates.summary.updatable")}
              />
            </div>
            <p className="max-w-md text-[12px] leading-relaxed text-[color:var(--color-text-2)]">
              {t("updates.summary.blurb")}
            </p>
          </section>

          {isLoading && updates.length === 0 ? (
            <section className="surface rounded-[5px] p-6">
              <p className="text-[12.5px] text-[color:var(--color-text-2)]">
                {t("updates.states.inspecting")}
              </p>
            </section>
          ) : error ? (
            <section className="surface rounded-[5px] border border-[color:color-mix(in_srgb,var(--color-err)_35%,transparent)] bg-[color:var(--color-err-soft)] p-6">
              <p className="font-mono text-[12px] text-[color:var(--color-err)]">
                ▶ {translateError(error, tErr)}
              </p>
            </section>
          ) : updates.length === 0 ? (
            <section className="surface flex flex-col items-center justify-center gap-2 rounded-[5px] px-6 py-12 text-center">
              <CheckCircle2
                className="size-7 text-[color:var(--color-up)]"
                strokeWidth={1.5}
              />
              <p className="font-display text-[14px] font-semibold tracking-tight text-[color:var(--color-text-0)]">
                {t("updates.states.current.title")}
              </p>
              <p className="max-w-md text-[12px] leading-relaxed text-[color:var(--color-text-3)]">
                {t("updates.states.current.subtitle")}
              </p>
            </section>
          ) : (
            <section className="surface overflow-hidden rounded-[5px]">
              <header className="border-b border-[color:var(--color-rule)] px-5 py-3">
                <h2 className="font-display text-[13px] font-semibold tracking-tight text-[color:var(--color-text-0)]">
                  {t("updates.diff.title")}
                </h2>
              </header>
              <ul className="divide-y divide-[color:var(--color-rule)]">
                {updates.map((u, idx) => (
                  <li
                    key={`${u.serviceName}-${idx}`}
                    className="grid grid-cols-1 gap-3 px-5 py-3 sm:grid-cols-[1fr_auto] sm:items-center"
                  >
                    <div className="min-w-0">
                      <p className="font-display text-[13.5px] font-semibold tracking-tight text-[color:var(--color-text-0)]">
                        {u.serviceName}
                      </p>
                      <p className="mt-0.5 truncate font-mono text-[11.5px] text-[color:var(--color-text-2)]">
                        {u.currentImage}
                      </p>
                      <div className="mt-1.5 grid grid-cols-1 gap-x-4 gap-y-0.5 font-mono text-[10.5px] text-[color:var(--color-text-3)] sm:grid-cols-2">
                        <span>
                          {t("updates.diff.local")}{" "}
                          <span className="text-[color:var(--color-text-2)]">
                            {trimDigest(u.currentDigest)}
                          </span>
                        </span>
                        <span>
                          {t("updates.diff.remote")}{" "}
                          <span className="text-[color:var(--color-text-2)]">
                            {trimDigest(u.latestDigest)}
                          </span>
                        </span>
                      </div>
                    </div>
                    <div>
                      {u.updateRequired ? (
                        <StatusBadge tone="warn" withDot>
                          {t("updates.diff.updateAvailable")}
                        </StatusBadge>
                      ) : (
                        <StatusBadge tone="up" withDot>
                          {t("updates.diff.current")}
                        </StatusBadge>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}

function SummaryStat({
  tone,
  value,
  label,
}: {
  tone: "up" | "warn";
  value: number;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn("status-dot", tone)} />
      <span className="num font-display text-[18px] font-semibold leading-none text-[color:var(--color-text-0)]">
        {value}
      </span>
      <span className="label-eyebrow">{label}</span>
    </div>
  );
}

function trimDigest(d?: string): string {
  if (!d) return "—";
  if (d.startsWith("sha256:")) return d.slice(0, 19) + "…";
  if (d.length > 18) return d.slice(0, 12) + "…";
  return d;
}
