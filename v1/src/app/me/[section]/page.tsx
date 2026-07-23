import { notFound } from "next/navigation";
import { AppShell, FoundationNotice } from "@/components/app-shell";
import { requireStudent } from "@/lib/auth/viewer";

type StudentSectionPageProps = {
  params: Promise<{ section: string }>;
};

const sectionCopy: Record<string, { title: string; description: string }> = {
  dex: {
    title: "카드 도감",
    description: "획득 카드와 아직 잠긴 수업일 슬롯을 보여줍니다.",
  },
  shop: {
    title: "보상 상점",
    description: "사용 가능한 포인트로 교사가 등록한 보상을 요청합니다.",
  },
  stats: {
    title: "내 성장 그래프",
    description: "월별 도장, 평가 완료율, 자기관찰 추이를 보여줍니다.",
  },
};

export default async function StudentSectionPage({
  params,
}: StudentSectionPageProps) {
  await requireStudent();
  const { section } = await params;
  const copy = sectionCopy[section];
  if (!copy) notFound();

  return (
    <AppShell eyebrow="Student" title={copy.title} description={copy.description}>
      <FoundationNotice />
    </AppShell>
  );
}
