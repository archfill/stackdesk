import { useState } from "react";
import {
  useCreateMCPToken,
  useMCPTokens,
  useRevokeMCPToken,
} from "../hooks/useTokens";
import type { MCPToken, MCPTokenCreated } from "../types";

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

  return (
    <main className="flex-grow p-8 text-gray-200">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-white">MCP トークン</h1>
        <p className="mt-1 text-sm text-gray-400">
          MCP クライアントが docker-manager に接続するための Bearer
          トークンを発行・失効します。
        </p>
      </header>

      <section className="mb-6 rounded-lg border border-gray-800 bg-gray-900/40 p-5">
        <h2 className="mb-3 text-sm font-semibold text-white">
          新規トークンの発行
        </h2>
        <form
          onSubmit={handleCreate}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: my-mac-laptop"
            className="flex-grow rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            type="submit"
            disabled={create.isPending || !name.trim()}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {create.isPending ? "発行中…" : "発行"}
          </button>
        </form>
        {create.error && (
          <p className="mt-2 text-xs text-red-400">
            {(create.error as Error).message}
          </p>
        )}

        {justCreated && (
          <div className="mt-4 rounded-md border border-yellow-700/60 bg-yellow-900/20 p-3">
            <p className="text-xs font-semibold text-yellow-200">
              トークンを 1 度だけ表示します。閉じる前に控えてください。
            </p>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-grow break-all rounded bg-black/40 px-2 py-1 font-mono text-xs text-yellow-100">
                {justCreated.plaintext}
              </code>
              <button
                onClick={handleCopy}
                className="rounded border border-yellow-700 px-2 py-1 text-xs text-yellow-200 hover:bg-yellow-900/40"
              >
                {copied ? "コピー済み" : "コピー"}
              </button>
              <button
                onClick={() => setJustCreated(null)}
                className="rounded px-2 py-1 text-xs text-yellow-200 hover:bg-yellow-900/40"
              >
                閉じる
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-gray-800 bg-gray-900/40">
        <header className="flex items-center justify-between border-b border-gray-800 px-5 py-3">
          <h2 className="text-sm font-semibold text-white">既存のトークン</h2>
          {tokens.isFetching && (
            <span className="text-xs text-gray-500">更新中…</span>
          )}
        </header>

        {tokens.error && (
          <p className="px-5 py-4 text-xs text-red-400">
            {(tokens.error as Error).message}
          </p>
        )}

        {tokens.data?.length === 0 ? (
          <p className="px-5 py-6 text-sm text-gray-500">
            まだトークンはありません。上のフォームから発行してください。
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-800 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-2 font-medium">名前</th>
                <th className="px-5 py-2 font-medium">プレフィックス</th>
                <th className="px-5 py-2 font-medium">発行日</th>
                <th className="px-5 py-2 font-medium">最終利用</th>
                <th className="px-5 py-2 font-medium">状態</th>
                <th className="px-5 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {tokens.data?.map((t) => {
                const status = tokenStatus(t);
                return (
                  <tr
                    key={t.id}
                    className="border-b border-gray-800 last:border-0"
                  >
                    <td className="px-5 py-2 font-medium text-gray-100">
                      {t.name}
                    </td>
                    <td className="px-5 py-2 font-mono text-xs text-gray-400">
                      {t.prefix}…
                    </td>
                    <td className="px-5 py-2 text-gray-400">
                      {formatTimestamp(t.createdAt)}
                    </td>
                    <td className="px-5 py-2 text-gray-400">
                      {formatTimestamp(t.lastUsedAt)}
                    </td>
                    <td className="px-5 py-2">
                      {status === "active" ? (
                        <span className="rounded bg-green-900/40 px-2 py-0.5 text-xs text-green-300">
                          有効
                        </span>
                      ) : (
                        <span className="rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-400">
                          失効済み
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-2 text-right">
                      {status === "active" && (
                        <button
                          onClick={() => handleRevoke(t.id)}
                          disabled={revoke.isPending}
                          className="rounded border border-red-700/60 px-2 py-1 text-xs text-red-300 hover:bg-red-900/30 disabled:opacity-50"
                        >
                          失効
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
