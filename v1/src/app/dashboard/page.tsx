import Link from "next/link";
import { AppShell, FoundationNotice } from "@/components/app-shell";
import { requireTeacher } from "@/lib/auth/viewer";

export default async function DashboardPage() {
  await requireTeacher();

  return (
    <AppShell
      eyebrow="Teacher"
      title="내 수업 방"
      description="교사가 소유한 방 목록과 새 방 만들기가 연결될 자리입니다."
    >
      <ul className="route-list">
        <li>
          <Link href="/room/example">
            <strong>예시 수업 방</strong>
            <span>/room/example</span>
          </Link>
        </li>
      </ul>
      <FoundationNotice />
    </AppShell>
  );
}
