import { useState } from "react";
import { useSetup } from "../hooks/useAuth";
import { AuthCard, FormField } from "./AuthGate";

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
      setLocalError("パスワードは 8 文字以上にしてください");
      return;
    }
    if (password !== confirm) {
      setLocalError("確認用パスワードが一致しません");
      return;
    }
    setup.mutate({ username: username.trim(), password });
  };

  return (
    <AuthCard
      title="初期セットアップ"
      subtitle="最初の管理者ユーザーを作成します"
    >
      <form onSubmit={handleSubmit} noValidate>
        <FormField
          label="ユーザー名"
          value={username}
          onChange={setUsername}
          autoComplete="username"
          required
        />
        <FormField
          label="パスワード (8 文字以上)"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          required
          minLength={8}
        />
        <FormField
          label="パスワード (確認)"
          type="password"
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
          required
          minLength={8}
        />
        {(localError || setup.error) && (
          <p className="mb-3 text-xs text-red-500">
            {localError ?? (setup.error as Error).message}
          </p>
        )}
        <button
          type="submit"
          disabled={
            setup.isPending || !username || !password || password !== confirm
          }
          className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {setup.isPending ? "作成中…" : "管理者を作成してログイン"}
        </button>
      </form>
    </AuthCard>
  );
}
