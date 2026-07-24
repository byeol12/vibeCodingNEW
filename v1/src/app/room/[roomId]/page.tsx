import Link from "next/link";
import { notFound } from "next/navigation";
import {
  saveEvaluation,
  updateStudentStatus,
} from "@/app/room/[roomId]/actions";
import { AppShell } from "@/components/app-shell";
import { SubmitButton } from "@/components/submit-button";
import { requireTeacher } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

type RoomPageProps = {
  params: Promise<{ roomId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const sections = [
  ["shop", "상점 편집"],
  ["art", "카드 아트"],
  ["report", "진척도"],
  ["approve", "승인 대기"],
] as const;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
    timeZone: "Asia/Seoul",
  }).format(new Date(`${value}T00:00:00+09:00`));
}

export default async function RoomPage({
  params,
  searchParams,
}: RoomPageProps) {
  await requireTeacher();
  const { roomId } = await params;
  const supabase = await createClient();
  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select(
      "id,title,join_code,code_expires_at,weekdays,start_date,end_date",
    )
    .eq("id", roomId)
    .maybeSingle();
  if (roomError || !room) notFound();

  const query = await searchParams;
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
  }).format(new Date());
  const [{ data: students }, { data: sessions }] = await Promise.all([
    supabase
      .from("students")
      .select("id,name,status,created_at")
      .eq("room_id", roomId)
      .order("created_at"),
    supabase
      .from("sessions")
      .select("id,session_date,week_no,weekday")
      .eq("room_id", roomId)
      .order("session_date"),
  ]);
  const allSessions = sessions || [];
  const evaluableSessions = allSessions.filter(
    (session) => session.session_date <= today,
  );
  const requestedSessionId = first(query.session);
  const selectedSession =
    evaluableSessions.find((session) => session.id === requestedSessionId) ||
    evaluableSessions.find((session) => session.session_date === today) ||
    evaluableSessions.at(-1) ||
    null;
  const { data: evaluations } = selectedSession
    ? await supabase
        .from("evaluations")
        .select(
          "student_id,attitude,participation,homework,is_lucky,teacher_memo",
        )
        .eq("room_id", roomId)
        .eq("session_id", selectedSession.id)
    : { data: [] };
  const evaluationByStudent = new Map(
    (evaluations || []).map((evaluation) => [
      evaluation.student_id,
      evaluation,
    ]),
  );
  const upcomingSessions = allSessions
    .filter((session) => session.session_date >= today)
    .slice(0, 8);
  const error = first(query.error);
  const message = first(query.message);
  const pendingStudents = students?.filter((student) => student.status === "pending") || [];
  const activeStudents = students?.filter((student) => student.status === "active") || [];
  const revokedStudents = students?.filter((student) => student.status === "revoked") || [];

  return (
    <AppShell
      eyebrow="Teacher room"
      title={room.title}
      description={`${room.start_date} ~ ${room.end_date} · 전체 수업 ${allSessions.length}회`}
    >
      <div className="actions">
        <Link className="button" href="/dashboard">
          내 수업 방
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

      <section className="room-code" aria-label="학생 입장 코드">
        <div>
          <span>학생 입장 코드</span>
          <strong>{room.join_code}</strong>
        </div>
        <p>
          {room.code_expires_at
            ? `${new Intl.DateTimeFormat("ko-KR", {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: "Asia/Seoul",
              }).format(new Date(room.code_expires_at))}까지 유효`
            : "만료 없음"}
        </p>
      </section>

      <section className="section-block" aria-labelledby="evaluation-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Today&apos;s class</p>
            <h2 id="evaluation-title">수업 평가</h2>
          </div>
          {selectedSession && (
            <span className="count-badge">
              {formatDate(selectedSession.session_date)}
            </span>
          )}
        </div>

        {evaluableSessions.length > 0 && (
          <form className="session-picker" method="get">
            <label className="field">
              <span>평가할 수업일</span>
              <select name="session" defaultValue={selectedSession?.id}>
                {evaluableSessions
                  .slice()
                  .reverse()
                  .map((session) => (
                    <option key={session.id} value={session.id}>
                      {formatDate(session.session_date)} · {session.week_no}주차
                    </option>
                  ))}
              </select>
            </label>
            <button className="button" type="submit">
              날짜 보기
            </button>
          </form>
        )}

        {!selectedSession ? (
          <p className="empty-state">아직 평가할 수업일이 없습니다.</p>
        ) : activeStudents.length ? (
          <div className="evaluation-grid">
            {activeStudents.map((student) => {
              const evaluation = evaluationByStudent.get(student.id);
              return (
                <form
                  className="evaluation-card"
                  key={student.id}
                  action={saveEvaluation.bind(
                    null,
                    roomId,
                    selectedSession.id,
                    student.id,
                  )}
                >
                  <div className="evaluation-card__head">
                    <div>
                      <span>학생 평가</span>
                      <h3>{student.name}</h3>
                    </div>
                    {evaluation?.is_lucky && (
                      <span className="lucky-badge">럭키</span>
                    )}
                  </div>
                  <div className="evaluation-checks">
                    {[
                      ["attitude", "바른 수업 태도", evaluation?.attitude],
                      [
                        "participation",
                        "적극적인 참여",
                        evaluation?.participation,
                      ],
                      ["homework", "숙제 확인", evaluation?.homework],
                    ].map(([name, label, checked]) => (
                      <label key={String(name)}>
                        <input
                          name={String(name)}
                          type="checkbox"
                          defaultChecked={Boolean(checked)}
                        />
                        <span aria-hidden="true">✓</span>
                        <strong>{label}</strong>
                      </label>
                    ))}
                  </div>
                  <label className="field">
                    <span>선생님 한마디</span>
                    <textarea
                      name="teacherMemo"
                      rows={3}
                      maxLength={1000}
                      defaultValue={evaluation?.teacher_memo || ""}
                      placeholder="오늘의 노력과 다음 목표를 짧게 적어 주세요."
                    />
                  </label>
                  <SubmitButton pendingLabel="평가 저장 중…">
                    평가 저장
                  </SubmitButton>
                </form>
              );
            })}
          </div>
        ) : (
          <p className="empty-state">
            학생을 승인하면 여기에서 수업 평가를 입력할 수 있습니다.
          </p>
        )}
      </section>

      <section className="section-block" aria-labelledby="pending-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Approval</p>
            <h2 id="pending-title">학생 승인 대기</h2>
          </div>
          <span className="count-badge">{pendingStudents.length}명</span>
        </div>
        {pendingStudents.length ? (
          <ul className="member-list">
            {pendingStudents.map((student) => (
              <li key={student.id}>
                <div>
                  <strong>{student.name}</strong>
                  <span>입장 승인을 기다리고 있습니다.</span>
                </div>
                <div className="member-actions">
                  <form
                    action={updateStudentStatus.bind(
                      null,
                      roomId,
                      student.id,
                      "active",
                    )}
                  >
                    <SubmitButton pendingLabel="승인 중…">승인</SubmitButton>
                  </form>
                  <form
                    action={updateStudentStatus.bind(
                      null,
                      roomId,
                      student.id,
                      "revoked",
                    )}
                  >
                    <SubmitButton
                      className="button button--danger"
                      pendingLabel="거절 중…"
                    >
                      거절
                    </SubmitButton>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-state">승인을 기다리는 학생이 없습니다.</p>
        )}
      </section>

      <section className="section-block" aria-labelledby="students-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Students</p>
            <h2 id="students-title">참여 학생</h2>
          </div>
          <span className="count-badge">{activeStudents.length}명</span>
        </div>
        {activeStudents.length ? (
          <ul className="member-list">
            {activeStudents.map((student) => (
              <li key={student.id}>
                <div>
                  <strong>{student.name}</strong>
                  <span>수업 방 이용 가능</span>
                </div>
                <form
                  action={updateStudentStatus.bind(
                    null,
                    roomId,
                    student.id,
                    "revoked",
                  )}
                >
                  <SubmitButton
                    className="button button--danger"
                    pendingLabel="중지 중…"
                  >
                    입장 중지
                  </SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-state">승인된 학생이 아직 없습니다.</p>
        )}

        {revokedStudents.length > 0 && (
          <details className="revoked-members">
            <summary>중지된 학생 {revokedStudents.length}명</summary>
            <ul className="member-list">
              {revokedStudents.map((student) => (
                <li key={student.id}>
                  <strong>{student.name}</strong>
                  <form
                    action={updateStudentStatus.bind(
                      null,
                      roomId,
                      student.id,
                      "active",
                    )}
                  >
                    <SubmitButton className="button" pendingLabel="복구 중…">
                      다시 승인
                    </SubmitButton>
                  </form>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      <section className="section-block" aria-labelledby="schedule-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Schedule</p>
            <h2 id="schedule-title">다가오는 수업</h2>
          </div>
        </div>
        {upcomingSessions.length ? (
          <ol className="session-list">
            {upcomingSessions.map((session) => (
              <li key={session.id}>
                <strong>{formatDate(session.session_date)}</strong>
                <span>{session.week_no}주차</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="empty-state">남은 수업이 없습니다.</p>
        )}
      </section>

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
    </AppShell>
  );
}
