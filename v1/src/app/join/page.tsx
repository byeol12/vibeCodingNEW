import { AppShell } from "@/components/app-shell";
import { StudentJoinForm } from "@/components/student-join-form";

export default function JoinPage() {
  return (
    <AppShell
      eyebrow="Student"
      title="방 코드로 입장"
      description="선생님에게 받은 6자리 코드와 이름만 입력하세요."
    >
      <StudentJoinForm />
    </AppShell>
  );
}
