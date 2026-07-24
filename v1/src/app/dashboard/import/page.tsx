import Link from "next/link";
import { V0ImportForm } from "@/components/v0-import-form";
import { AppShell } from "@/components/app-shell";
import { requireTeacher } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

type ImportPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ImportPage({ searchParams }: ImportPageProps) {
  await requireTeacher();
  const supabase = await createClient();
  const query = await searchParams;
  const error = first(query.error);
  const message = first(query.message);
  const roomId = first(query.roomId);

  const [{ data: rooms }, { data: students }] = await Promise.all([
    supabase
      .from("rooms")
      .select("id,title,join_code")
      .order("created_at", { ascending: false }),
    supabase
      .from("students")
      .select("id,name,room_id")
      .eq("status", "active")
      .order("name"),
  ]);

  return (
    <AppShell
      eyebrow="Migration"
      title="v0 데이터 가져오기"
      description="localStorage JSON을 미리본 뒤, 선택한 방·학생에게 한 번만 이식합니다."
    >
      <div className="actions">
        <Link className="button" href="/dashboard">
          대시보드
        </Link>
      </div>

      {error && (
        <p className="alert alert--error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="alert alert--success" role="status">
          {message}
        </p>
      )}

      {!rooms?.length ? (
        <p className="empty-state">
          먼저 수업 방을 만들고, 학생을 입장·승인한 뒤 가져올 수 있어요.
        </p>
      ) : (
        <V0ImportForm
          rooms={rooms}
          students={students || []}
          initialRoomId={roomId}
        />
      )}

      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow">How to export</p>
            <h2>v0 JSON 내보내기</h2>
          </div>
        </div>
        <ol className="import-steps">
          <li>v0 페이지를 연 뒤 선생님 설정에서 “JSON 내보내기”를 누릅니다.</li>
          <li>저장된 `.json` 파일을 이 화면에 올립니다.</li>
          <li>미리보기 건수를 확인하고 가져오기를 실행합니다.</li>
        </ol>
      </section>
    </AppShell>
  );
}
