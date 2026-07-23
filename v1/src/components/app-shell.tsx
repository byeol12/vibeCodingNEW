import Link from "next/link";
import type { ReactNode } from "react";

type AppShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
};

export function AppShell({
  eyebrow,
  title,
  description,
  children,
}: AppShellProps) {
  return (
    <main className="shell">
      <header className="shell__header">
        <Link className="brand" href="/">
          도장 스트릭
        </Link>
        <span className="status-chip">v1 beta</span>
      </header>
      <section className="panel">
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
