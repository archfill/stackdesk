import { Trans, useTranslation } from "react-i18next";

import { useCurrentUser, useSetupStatus } from "../hooks/useAuth";
import LoginForm from "./LoginForm";
import SetupWizard from "./SetupWizard";
import { LanguageToggle } from "./ui/LanguageToggle";

interface AuthGateProps {
  children: React.ReactNode;
}

export default function AuthGate({ children }: AuthGateProps) {
  const { t } = useTranslation("common");
  const user = useCurrentUser();
  const setupStatus = useSetupStatus();

  if (user.isLoading || setupStatus.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="label-eyebrow">{t("state.connecting")}</span>
      </div>
    );
  }

  if (setupStatus.data?.needsSetup) return <SetupWizard />;
  if (!user.data) return <LoginForm />;
  return <>{children}</>;
}

/**
 * AuthShell — split-pane chrome shared by Login and Setup screens.
 */
export function AuthShell({
  title,
  subtitle,
  hint,
  status,
  children,
}: {
  title: string;
  subtitle: string;
  hint?: string;
  status?: "login" | "setup";
  children: React.ReactNode;
}) {
  const { t } = useTranslation("auth");
  const stepKey = status === "setup" ? "shell.stepSetup" : "shell.stepLogin";

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.1fr_1fr]">
      <BrandingPane status={status ?? "login"} />
      <section className="relative flex items-center justify-center px-6 py-12 lg:px-16">
        <div className="absolute right-6 top-6 lg:right-12 lg:top-10">
          <LanguageToggle />
        </div>
        <div className="w-full max-w-[380px]">
          <div className="reveal delay-1 mb-1 flex items-center gap-2">
            <span className="label-eyebrow">{t(stepKey)}</span>
          </div>
          <h1 className="reveal delay-2 font-display text-[26px] font-semibold leading-[1.15] tracking-[-0.02em] text-[color:var(--color-text-0)]">
            {title}
          </h1>
          <p className="reveal delay-3 mt-2 text-[13.5px] text-[color:var(--color-text-2)]">
            {subtitle}
          </p>
          <div className="reveal delay-4 mt-7">{children}</div>
          {hint && (
            <p className="reveal delay-5 mt-6 text-[11.5px] leading-relaxed text-[color:var(--color-text-3)]">
              {hint}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function BrandingPane({ status }: { status: "login" | "setup" }) {
  const { t } = useTranslation("auth");
  return (
    <aside className="terminal-bg relative hidden flex-col justify-between overflow-hidden border-r border-[color:var(--color-rule)] bg-[color:var(--color-ink-0)] px-12 py-12 lg:flex">
      <pre
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 select-none font-mono text-[8px] leading-[10px] text-[color:var(--color-rule-bright)] opacity-50"
      >{`
+----+----+----+----+----+----+----+----+
|    |    |    |    |    |    |    |    |
+----+----+----+----+----+----+----+----+
|    | ◯◯◯|    |   ▮▮▮  |    |    |    |
+----+----+----+----+----+----+----+----+
|    |    |    |    |    |    |    |    |
+----+----+----+----+----+----+----+----+`}</pre>

      <header className="reveal relative z-10 flex items-center gap-3">
        <BrandMark />
        <div className="flex flex-col leading-none">
          <span className="font-display text-[15px] font-semibold tracking-tight text-[color:var(--color-text-0)]">
            StackDesk
          </span>
          <span className="label-eyebrow mt-1.5">operator console</span>
        </div>
      </header>

      <div className="relative z-10">
        <div className="reveal delay-2 mb-6 flex items-center gap-2">
          <span className="status-dot up" />
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-text-2)]">
            {t("shell.hostLinkReady")}
          </span>
        </div>
        <h2 className="reveal delay-3 max-w-[20ch] font-display text-[44px] font-semibold leading-[1.02] tracking-[-0.03em] text-[color:var(--color-text-0)]">
          <Trans
            i18nKey="shell.headlineLogin"
            t={t}
            components={{
              accent: <span className="text-[color:var(--color-acid)]" />,
              br: <br />,
            }}
          />
        </h2>
        <p className="reveal delay-4 mt-5 max-w-[36ch] text-[13.5px] leading-relaxed text-[color:var(--color-text-2)]">
          {t("shell.blurb")}
        </p>

        <div className="reveal delay-5 mt-10 grid max-w-[420px] grid-cols-3 gap-3">
          {(
            [
              ["composeProjects", "composeProjectsValue"],
              ["mcp", "mcpValue"],
              ["auth", "authValue"],
            ] as const
          ).map(([labelKey, valueKey]) => (
            <div
              key={labelKey}
              className="surface px-3 py-3"
              style={{ borderRadius: 4 }}
            >
              <div className="label-eyebrow">
                {t(`shell.facts.${labelKey}`)}
              </div>
              <div className="mt-1 font-mono text-[11.5px] text-[color:var(--color-text-1)]">
                {t(`shell.facts.${valueKey}`)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <footer className="relative z-10 flex items-end justify-between">
        <div className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-[color:var(--color-text-3)]">
          {status === "setup" ? t("shell.footerSetup") : t("shell.footerLogin")}
        </div>
        <div className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-[color:var(--color-text-3)]">
          {t("shell.build", { hash: buildShortHash() })}
        </div>
      </footer>
    </aside>
  );
}

function BrandMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect
        x="2"
        y="2"
        width="24"
        height="24"
        stroke="var(--color-acid)"
        strokeWidth="1"
      />
      <rect
        x="6"
        y="6"
        width="16"
        height="16"
        stroke="var(--color-rule-bright)"
        strokeWidth="1"
      />
      <rect x="10" y="10" width="8" height="8" fill="var(--color-acid)" />
      <path
        d="M2 14 L26 14 M14 2 L14 26"
        stroke="var(--color-rule)"
        strokeWidth="1"
      />
    </svg>
  );
}

function buildShortHash() {
  const chars = "abcdef0123456789";
  let s = "";
  for (let i = 0; i < 7; i++)
    s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}
