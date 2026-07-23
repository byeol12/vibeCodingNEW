import Link from "next/link";
import { AppShell, FoundationNotice } from "@/components/app-shell";
import { requireTeacher } from "@/lib/auth/viewer";

type RoomPageProps = {
  params: Promise<{ roomId: string }>;
};

const sections = [
  ["shop", "상점 편집"],
  ["art", "카드 아트"],
  ["report", "진척도"],
  ["approve", "승인 대기"],
] as const;

export default async function RoomPage({ params }: RoomPageProps) {
  await requireTeacher();
  const { roomId } = await params;

  return (
    <AppShell
      eyebrow="Teacher room"
      title="오늘 수업 평가"
      description={`방 ${roomId}의 3항목 평가와 교사 피드백이 들어갈 기본 경로입니다.`}
    >
      <ul className="route-list">
        {sections.map(([path, label]) => (
          <li key={path}>
            <Link href={`/room/${roomId}/${path}`}>
              <strong>{label}</strong>
              <span>{path}</span>
            </Link>
          </li>
        ))}
      </ul>
      <FoundationNotice />
    </AppShell>
  );
}
