import { useState } from "react";
import { useCurrentUser, useSetupStatus } from "../hooks/useAuth";
import LoginForm from "./LoginForm";
import SetupWizard from "./SetupWizard";

interface AuthGateProps {
  children: React.ReactNode;
}

export default function AuthGate({ children }: AuthGateProps) {
  const user = useCurrentUser();
  const setupStatus = useSetupStatus();

  // どちらか読み込み中
  if (user.isLoading || setupStatus.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background-light dark:bg-background-dark">
        <p className="text-sm text-gray-500 dark:text-gray-400">読み込み中…</p>
      </div>
    );
  }

  // セットアップ未完了 → ウィザード
  if (setupStatus.data?.needsSetup) {
    return <SetupWizard />;
  }

  // 未ログイン → ログイン画面
  if (!user.data) {
    return <LoginForm />;
  }

  return <>{children}</>;
}

// 共通レイアウト（ログイン/セットアップ画面用）。
// useState を使う子要素を扱いやすくするため export しておく。
export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background-light px-4 dark:bg-background-dark">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h1 className="mb-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </h1>
        {subtitle && (
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            {subtitle}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}

export function FormField({
  label,
  type = "text",
  value,
  onChange,
  autoComplete,
  required,
  minLength,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
}) {
  const [touched, setTouched] = useState(false);
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setTouched(true)}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
      />
      {touched && required && !value && (
        <span className="mt-1 block text-xs text-red-500">必須項目です</span>
      )}
    </label>
  );
}
