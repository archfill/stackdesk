import { useState } from "react";
import { ShieldCheck } from "lucide-react";

import { useSetup } from "../hooks/useAuth";
import { AuthShell } from "./AuthGate";
import { Button } from "./ui/button";
import { Field } from "./ui/Field";

export default function SetupWizard() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const setup = useSetup();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (password.length < 8) {
      setLocalError("password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      setLocalError("password confirmation does not match");
      return;
    }
    setup.mutate({ username: username.trim(), password });
  };

  const err = localError ?? (setup.error as Error)?.message;

  return (
    <AuthShell
      status="setup"
      title="Bootstrap your operator"
      subtitle="No accounts exist on this host yet. Create the first administrator below — they will own user management and MCP token issuance."
      hint="This is a one-time setup. After creation, you will land in the dashboard signed in. Subsequent users are added from the Users page (admin only)."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <Field
          label="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          spellCheck={false}
          autoFocus
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
          hint="8 characters minimum · bcrypt cost 10"
        />
        <Field
          label="confirm password"
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
            {setup.isPending ? "provisioning" : "create admin"}
          </span>
          <span className="flex items-center gap-1.5 font-semibold tracking-tight">
            initialize
            <ShieldCheck className="size-4" />
          </span>
        </Button>
      </form>
    </AuthShell>
  );
}
