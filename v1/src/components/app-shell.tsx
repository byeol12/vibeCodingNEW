import Link from "next/link";
import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/theme-toggle";

type AppShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
  /** Replaces the default “함께 성장 중” chip when provided. */
  headerAccessory?: ReactNode;
};

export function AppShell({
  eyebrow,
  title,
  description,
  children,
  headerAccessory,
}: AppShellProps) {
  return (
    <main className="shell">
      <div className="page-sparkles" aria-hidden="true">
        <span>✦</span>
        <span>●</span>
        <span>★</span>
      </div>
      <header className="shell__header">
        <Link className="brand" href="/">
          <span className="brand__mark" aria-hidden="true">
            ★
          </span>
          <span>도장 스트릭</span>
        </Link>
        <div className="shell__tools">
          <ThemeToggle />
          {headerAccessory ?? (
            <span className="status-chip">
              <span aria-hidden="true">●</span> 함께 성장 중
            </span>
          )}
        </div>
      </header>
      <section className="panel">
        <span className="panel__bubble panel__bubble--one" aria-hidden="true" />
        <span className="panel__bubble panel__bubble--two" aria-hidden="true" />
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="lead">{description}</p>
        {children}
      </section>
    </main>
  );
}

export function FoundationNotice() {
  return (
    <div className="notice">
      이 화면은 라우팅과 권한 구조를 검증하기 위한 골격입니다. 실제 기능은 다음
      단계에서 연결합니다.
    </div>
  );
}
