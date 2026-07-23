import { notFound } from "next/navigation";
import { AppShell, FoundationNotice } from "@/components/app-shell";
import { requireTeacher } from "@/lib/auth/viewer";

type RoomSectionPageProps = {
  params: Promise<{ roomId: string; section: string }>;
};

const sectionCopy: Record<string, { title: string; description: string }> = {
  shop: {
    title: "상점 편집",
    description: "보상 목록의 추가·수정·삭제와 구매 한도를 관리합니다.",
  },
  art: {
    title: "카드 아트 등록",
    description: "등급별 이미지를 방 전용 Storage 경로에 등록합니다.",
  },
  report: {
    title: "학생 진척도",
    description: "평가, 스트릭, 자기관찰 데이터를 집계해 보여줍니다.",
  },
  approve: {
    title: "보상 승인",
    description: "학생의 구매 요청을 승인하거나 거절합니다.",
  },
};

export default async function RoomSectionPage({
  params,
}: RoomSectionPageProps) {
  await requireTeacher();
  const { roomId, section } = await params;
  const copy = sectionCopy[section];
  if (!copy) notFound();

  return (
    <AppShell
      eyebrow={`Room ${roomId}`}
      title={copy.title}
      description={copy.description}
    >
      <FoundationNotice />
    </AppShell>
  );
}
