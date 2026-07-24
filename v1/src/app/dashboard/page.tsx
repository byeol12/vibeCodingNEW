import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import { createRoom } from "@/app/dashboard/actions";
import { AppShell } from "@/components/app-shell";
import { SubmitButton } from "@/components/submit-button";
import { requireTeacher } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

type DashboardPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function dateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const viewer = await requireTeacher();
  const supabase = await createClient();
  const [{ data: profile }, { data: rooms }] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", viewer.userId)
      .single(),
    supabase
      .from("rooms")
      .select("id,title,join_code,start_date,end_date,created_at")
      .order("created_at", { ascending: false }),
  ]);
  const query = await searchParams;
  const error = first(query.error);
  const message = first(query.message);
  const start = new Date();
  const end = new Date(start);
  end.setMonth(end.getMonth() + 3);

  return (
    <AppShell
      eyebrow="Teacher"
      title={`${profile?.display_name || "선생님"}의 수업 방`}
      description="수업 일정을 입력하면 전체 수업일과 학생 입장 코드가 함께 만들어집니다."
    >
      <div className="actions">
        <Link className="button" href="/dashboard/import">
          v0 가져오기
        </Link>
        <form className="inline-logout" action={signOut}>
          <SubmitButton className="button" pendingLabel="로그아웃 중…">
            로그아웃
          </SubmitButton>
        </form>
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

      <section className="section-block" aria-labelledby="create-room-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">New room</p>
            <h2 id="create-room-title">새 수업 방 만들기</h2>
          </div>
        </div>
        <form className="room-form" action={createRoom}>
          <label className="field field--wide">
            <span>수업 방 이름</span>
            <input
              name="title"
              placeholder="예: 중2 수학 과외"
              required
              maxLength={100}
            />
          </label>
          <fieldset className="weekday-field">
            <legend>수업 요일</legend>
            <div className="weekday-options">
              {[
                [1, "월"],
                [2, "화"],
                [3, "수"],
                [4, "목"],
                [5, "금"],
                [6, "토"],
                [0, "일"],
              ].map(([value, label]) => (
                <label key={value}>
                  <input
                    type="checkbox"
                    name="weekdays"
                    value={value}
                    defaultChecked={value === 2 || value === 4 || value === 5}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="field">
            <span>시작일</span>
            <input
              name="startDate"
              type="date"
              defaultValue={dateInputValue(start)}
              required
            />
          </label>
          <label className="field">
            <span>종료일</span>
            <input
              name="endDate"
              type="date"
              defaultValue={dateInputValue(end)}
              required
            />
          </label>
          <div className="field--wide">
            <SubmitButton pendingLabel="수업일 만드는 중…">
              방 만들기
            </SubmitButton>
          </div>
        </form>
      </section>

      <section className="section-block" aria-labelledby="room-list-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">My rooms</p>
            <h2 id="room-list-title">내 수업 방</h2>
          </div>
          <span className="count-badge">{rooms?.length || 0}개</span>
        </div>
        {rooms?.length ? (
          <ul className="route-list">
            {rooms.map((room) => (
              <li key={room.id}>
                <Link href={`/room/${room.id}`}>
                  <strong>{room.title}</strong>
                  <span>
                    코드 {room.join_code} · {room.start_date} ~ {room.end_date}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-state">아직 만든 수업 방이 없습니다.</p>
        )}
      </section>
    </AppShell>
  );
}
