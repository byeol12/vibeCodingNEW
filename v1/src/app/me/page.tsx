import Link from "next/link";
import { AppShell, FoundationNotice } from "@/components/app-shell";
import { requireStudent } from "@/lib/auth/viewer";

const sections = [
  ["dex", "카드 도감"],
  ["shop", "보상 상점"],
  ["stats", "성장 그래프"],
] as const;

export default async function StudentHomePage() {
  const viewer = await requireStudent();

  return (
    <AppShell
      eyebrow="Student home"
      title={viewer.status === "pending" ? "입장 승인 대기" : "오늘의 카드"}
      description="학생의 카드, 스트릭, 사용 가능한 포인트를 보여줄 홈 화면입니다."
    >
      <ul className="route-list">
        {sections.map(([path, label]) => (
          <li key={path}>
            <Link href={`/me/${path}`}>
              <strong>{label}</strong>
              <span>/me/{path}</span>
            </Link>
          </li>
        ))}
      </ul>
      <FoundationNotice />
    </AppShell>
  );
}
