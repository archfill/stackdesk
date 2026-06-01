import { useState } from "react";
import {
  AlertTriangle,
  ClipboardCheck,
  Copy,
  KeyRound,
  Trash2,
  X,
} from "lucide-react";

import {
  useCreateMCPToken,
  useMCPTokens,
  useRevokeMCPToken,
} from "../hooks/useTokens";
import { cn } from "../lib/utils";
import type { MCPToken, MCPTokenCreated } from "../types";
import { Button } from "./ui/button";
import { StatusBadge } from "./ui/StatusBadge";

function formatTimestamp(unix?: number): string {
  if (!unix) return "—";
  return new Date(unix * 1000).toLocaleString();
}

function tokenStatus(t: MCPToken): "active" | "revoked" {
  return t.revokedAt ? "revoked" : "active";
}

export default function TokenManager() {
  const tokens = useMCPTokens();
  const create = useCreateMCPToken();
  const revoke = useRevokeMCPToken();
  const [name, setName] = useState("");
  const [justCreated, setJustCreated] = useState<MCPTokenCreated | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const res = await create.mutateAsync(name.trim());
    setJustCreated(res);
    setName("");
    setCopied(false);
  };

  const handleCopy = async () => {
    if (!justCreated) return;
    try {
      await navigator.clipboard.writeText(justCreated.plaintext);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const handleRevoke = (id: number) => {
    if (!confirm("このトークンを失効させますか？以後の MCP 認証は失敗します。"))
      return;
    revoke.mutate(id);
  };

  const activeCount = tokens.data?.filter((t) => !t.revokedAt).length ?? 0;
  const totalCount = tokens.data?.length ?? 0;

  return (
    <main className="flex flex-1 flex-col">
      <header className="border-b border-[color:var(--color-rule)] bg-[color:var(--color-ink-0)]/80 px-8 py-4 backdrop-blur-sm">
        <div className="flex items-baseline gap-3">
          <h1 className="font-display text-[22px] font-semibold leading-none tracking-[-0.02em] text-[color:var(--color-text-0)]">
            MCP Tokens
          </h1>
          <span className="label-eyebrow">
            bearer · authorise <code className="font-mono">/mcp</code>
          </span>
        </div>
        <p className="mt-2 max-w-2xl text-[12.5px] leading-relaxed text-[color:var(--color-text-2)]">
          Tokens are stored as{" "}
          <code className="font-mono">sha256(plaintext)</code> — the value is
          shown <em>once</em> on creation and never recoverable again. Revoke is
          immediate.
        </p>
      </header>

      <div className="flex-1 overflow-auto px-8 py-6">
        <div className="mx-auto flex max-w-5xl flex-col gap-6">
          {/* issuance card */}
          <section className="surface overflow-hidden rounded-[6px]">
            <header className="flex items-center justify-between border-b border-[color:var(--color-rule)] px-5 py-3">
              <div className="flex items-center gap-2">
                <KeyRound
                  className="size-[14px] text-[color:var(--color-acid)]"
                  strokeWidth={1.6}
                />
                <h2 className="font-display text-[13px] font-semibold tracking-tight text-[color:var(--color-text-0)]">
                  Issue token
                </h2>
              </div>
              <span className="label-eyebrow">prefix · dmt_</span>
            </header>

            <form
              onSubmit={handleCreate}
              className="flex flex-col gap-3 px-5 py-4 sm:flex-row"
            >
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="label · e.g. mbp-2024-staging"
                className={cn(
                  "h-9 flex-grow rounded-[3px] border border-[color:var(--color-rule)] bg-[color:var(--color-ink-1)] px-3",
                  "text-[13px] text-[color:var(--color-text-0)] placeholder:text-[color:var(--color-text-3)]",
                  "focus:outline-none focus:border-[color:var(--color-acid)] focus:bg-[color:var(--color-ink-2)]",
                )}
              />
              <Button
                type="submit"
                variant="accent"
                size="md"
                disabled={create.isPending || !name.trim()}
              >
                {create.isPending ? "issuing…" : "issue token"}
              </Button>
            </form>
            {create.error && (
              <p className="border-t border-[color:var(--color-rule)] bg-[color:var(--color-err-soft)] px-5 py-2 font-mono text-[11.5px] text-[color:var(--color-err)]">
                ▶ {(create.error as Error).message}
              </p>
            )}

            {justCreated && (
              <PlaintextReveal
                token={justCreated}
                copied={copied}
                onCopy={handleCopy}
                onClose={() => setJustCreated(null)}
              />
            )}
          </section>

          {/* token list */}
          <section className="surface overflow-hidden rounded-[6px]">
            <header className="flex items-center justify-between border-b border-[color:var(--color-rule)] px-5 py-3">
              <div className="flex items-center gap-3">
                <h2 className="font-display text-[13px] font-semibold tracking-tight text-[color:var(--color-text-0)]">
                  Existing tokens
                </h2>
                <span className="label-eyebrow">
                  <span className="num text-[color:var(--color-text-0)]">
                    {activeCount}
                  </span>{" "}
                  active · <span className="num">{totalCount}</span> total
                </span>
              </div>
              {tokens.isFetching && (
                <span className="label-eyebrow">syncing</span>
              )}
            </header>

            {tokens.error && (
              <p className="border-b border-[color:var(--color-rule)] px-5 py-3 font-mono text-[11.5px] text-[color:var(--color-err)]">
                ▶ {(tokens.error as Error).message}
              </p>
            )}

            {tokens.data?.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 px-5 py-12 text-center">
                <KeyRound
                  className="size-5 text-[color:var(--color-text-3)]"
                  strokeWidth={1.4}
                />
                <p className="font-display text-[14px] font-semibold tracking-tight text-[color:var(--color-text-0)]">
                  no tokens yet
                </p>
                <p className="max-w-sm text-[12px] leading-relaxed text-[color:var(--color-text-3)]">
                  Issue your first MCP token above and paste it into your MCP
                  client's <code className="font-mono">.mcp.json</code>.
                </p>
              </div>
            ) : (
              <table className="w-full border-separate border-spacing-0 text-[12.5px]">
                <thead>
                  <tr className="text-left">
                    {[
                      "label",
                      "prefix",
                      "issued",
                      "last used",
                      "state",
                      "",
                    ].map((h) => (
                      <th
                        key={h}
                        className="label-eyebrow border-b border-[color:var(--color-rule)] bg-[color:var(--color-ink-1)] px-5 py-2"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tokens.data?.map((t, i) => {
                    const status = tokenStatus(t);
                    return (
                      <tr
                        key={t.id}
                        className={cn(
                          "group transition-colors hover:bg-[color:var(--color-ink-2)]",
                          i % 2 === 1
                            ? "bg-[color:color-mix(in_srgb,var(--color-ink-1)_55%,transparent)]"
                            : undefined,
                          status === "revoked" && "opacity-60",
                        )}
                      >
                        <td className="border-b border-[color:var(--color-rule)] px-5 py-2.5 align-middle">
                          <span className="font-display text-[13px] font-semibold text-[color:var(--color-text-0)]">
                            {t.name}
                          </span>
                        </td>
                        <td className="border-b border-[color:var(--color-rule)] px-5 py-2.5 align-middle">
                          <span className="font-mono text-[11.5px] text-[color:var(--color-text-2)]">
                            {t.prefix}…
                          </span>
                        </td>
                        <td className="border-b border-[color:var(--color-rule)] px-5 py-2.5 align-middle num text-[11.5px] text-[color:var(--color-text-2)]">
                          {formatTimestamp(t.createdAt)}
                        </td>
                        <td className="border-b border-[color:var(--color-rule)] px-5 py-2.5 align-middle num text-[11.5px] text-[color:var(--color-text-2)]">
                          {formatTimestamp(t.lastUsedAt)}
                        </td>
                        <td className="border-b border-[color:var(--color-rule)] px-5 py-2.5 align-middle">
                          {status === "active" ? (
                            <StatusBadge tone="up" withDot>
                              active
                            </StatusBadge>
                          ) : (
                            <StatusBadge tone="muted">revoked</StatusBadge>
                          )}
                        </td>
                        <td className="border-b border-[color:var(--color-rule)] px-5 py-2 align-middle text-right">
                          {status === "active" && (
                            <Button
                              variant="danger"
                              size="sm"
                              disabled={revoke.isPending}
                              onClick={() => handleRevoke(t.id)}
                              className="opacity-60 transition-opacity group-hover:opacity-100"
                            >
                              <Trash2
                                className="size-[12px]"
                                strokeWidth={1.6}
                              />
                              revoke
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function PlaintextReveal({
  token,
  copied,
  onCopy,
  onClose,
}: {
  token: MCPTokenCreated;
  copied: boolean;
  onCopy: () => void;
  onClose: () => void;
}) {
  return (
    <div className="border-t border-[color:color-mix(in_srgb,var(--color-acid)_40%,transparent)] bg-[color:var(--color-acid-soft)] px-5 py-4">
      <div className="flex items-start gap-3">
        <div className="flex size-7 items-center justify-center rounded-[3px] border border-[color:color-mix(in_srgb,var(--color-acid)_55%,transparent)] bg-[color:var(--color-ink-0)]">
          <AlertTriangle
            className="size-[14px] text-[color:var(--color-acid)]"
            strokeWidth={1.6}
          />
        </div>
        <div className="flex-1">
          <p className="font-display text-[12.5px] font-semibold tracking-tight text-[color:var(--color-text-0)]">
            One-time token reveal
          </p>
          <p className="mt-0.5 text-[11.5px] leading-relaxed text-[color:var(--color-text-1)]">
            Copy <span className="font-mono">{token.token.name}</span> now —
            this is the only time the plaintext is shown.
          </p>
          <div className="mt-3 flex items-center gap-2 rounded-[3px] border border-[color:var(--color-rule-bright)] bg-[color:var(--color-ink-0)] px-2.5 py-2">
            <code className="flex-1 break-all font-mono text-[11.5px] text-[color:var(--color-acid)]">
              {token.plaintext}
            </code>
            <button
              onClick={onCopy}
              className={cn(
                "flex h-7 items-center gap-1.5 rounded-[2px] border px-2 font-mono text-[10.5px] uppercase tracking-[0.12em] transition-colors",
                copied
                  ? "border-[color:color-mix(in_srgb,var(--color-up)_45%,transparent)] bg-[color:var(--color-up-soft)] text-[color:var(--color-up)]"
                  : "border-[color:var(--color-rule-bright)] bg-[color:var(--color-ink-1)] text-[color:var(--color-text-1)] hover:text-[color:var(--color-text-0)]",
              )}
            >
              {copied ? (
                <>
                  <ClipboardCheck className="size-[12px]" strokeWidth={1.7} />
                  copied
                </>
              ) : (
                <>
                  <Copy className="size-[12px]" strokeWidth={1.7} />
                  copy
                </>
              )}
            </button>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="close"
          className="flex size-7 items-center justify-center rounded-[3px] text-[color:var(--color-text-2)] hover:bg-[color:var(--color-ink-2)] hover:text-[color:var(--color-text-0)]"
        >
          <X className="size-[14px]" strokeWidth={1.6} />
        </button>
      </div>
    </div>
  );
}
