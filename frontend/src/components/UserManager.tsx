import { useState } from "react";
import { ShieldCheck, Trash2, UserPlus } from "lucide-react";

import { useCurrentUser } from "../hooks/useAuth";
import {
  useCreateUser,
  useDeleteUser,
  useUpdateUserRole,
  useUsers,
} from "../hooks/useUsers";
import { cn } from "../lib/utils";
import type { AuthUser, UserRole } from "../types";
import { Button } from "./ui/button";
import { Field, SelectField } from "./ui/Field";
import { StatusBadge } from "./ui/StatusBadge";

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
      setLocalError("password must be at least 8 characters");
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
    )
      return;
    del.mutate(u.id);
  };

  const adminCount = users.data?.filter((u) => u.role === "admin").length ?? 0;
  const memberCount =
    users.data?.filter((u) => u.role === "member").length ?? 0;

  return (
    <main className="flex flex-1 flex-col">
      <header className="border-b border-[color:var(--color-rule)] bg-[color:var(--color-ink-0)]/80 px-8 py-4 backdrop-blur-sm">
        <div className="flex items-baseline gap-3">
          <h1 className="font-display text-[22px] font-semibold leading-none tracking-[-0.02em] text-[color:var(--color-text-0)]">
            Users
          </h1>
          <span className="label-eyebrow">
            <span className="num text-[color:var(--color-text-2)]">
              {adminCount}
            </span>{" "}
            admin ·{" "}
            <span className="num text-[color:var(--color-text-2)]">
              {memberCount}
            </span>{" "}
            member
          </span>
        </div>
        <p className="mt-2 max-w-2xl text-[12.5px] leading-relaxed text-[color:var(--color-text-2)]">
          Administrators can sign in, manage other users, and issue their own
          MCP tokens. Members have container access but cannot reach this
          screen.
        </p>
      </header>

      <div className="flex-1 overflow-auto px-8 py-6">
        <div className="mx-auto flex max-w-5xl flex-col gap-6">
          {/* create user */}
          <section className="surface overflow-hidden rounded-[6px]">
            <header className="flex items-center justify-between border-b border-[color:var(--color-rule)] px-5 py-3">
              <div className="flex items-center gap-2">
                <UserPlus
                  className="size-[14px] text-[color:var(--color-acid)]"
                  strokeWidth={1.6}
                />
                <h2 className="font-display text-[13px] font-semibold tracking-tight text-[color:var(--color-text-0)]">
                  Add user
                </h2>
              </div>
              <span className="label-eyebrow">bcrypt · cost 10</span>
            </header>

            <form
              onSubmit={handleCreate}
              className="grid grid-cols-1 gap-3 px-5 py-4 sm:grid-cols-[2fr_2fr_1fr_auto] sm:items-end"
            >
              <Field
                label="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                required
              />
              <Field
                label="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
              />
              <SelectField
                label="role"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                options={[
                  { value: "member", label: "member" },
                  { value: "admin", label: "admin" },
                ]}
              />
              <Button
                type="submit"
                variant="accent"
                size="md"
                disabled={create.isPending || !username.trim() || !password}
                className="sm:h-9"
              >
                {create.isPending ? "creating…" : "create"}
              </Button>
            </form>
            {(localError || create.error) && (
              <p className="border-t border-[color:var(--color-rule)] bg-[color:var(--color-err-soft)] px-5 py-2 font-mono text-[11.5px] text-[color:var(--color-err)]">
                ▶ {localError ?? (create.error as Error).message}
              </p>
            )}
          </section>

          {/* users table */}
          <section className="surface overflow-hidden rounded-[6px]">
            <header className="flex items-center justify-between border-b border-[color:var(--color-rule)] px-5 py-3">
              <h2 className="font-display text-[13px] font-semibold tracking-tight text-[color:var(--color-text-0)]">
                Operators
              </h2>
              {users.isFetching && (
                <span className="label-eyebrow">syncing</span>
              )}
            </header>

            {users.error && (
              <p className="border-b border-[color:var(--color-rule)] px-5 py-3 font-mono text-[11.5px] text-[color:var(--color-err)]">
                ▶ {(users.error as Error).message}
              </p>
            )}

            <table className="w-full border-separate border-spacing-0 text-[12.5px]">
              <thead>
                <tr className="text-left">
                  {["id", "user", "role", "created", "", ""].map((h, i) => (
                    <th
                      key={`${h}-${i}`}
                      className="label-eyebrow border-b border-[color:var(--color-rule)] bg-[color:var(--color-ink-1)] px-5 py-2"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.data?.map((u, i) => {
                  const isSelf = currentUser.data?.id === u.id;
                  return (
                    <tr
                      key={u.id}
                      className={cn(
                        "group transition-colors hover:bg-[color:var(--color-ink-2)]",
                        i % 2 === 1
                          ? "bg-[color:color-mix(in_srgb,var(--color-ink-1)_55%,transparent)]"
                          : undefined,
                      )}
                    >
                      <td className="border-b border-[color:var(--color-rule)] px-5 py-2.5 align-middle num text-[11.5px] text-[color:var(--color-text-3)]">
                        #{u.id.toString().padStart(3, "0")}
                      </td>
                      <td className="border-b border-[color:var(--color-rule)] px-5 py-2.5 align-middle">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={u.username} />
                          <div className="flex flex-col leading-tight">
                            <span className="font-display text-[13px] font-semibold tracking-tight text-[color:var(--color-text-0)]">
                              {u.username}
                            </span>
                            {isSelf && (
                              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--color-acid)]">
                                you
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="border-b border-[color:var(--color-rule)] px-5 py-2.5 align-middle">
                        {u.role === "admin" ? (
                          <StatusBadge tone="admin">
                            <ShieldCheck
                              className="size-[10px]"
                              strokeWidth={2}
                            />
                            admin
                          </StatusBadge>
                        ) : (
                          <StatusBadge tone="member">member</StatusBadge>
                        )}
                      </td>
                      <td className="border-b border-[color:var(--color-rule)] px-5 py-2.5 align-middle num text-[11.5px] text-[color:var(--color-text-2)]">
                        {formatTimestamp(u.createdAt)}
                      </td>
                      <td className="border-b border-[color:var(--color-rule)] px-5 py-2 align-middle text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={updateRole.isPending}
                          onClick={() => handleRoleToggle(u)}
                        >
                          {u.role === "admin" ? "↓ member" : "↑ admin"}
                        </Button>
                      </td>
                      <td className="border-b border-[color:var(--color-rule)] px-5 py-2 align-middle text-right">
                        <Button
                          variant="danger"
                          size="sm"
                          disabled={isSelf || del.isPending}
                          onClick={() => handleDelete(u)}
                          className="opacity-60 transition-opacity group-hover:opacity-100"
                        >
                          <Trash2 className="size-[12px]" strokeWidth={1.6} />
                          delete
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {(updateRole.error || del.error) && (
              <p className="border-t border-[color:var(--color-rule)] bg-[color:var(--color-err-soft)] px-5 py-2 font-mono text-[11.5px] text-[color:var(--color-err)]">
                ▶{" "}
                {(updateRole.error as Error)?.message ??
                  (del.error as Error)?.message}
              </p>
            )}
          </section>
        </div>
      </div>
    </main>
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
