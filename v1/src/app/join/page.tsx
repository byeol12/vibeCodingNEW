import { AppShell, FoundationNotice } from "@/components/app-shell";

export default function JoinPage() {
  return (
    <AppShell
      eyebrow="Student"
      title="방 코드로 입장"
      description="6자리 코드와 이름을 받아 익명 Auth 세션을 만드는 공개 진입점입니다."
    >
      <FoundationNotice />
    </AppShell>
  );
}
