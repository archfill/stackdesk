import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Pause, Play, RotateCw, Terminal } from "lucide-react";

import { apiClient } from "../api/client";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";

interface LogViewerProps {
  appName: string;
  onClose: () => void;
}

export default function LogViewer({ appName, onClose }: LogViewerProps) {
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoscroll, setAutoscroll] = useState(true);
  const [paused, setPaused] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiClient.getLogs(appName);
      setLogs(data.logs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch logs");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    if (paused) return;
    const id = setInterval(fetchLogs, 3000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appName, paused]);

  useEffect(() => {
    if (!autoscroll || !bodyRef.current) return;
    bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [logs, autoscroll]);

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-[color:var(--color-rule)] bg-[color:var(--color-ink-0)]/80 px-8 py-4 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose} title="Back">
            <ArrowLeft className="size-[15px]" strokeWidth={1.6} />
          </Button>
          <div className="flex items-center gap-2">
            <Terminal
              className="size-[14px] text-[color:var(--color-acid)]"
              strokeWidth={1.6}
            />
            <h1 className="font-display text-[18px] font-semibold leading-none tracking-[-0.02em] text-[color:var(--color-text-0)]">
              logs
              <span className="text-[color:var(--color-text-3)]"> · </span>
              <span className="font-mono text-[14px] font-medium text-[color:var(--color-text-2)]">
                {appName}
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex h-8 items-center gap-1.5 rounded-[3px] border border-[color:var(--color-rule)] bg-[color:var(--color-ink-1)] px-2.5 text-[11.5px] text-[color:var(--color-text-2)]">
            <input
              type="checkbox"
              className="size-3 accent-[color:var(--color-acid)]"
              checked={autoscroll}
              onChange={(e) => setAutoscroll(e.target.checked)}
            />
            <span className="font-mono uppercase tracking-[0.1em]">
              autoscroll
            </span>
          </label>
          <Button
            variant="neutral"
            size="md"
            onClick={() => setPaused((p) => !p)}
          >
            {paused ? (
              <>
                <Play className="size-[13px]" strokeWidth={1.7} />
                resume
              </>
            ) : (
              <>
                <Pause className="size-[13px]" strokeWidth={1.7} />
                pause
              </>
            )}
          </Button>
          <Button variant="neutral" size="md" onClick={fetchLogs}>
            <RotateCw
              className={cn("size-[13px]", isLoading && "animate-spin")}
              strokeWidth={1.7}
            />
            refresh
          </Button>
        </div>
      </header>

      <div className="flex flex-1 flex-col px-8 py-6">
        <section className="surface relative flex flex-1 flex-col overflow-hidden rounded-[5px]">
          <header className="flex items-center justify-between border-b border-[color:var(--color-rule)] bg-[color:var(--color-ink-1)] px-4 py-2">
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-text-3)]">
              <span className={cn("status-dot", paused ? "down" : "up")} />
              <span>{paused ? "stream paused" : "polling · 3s"}</span>
            </div>
            <span className="label-eyebrow">
              <span className="num text-[color:var(--color-text-1)]">
                {logs.length}
              </span>{" "}
              lines
            </span>
          </header>

          <div
            ref={bodyRef}
            className="flex-1 overflow-auto bg-[color:var(--color-ink-0)] font-mono text-[11.5px] leading-[1.55]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(transparent 0 22px, color-mix(in srgb, var(--color-rule) 35%, transparent) 22px 23px)",
            }}
          >
            {isLoading && logs.length === 0 ? (
              <p className="px-4 py-3 text-[color:var(--color-text-3)]">
                connecting to container stdout…
              </p>
            ) : error ? (
              <p className="px-4 py-3 text-[color:var(--color-err)]">
                ▶ {error}
              </p>
            ) : logs.length === 0 ? (
              <p className="px-4 py-3 text-[color:var(--color-text-3)]">
                no log entries
              </p>
            ) : (
              logs.map((log, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-[3rem_1fr] items-baseline px-4 hover:bg-[color:var(--color-ink-2)]"
                >
                  <span className="text-[10.5px] text-[color:var(--color-text-4)]">
                    {(idx + 1).toString().padStart(4, "0")}
                  </span>
                  <span className="whitespace-pre-wrap break-all text-[color:var(--color-text-1)]">
                    {log}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
