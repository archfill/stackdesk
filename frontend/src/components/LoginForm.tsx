import { useState } from "react";
import { ArrowRight } from "lucide-react";

import { useLogin } from "../hooks/useAuth";
import { AuthShell } from "./AuthGate";
import { Button } from "./ui/button";
import { Field } from "./ui/Field";

export default function LoginForm() {
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
      title="Sign in to continue"
      subtitle="Authenticate with your operator credentials to reach the host."
      hint="Lost your password? An admin can reset it from the Users page after signing in. The MCP endpoint uses its own bearer tokens — issue them from Tokens once logged in."
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
          autoComplete="current-password"
          required
        />
        {login.error && (
          <p className="font-mono text-[11.5px] text-[color:var(--color-err)]">
            ▶ {(login.error as Error).message}
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
            {login.isPending ? "authenticating" : "sign in"}
          </span>
          <span className="flex items-center gap-1.5 font-semibold tracking-tight">
            continue
            <ArrowRight className="size-4" />
          </span>
        </Button>
      </form>
    </AuthShell>
  );
}
