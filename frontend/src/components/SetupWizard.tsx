import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useSetup } from "../hooks/useAuth";
import { translateError } from "../lib/translateError";
import { AuthShell } from "./AuthGate";
import { Button } from "./ui/button";
import { Field } from "./ui/Field";

export default function SetupWizard() {
  const { t } = useTranslation("auth");
  const { t: tErr } = useTranslation("errors");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const setup = useSetup();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (password.length < 8) {
      setLocalError(t("setup.errors.passwordTooShort"));
      return;
    }
    if (password !== confirm) {
      setLocalError(t("setup.errors.passwordMismatch"));
      return;
    }
    setup.mutate({ username: username.trim(), password });
  };

  const err =
    localError ?? (setup.error ? translateError(setup.error, tErr) : undefined);

  return (
    <AuthShell
      status="setup"
      title={t("setup.title")}
      subtitle={t("setup.subtitle")}
      hint={t("setup.hint")}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <Field
          label={t("setup.username")}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          spellCheck={false}
          autoFocus
          required
        />
        <Field
          label={t("setup.password")}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
          minLength={8}
          hint={t("setup.passwordHint")}
        />
        <Field
          label={t("setup.confirmPassword")}
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          required
          minLength={8}
        />
        {err && (
          <p className="font-mono text-[11.5px] text-[color:var(--color-err)]">
            ▶ {err}
          </p>
        )}
        <Button
          type="submit"
          variant="accent"
          size="lg"
          disabled={
            setup.isPending || !username || !password || password !== confirm
          }
          className="mt-2 justify-between"
        >
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] opacity-70">
            {setup.isPending
              ? t("setup.submitPending")
              : t("setup.submitDefault")}
          </span>
          <span className="flex items-center gap-1.5 font-semibold tracking-tight">
            {t("setup.initialize")}
            <ShieldCheck className="size-4" />
          </span>
        </Button>
      </form>
    </AuthShell>
  );
}
