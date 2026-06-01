import { useState } from "react";
import { useLogin } from "../hooks/useAuth";
import { AuthCard, FormField } from "./AuthGate";

export default function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const login = useLogin();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate({ username: username.trim(), password });
  };

  return (
    <AuthCard title="docker-manager" subtitle="ログインしてください">
      <form onSubmit={handleSubmit} noValidate>
        <FormField
          label="ユーザー名"
          value={username}
          onChange={setUsername}
          autoComplete="username"
          required
        />
        <FormField
          label="パスワード"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          required
        />
        {login.error && (
          <p className="mb-3 text-xs text-red-500">
            {(login.error as Error).message}
          </p>
        )}
        <button
          type="submit"
          disabled={login.isPending || !username || !password}
          className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {login.isPending ? "ログイン中…" : "ログイン"}
        </button>
      </form>
    </AuthCard>
  );
}
