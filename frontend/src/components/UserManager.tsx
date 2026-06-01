import { useState } from "react";
import {
  useCreateUser,
  useDeleteUser,
  useUpdateUserRole,
  useUsers,
} from "../hooks/useUsers";
import { useCurrentUser } from "../hooks/useAuth";
import type { AuthUser, UserRole } from "../types";

function formatTimestamp(unix?: number): string {
  if (!unix) return "—";
  return new Date(unix * 1000).toLocaleString();
}

export default function UserManager() {
  const currentUser = useCurrentUser();
  const users = useUsers();
  const create = useCreateUser();
  const updateRole = useUpdateUserRole();
  const del = useDeleteUser();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("member");
  const [localError, setLocalError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (password.length < 8) {
      setLocalError("パスワードは 8 文字以上にしてください");
      return;
    }
    try {
      await create.mutateAsync({
        username: username.trim(),
        password,
        role,
      });
      setUsername("");
      setPassword("");
      setRole("member");
    } catch (err) {
      setLocalError((err as Error).message);
    }
  };

  const handleRoleToggle = (u: AuthUser) => {
    const next: UserRole = u.role === "admin" ? "member" : "admin";
    updateRole.mutate({ id: u.id, role: next });
  };

  const handleDelete = (u: AuthUser) => {
    if (
      !confirm(
        `${u.username} を削除しますか？関連するセッションと MCP トークンも消えます。`,
      )
    ) {
      return;
    }
    del.mutate(u.id);
  };

  return (
    <main className="flex-grow p-8 text-gray-200">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-white">ユーザー管理</h1>
        <p className="mt-1 text-sm text-gray-400">
          docker-manager にログイン可能なユーザーを管理します（admin
          のみアクセス可能）。
        </p>
      </header>

      <section className="mb-6 rounded-lg border border-gray-800 bg-gray-900/40 p-5">
        <h2 className="mb-3 text-sm font-semibold text-white">
          新規ユーザー作成
        </h2>
        <form
          onSubmit={handleCreate}
          className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_2fr_1fr_auto]"
        >
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="ユーザー名"
            autoComplete="off"
            required
            className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="パスワード (8 文字以上)"
            autoComplete="new-password"
            required
            minLength={8}
            className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="member">member</option>
            <option value="admin">admin</option>
          </select>
          <button
            type="submit"
            disabled={create.isPending || !username.trim() || !password}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {create.isPending ? "作成中…" : "作成"}
          </button>
        </form>
        {(localError || create.error) && (
          <p className="mt-2 text-xs text-red-400">
            {localError ?? (create.error as Error).message}
          </p>
        )}
      </section>

      <section className="rounded-lg border border-gray-800 bg-gray-900/40">
        <header className="flex items-center justify-between border-b border-gray-800 px-5 py-3">
          <h2 className="text-sm font-semibold text-white">既存ユーザー</h2>
          {users.isFetching && (
            <span className="text-xs text-gray-500">更新中…</span>
          )}
        </header>

        {users.error && (
          <p className="px-5 py-4 text-xs text-red-400">
            {(users.error as Error).message}
          </p>
        )}

        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-800 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-5 py-2 font-medium">ID</th>
              <th className="px-5 py-2 font-medium">ユーザー名</th>
              <th className="px-5 py-2 font-medium">ロール</th>
              <th className="px-5 py-2 font-medium">作成日</th>
              <th className="px-5 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {users.data?.map((u) => {
              const isSelf = currentUser.data?.id === u.id;
              return (
                <tr
                  key={u.id}
                  className="border-b border-gray-800 last:border-0"
                >
                  <td className="px-5 py-2 text-gray-400">{u.id}</td>
                  <td className="px-5 py-2 font-medium text-gray-100">
                    {u.username}
                    {isSelf && (
                      <span className="ml-2 rounded bg-blue-900/40 px-2 py-0.5 text-xs text-blue-300">
                        you
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs ${
                        u.role === "admin"
                          ? "bg-purple-900/40 text-purple-300"
                          : "bg-gray-800 text-gray-300"
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-2 text-gray-400">
                    {formatTimestamp(u.createdAt)}
                  </td>
                  <td className="px-5 py-2 text-right">
                    <div className="inline-flex gap-2">
                      <button
                        onClick={() => handleRoleToggle(u)}
                        disabled={updateRole.isPending}
                        className="rounded border border-gray-700 px-2 py-1 text-xs text-gray-200 hover:bg-gray-800 disabled:opacity-50"
                      >
                        {u.role === "admin" ? "member に変更" : "admin に昇格"}
                      </button>
                      <button
                        onClick={() => handleDelete(u)}
                        disabled={isSelf || del.isPending}
                        className="rounded border border-red-700/60 px-2 py-1 text-xs text-red-300 hover:bg-red-900/30 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        削除
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {(updateRole.error || del.error) && (
          <p className="px-5 py-2 text-xs text-red-400">
            {(updateRole.error as Error)?.message ??
              (del.error as Error)?.message}
          </p>
        )}
      </section>
    </main>
  );
}
