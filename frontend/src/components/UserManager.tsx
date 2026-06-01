import { useState } from "react";
import { ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";

import { useCurrentUser } from "../hooks/useAuth";
import {
  useCreateUser,
  useDeleteUser,
  useUpdateUserRole,
  useUsers,
} from "../hooks/useUsers";
import { cn } from "../lib/utils";
import { translateError } from "../lib/translateError";
import type { AuthUser, UserRole } from "../types";
import { Button } from "./ui/button";
import { Field, SelectField } from "./ui/Field";
import { StatusBadge } from "./ui/StatusBadge";

function formatTimestamp(unix?: number): string {
  if (!unix) return "—";
  return new Date(unix * 1000).toLocaleString();
}

export default function UserManager() {
  const { t } = useTranslation("users");
  const { t: tErr } = useTranslation("errors");
  const { t: tCommon } = useTranslation("common");

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
      setLocalError(t("create.errors.passwordTooShort"));
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
      setLocalError(translateError(err, tErr));
    }
  };

  const handleRoleToggle = (u: AuthUser) => {
    const next: UserRole = u.role === "admin" ? "member" : "admin";
    updateRole.mutate({ id: u.id, role: next });
  };

  const handleDelete = (u: AuthUser) => {
    if (!confirm(t("list.actions.confirmDelete", { username: u.username })))
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
            {t("title")}
          </h1>
          <span className="label-eyebrow">
            <Trans
              i18nKey="summary"
              t={t}
              values={{ admins: adminCount, members: memberCount }}
              components={{
                strong: (
                  <span className="num text-[color:var(--color-text-2)]" />
                ),
              }}
            />
          </span>
        </div>
        <p className="mt-2 max-w-2xl text-[12.5px] leading-relaxed text-[color:var(--color-text-2)]">
          {t("blurb")}
        </p>
      </header>

      <div className="flex-1 overflow-auto px-8 py-6">
        <div className="mx-auto flex max-w-5xl flex-col gap-6">
          <section className="surface overflow-hidden rounded-[6px]">
            <header className="flex items-center justify-between border-b border-[color:var(--color-rule)] px-5 py-3">
              <div className="flex items-center gap-2">
                <UserPlus
                  className="size-[14px] text-[color:var(--color-acid)]"
                  strokeWidth={1.6}
                />
                <h2 className="font-display text-[13px] font-semibold tracking-tight text-[color:var(--color-text-0)]">
                  {t("create.title")}
                </h2>
              </div>
              <span className="label-eyebrow">{t("create.hint")}</span>
            </header>

            <form
              onSubmit={handleCreate}
              className="grid grid-cols-1 gap-3 px-5 py-4 sm:grid-cols-[2fr_2fr_1fr_auto] sm:items-end"
            >
              <Field
                label={t("create.username")}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                required
              />
              <Field
                label={t("create.password")}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
              />
              <SelectField
                label={t("create.role")}
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                options={[
                  { value: "member", label: t("list.roles.member") },
                  { value: "admin", label: t("list.roles.admin") },
                ]}
              />
              <Button
                type="submit"
                variant="accent"
                size="md"
                disabled={create.isPending || !username.trim() || !password}
                className="sm:h-9"
              >
                {create.isPending ? t("create.submitting") : t("create.submit")}
              </Button>
            </form>
            {(localError || create.error) && (
              <p className="border-t border-[color:var(--color-rule)] bg-[color:var(--color-err-soft)] px-5 py-2 font-mono text-[11.5px] text-[color:var(--color-err)]">
                ▶ {localError ?? translateError(create.error, tErr)}
              </p>
            )}
          </section>

          <section className="surface overflow-hidden rounded-[6px]">
            <header className="flex items-center justify-between border-b border-[color:var(--color-rule)] px-5 py-3">
              <h2 className="font-display text-[13px] font-semibold tracking-tight text-[color:var(--color-text-0)]">
                {t("list.title")}
              </h2>
              {users.isFetching && (
                <span className="label-eyebrow">
                  {tCommon("state.syncing")}
                </span>
              )}
            </header>

            {users.error && (
              <p className="border-b border-[color:var(--color-rule)] px-5 py-3 font-mono text-[11.5px] text-[color:var(--color-err)]">
                ▶ {translateError(users.error, tErr)}
              </p>
            )}

            <table className="w-full border-separate border-spacing-0 text-[12.5px]">
              <thead>
                <tr className="text-left">
                  {[
                    t("list.columns.id"),
                    t("list.columns.user"),
                    t("list.columns.role"),
                    t("list.columns.created"),
                    "",
                    "",
                  ].map((label, i) => (
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
                                {t("list.you")}
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
                            {t("list.roles.admin")}
                          </StatusBadge>
                        ) : (
                          <StatusBadge tone="member">
                            {t("list.roles.member")}
                          </StatusBadge>
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
                          {u.role === "admin"
                            ? t("list.actions.demote")
                            : t("list.actions.promote")}
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
                          {t("list.actions.delete")}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {(updateRole.error || del.error) && (
              <p className="border-t border-[color:var(--color-rule)] bg-[color:var(--color-err-soft)] px-5 py-2 font-mono text-[11.5px] text-[color:var(--color-err)]">
                ▶ {translateError(updateRole.error ?? del.error, tErr)}
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
