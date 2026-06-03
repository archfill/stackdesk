import { useState } from "react";
import {
  AlertTriangle,
  Braces,
  ClipboardCheck,
  Copy,
  KeyRound,
  PlugZap,
  Trash2,
  X,
} from "lucide-react";
import { Trans, useTranslation } from "react-i18next";

import {
  useCreateMCPToken,
  useMCPTokens,
  useRevokeMCPToken,
} from "../hooks/useTokens";
import { getMCPUrl } from "../api/client";
import { cn } from "../lib/utils";
import { translateError } from "../lib/translateError";
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

type CopyTarget = "endpoint" | "exampleConfig" | "token" | "createdConfig";

function buildClaudeConfig(mcpUrl: string, token: string): string {
  return JSON.stringify(
    {
      mcpServers: {
        stackdesk: {
          type: "http",
          url: mcpUrl,
          headers: { Authorization: `Bearer ${token}` },
        },
      },
    },
    null,
    2,
  );
}

async function copyToClipboard(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      // Fall back for embedded browsers or stricter clipboard permissions.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    if (!document.execCommand("copy")) {
      throw new Error("copy command failed");
    }
  } finally {
    document.body.removeChild(textarea);
  }
}

export default function TokenManager() {
  const { t } = useTranslation("tokens");
  const { t: tErr } = useTranslation("errors");
  const { t: tCommon } = useTranslation("common");

  const tokens = useMCPTokens();
  const create = useCreateMCPToken();
  const revoke = useRevokeMCPToken();
  const [name, setName] = useState("");
  const [justCreated, setJustCreated] = useState<MCPTokenCreated | null>(null);
  const [copiedTarget, setCopiedTarget] = useState<CopyTarget | null>(null);
  const mcpUrl = getMCPUrl();
  const exampleConfig = buildClaudeConfig(mcpUrl, "sdt_xxxxxxxx...");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const res = await create.mutateAsync(name.trim());
    setJustCreated(res);
    setName("");
    setCopiedTarget(null);
  };

  const handleCopy = async (value: string, target: CopyTarget) => {
    try {
      await copyToClipboard(value);
      setCopiedTarget(target);
    } catch {
      setCopiedTarget(null);
    }
  };

  const handleRevoke = (id: number) => {
    if (!confirm(t("list.confirmRevoke"))) return;
    revoke.mutate(id);
  };

  const activeCount = tokens.data?.filter((tok) => !tok.revokedAt).length ?? 0;
  const totalCount = tokens.data?.length ?? 0;

  return (
    <main className="flex flex-1 flex-col">
      <header className="border-b border-[color:var(--color-rule)] bg-[color:var(--color-ink-0)]/80 px-8 py-4 backdrop-blur-sm">
        <div className="flex items-baseline gap-3">
          <h1 className="font-display text-[22px] font-semibold leading-none tracking-[-0.02em] text-[color:var(--color-text-0)]">
            {t("title")}
          </h1>
          <span className="label-eyebrow">
            <Trans
              i18nKey="subtitle"
              t={t}
              components={{
                code: <code className="font-mono" />,
              }}
            />
          </span>
        </div>
        <p className="mt-2 max-w-2xl text-[12.5px] leading-relaxed text-[color:var(--color-text-2)]">
          <Trans
            i18nKey="blurb"
            t={t}
            components={{
              code: <code className="font-mono" />,
              em: <em />,
            }}
          />
        </p>
      </header>

      <div className="flex-1 overflow-auto px-8 py-6">
        <div className="mx-auto flex max-w-5xl flex-col gap-6">
          <section className="surface overflow-hidden rounded-[6px]">
            <header className="flex items-center justify-between border-b border-[color:var(--color-rule)] px-5 py-3">
              <div className="flex items-center gap-2">
                <PlugZap
                  className="size-[14px] text-[color:var(--color-acid)]"
                  strokeWidth={1.6}
                />
                <h2 className="font-display text-[13px] font-semibold tracking-tight text-[color:var(--color-text-0)]">
                  {t("connection.title")}
                </h2>
              </div>
              <span className="label-eyebrow">{t("connection.transport")}</span>
            </header>

            <div className="grid gap-0 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
              <div className="border-b border-[color:var(--color-rule)] px-5 py-4 lg:border-b-0 lg:border-r">
                <p className="label-eyebrow">{t("connection.endpointLabel")}</p>
                <div className="mt-2 flex items-center gap-2 rounded-[3px] border border-[color:var(--color-rule-bright)] bg-[color:var(--color-ink-0)] px-2.5 py-2">
                  <code className="min-w-0 flex-1 break-all font-mono text-[11.5px] text-[color:var(--color-acid)]">
                    {mcpUrl}
                  </code>
                  <CopyButton
                    copied={copiedTarget === "endpoint"}
                    label={tCommon("actions.copy")}
                    copiedLabel={tCommon("actions.copied")}
                    onClick={() => handleCopy(mcpUrl, "endpoint")}
                  />
                </div>
                <p className="mt-3 text-[12px] leading-relaxed text-[color:var(--color-text-2)]">
                  <Trans
                    i18nKey="connection.help"
                    t={t}
                    components={{
                      code: <code className="font-mono" />,
                    }}
                  />
                </p>
              </div>

              <div className="px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="label-eyebrow">{t("connection.configLabel")}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleCopy(exampleConfig, "exampleConfig")
                    }
                  >
                    {copiedTarget === "exampleConfig" ? (
                      <ClipboardCheck strokeWidth={1.7} />
                    ) : (
                      <Copy strokeWidth={1.7} />
                    )}
                    {copiedTarget === "exampleConfig"
                      ? tCommon("actions.copied")
                      : t("connection.copyExample")}
                  </Button>
                </div>
                <pre className="mt-2 max-h-[220px] overflow-auto rounded-[3px] border border-[color:var(--color-rule)] bg-[color:var(--color-ink-0)] p-3 font-mono text-[11.5px] leading-relaxed text-[color:var(--color-text-1)]">
                  {exampleConfig}
                </pre>
              </div>
            </div>
          </section>

          <section className="surface overflow-hidden rounded-[6px]">
            <header className="flex items-center justify-between border-b border-[color:var(--color-rule)] px-5 py-3">
              <div className="flex items-center gap-2">
                <KeyRound
                  className="size-[14px] text-[color:var(--color-acid)]"
                  strokeWidth={1.6}
                />
                <h2 className="font-display text-[13px] font-semibold tracking-tight text-[color:var(--color-text-0)]">
                  {t("issue.title")}
                </h2>
              </div>
              <span className="label-eyebrow">{t("issue.prefix")}</span>
            </header>

            <form
              onSubmit={handleCreate}
              className="flex flex-col gap-3 px-5 py-4 sm:flex-row"
            >
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("issue.placeholder")}
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
                {create.isPending ? t("issue.submitting") : t("issue.submit")}
              </Button>
            </form>
            {create.error && (
              <p className="border-t border-[color:var(--color-rule)] bg-[color:var(--color-err-soft)] px-5 py-2 font-mono text-[11.5px] text-[color:var(--color-err)]">
                ▶ {translateError(create.error, tErr)}
              </p>
            )}

            {justCreated && (
              <PlaintextReveal
                token={justCreated}
                copiedTarget={copiedTarget}
                mcpUrl={mcpUrl}
                onCopy={handleCopy}
                onClose={() => setJustCreated(null)}
              />
            )}
          </section>

          <section className="surface overflow-hidden rounded-[6px]">
            <header className="flex items-center justify-between border-b border-[color:var(--color-rule)] px-5 py-3">
              <div className="flex items-center gap-3">
                <h2 className="font-display text-[13px] font-semibold tracking-tight text-[color:var(--color-text-0)]">
                  {t("list.title")}
                </h2>
                <span className="label-eyebrow">
                  <Trans
                    i18nKey="list.summary"
                    t={t}
                    values={{ active: activeCount, total: totalCount }}
                    components={{
                      strong: (
                        <span className="num text-[color:var(--color-text-0)]" />
                      ),
                    }}
                  />
                </span>
              </div>
              {tokens.isFetching && (
                <span className="label-eyebrow">
                  {tCommon("state.syncing")}
                </span>
              )}
            </header>

            {tokens.error && (
              <p className="border-b border-[color:var(--color-rule)] px-5 py-3 font-mono text-[11.5px] text-[color:var(--color-err)]">
                ▶ {translateError(tokens.error, tErr)}
              </p>
            )}

            {tokens.data?.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 px-5 py-12 text-center">
                <KeyRound
                  className="size-5 text-[color:var(--color-text-3)]"
                  strokeWidth={1.4}
                />
                <p className="font-display text-[14px] font-semibold tracking-tight text-[color:var(--color-text-0)]">
                  {t("list.empty.title")}
                </p>
                <p className="max-w-sm text-[12px] leading-relaxed text-[color:var(--color-text-3)]">
                  <Trans
                    i18nKey="list.empty.subtitle"
                    t={t}
                    components={{
                      code: <code className="font-mono" />,
                    }}
                  />
                </p>
              </div>
            ) : (
              <table className="w-full border-separate border-spacing-0 text-[12.5px]">
                <thead>
                  <tr className="text-left">
                    {(
                      [
                        "label",
                        "prefix",
                        "issued",
                        "lastUsed",
                        "state",
                      ] as const
                    )
                      .map((key) => t(`list.columns.${key}`))
                      .concat([""])
                      .map((label, i) => (
                        <th
                          key={`${label}-${i}`}
                          className="label-eyebrow border-b border-[color:var(--color-rule)] bg-[color:var(--color-ink-1)] px-5 py-2"
                        >
                          {label}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {tokens.data?.map((tok, i) => {
                    const status = tokenStatus(tok);
                    return (
                      <tr
                        key={tok.id}
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
                            {tok.name}
                          </span>
                        </td>
                        <td className="border-b border-[color:var(--color-rule)] px-5 py-2.5 align-middle">
                          <span className="font-mono text-[11.5px] text-[color:var(--color-text-2)]">
                            {tok.prefix}…
                          </span>
                        </td>
                        <td className="border-b border-[color:var(--color-rule)] px-5 py-2.5 align-middle num text-[11.5px] text-[color:var(--color-text-2)]">
                          {formatTimestamp(tok.createdAt)}
                        </td>
                        <td className="border-b border-[color:var(--color-rule)] px-5 py-2.5 align-middle num text-[11.5px] text-[color:var(--color-text-2)]">
                          {formatTimestamp(tok.lastUsedAt)}
                        </td>
                        <td className="border-b border-[color:var(--color-rule)] px-5 py-2.5 align-middle">
                          {status === "active" ? (
                            <StatusBadge tone="up" withDot>
                              {t("list.states.active")}
                            </StatusBadge>
                          ) : (
                            <StatusBadge tone="muted">
                              {t("list.states.revoked")}
                            </StatusBadge>
                          )}
                        </td>
                        <td className="border-b border-[color:var(--color-rule)] px-5 py-2 align-middle text-right">
                          {status === "active" && (
                            <Button
                              variant="danger"
                              size="sm"
                              disabled={revoke.isPending}
                              onClick={() => handleRevoke(tok.id)}
                              className="opacity-60 transition-opacity group-hover:opacity-100"
                            >
                              <Trash2
                                className="size-[12px]"
                                strokeWidth={1.6}
                              />
                              {t("list.revoke")}
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
  copiedTarget,
  mcpUrl,
  onCopy,
  onClose,
}: {
  token: MCPTokenCreated;
  copiedTarget: CopyTarget | null;
  mcpUrl: string;
  onCopy: (value: string, target: CopyTarget) => void;
  onClose: () => void;
}) {
  const { t: tt } = useTranslation("tokens");
  const { t: tCommon } = useTranslation("common");
  const createdConfig = buildClaudeConfig(mcpUrl, token.plaintext);
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
            {tt("reveal.title")}
          </p>
          <p className="mt-0.5 text-[11.5px] leading-relaxed text-[color:var(--color-text-1)]">
            <Trans
              i18nKey="reveal.subtitle"
              ns="tokens"
              values={{ name: token.token.name }}
              components={{ strong: <span className="font-mono" /> }}
            />
          </p>
          <div className="mt-3 flex items-center gap-2 rounded-[3px] border border-[color:var(--color-rule-bright)] bg-[color:var(--color-ink-0)] px-2.5 py-2">
            <code className="flex-1 break-all font-mono text-[11.5px] text-[color:var(--color-acid)]">
              {token.plaintext}
            </code>
            <CopyButton
              copied={copiedTarget === "token"}
              label={tCommon("actions.copy")}
              copiedLabel={tCommon("actions.copied")}
              onClick={() => onCopy(token.plaintext, "token")}
            />
          </div>
          <div className="mt-3 rounded-[3px] border border-[color:var(--color-rule-bright)] bg-[color:var(--color-ink-0)]">
            <div className="flex items-center justify-between gap-3 border-b border-[color:var(--color-rule)] px-2.5 py-2">
              <div className="flex items-center gap-2">
                <Braces
                  className="size-[13px] text-[color:var(--color-text-2)]"
                  strokeWidth={1.6}
                />
                <span className="label-eyebrow">{tt("reveal.configLabel")}</span>
              </div>
              <CopyButton
                copied={copiedTarget === "createdConfig"}
                label={tt("reveal.copyConfig")}
                copiedLabel={tCommon("actions.copied")}
                onClick={() => onCopy(createdConfig, "createdConfig")}
              />
            </div>
            <pre className="max-h-[220px] overflow-auto p-3 font-mono text-[11.5px] leading-relaxed text-[color:var(--color-text-1)]">
              {createdConfig}
            </pre>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label={tCommon("actions.close")}
          className="flex size-7 items-center justify-center rounded-[3px] text-[color:var(--color-text-2)] hover:bg-[color:var(--color-ink-2)] hover:text-[color:var(--color-text-0)]"
        >
          <X className="size-[14px]" strokeWidth={1.6} />
        </button>
      </div>
    </div>
  );
}

function CopyButton({
  copied,
  label,
  copiedLabel,
  onClick,
}: {
  copied: boolean;
  label: string;
  copiedLabel: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-7 shrink-0 items-center gap-1.5 rounded-[2px] border px-2 font-mono text-[10.5px] uppercase tracking-[0.12em] transition-colors",
        copied
          ? "border-[color:color-mix(in_srgb,var(--color-up)_45%,transparent)] bg-[color:var(--color-up-soft)] text-[color:var(--color-up)]"
          : "border-[color:var(--color-rule-bright)] bg-[color:var(--color-ink-1)] text-[color:var(--color-text-1)] hover:text-[color:var(--color-text-0)]",
      )}
    >
      {copied ? (
        <ClipboardCheck className="size-[12px]" strokeWidth={1.7} />
      ) : (
        <Copy className="size-[12px]" strokeWidth={1.7} />
      )}
      {copied ? copiedLabel : label}
    </button>
  );
}
