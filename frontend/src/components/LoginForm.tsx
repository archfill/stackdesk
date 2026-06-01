import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useLogin } from "../hooks/useAuth";
import { translateError } from "../lib/translateError";
import { AuthShell } from "./AuthGate";
import { Button } from "./ui/button";
import { Field } from "./ui/Field";

export default function LoginForm() {
  const { t } = useTranslation("auth");
  const { t: tErr } = useTranslation("errors");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const login = useLogin();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate({ username: username.trim(), password });
  };

  return (
    <AuthShell
      status="login"
      title={t("login.title")}
      subtitle={t("login.subtitle")}
      hint={t("login.hint")}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <Field
          label={t("login.username")}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          spellCheck={false}
          autoFocus
          required
        />
        <Field
          label={t("login.password")}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
        {login.error && (
          <p className="font-mono text-[11.5px] text-[color:var(--color-err)]">
            ▶ {translateError(login.error, tErr)}
          </p>
        )}
        <Button
          type="submit"
          variant="accent"
          size="lg"
          disabled={login.isPending || !username || !password}
          className="mt-2 justify-between"
        >
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] opacity-70">
            {login.isPending
              ? t("login.submitPending")
              : t("login.submitDefault")}
          </span>
          <span className="flex items-center gap-1.5 font-semibold tracking-tight">
            {t("login.continue")}
            <ArrowRight className="size-4" />
          </span>
        </Button>
      </form>
    </AuthShell>
  );
}
