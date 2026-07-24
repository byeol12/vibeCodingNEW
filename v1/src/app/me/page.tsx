import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import { applyJoker, saveReflection } from "@/app/me/actions";
import { AppShell } from "@/components/app-shell";
import { RewardCard } from "@/components/reward-card";
import { SubmitButton } from "@/components/submit-button";
import { deriveProgress, evaluationCount } from "@/domain/progress";
import { requireStudent } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

const sections = [
  ["dex", "카드 도감"],
  ["shop", "보상 상점"],
  ["stats", "성장 그래프"],
] as const;

const praiseOptions = [
  ["hand", "🙋 먼저 손 들고 발표"],
  ["ask", "🧠 모르는 걸 질문"],
  ["note", "✍️ 필기를 꼼꼼히"],
  ["time", "⏰ 제시간에 도착"],
  ["retry", "🔁 틀린 문제 다시 풀기"],
  ["help", "🤝 친구를 도와줌"],
  ["focus", "🎯 끝까지 집중"],
  ["grit", "💪 포기하지 않음"],
  ["prep", "📚 예습·복습 완료"],
  ["greet", "😊 밝게 인사"],
] as const;

const struggleOptions = [
  ["sleepy", "😴 잠이 부족했어요"],
  ["phone", "📱 폰이 자꾸 생각났어요"],
  ["focus", "🌀 집중이 안 됐어요"],
  ["hard", "😰 어려워서 포기했어요"],
  ["lost", "🤯 뭘 해야 할지 몰랐어요"],
] as const;

type StudentHomePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function StudentHomePage({
  searchParams,
}: StudentHomePageProps) {
  const viewer = await requireStudent();
  const supabase = await createClient();
  const query = await searchParams;
  const error = first(query.error);
  const message = first(query.message);
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
  }).format(new Date());
  const [
    { data: room },
    { data: sessions },
    { data: evaluations },
    { data: reflections },
    { data: jokerBalance },
    { data: bonusPoints },
  ] =
    viewer.status === "active"
      ? await Promise.all([
          supabase
            .from("rooms")
            .select("title")
            .eq("id", viewer.roomId)
            .maybeSingle(),
          supabase
            .from("sessions")
            .select("id,session_date")
            .eq("room_id", viewer.roomId)
            .lte("session_date", today)
            .order("session_date"),
          supabase
            .from("evaluations")
            .select(
              "session_id,attitude,participation,homework,is_lucky,joker_used,teacher_memo",
            )
            .eq("room_id", viewer.roomId)
            .eq("student_id", viewer.studentId),
          supabase
            .from("reflections")
            .select("session_id,praise_tags,struggle_tags")
            .eq("room_id", viewer.roomId)
            .eq("student_id", viewer.studentId),
          supabase.rpc("student_joker_balance", {
            p_student_id: viewer.studentId,
          }),
          supabase.rpc("student_bonus_points", {
            p_student_id: viewer.studentId,
          }),
        ])
      : [
          { data: null },
          { data: [] },
          { data: [] },
          { data: [] },
          { data: 0 },
          { data: 0 },
        ];
  const allSessions = sessions || [];
  const allEvaluations = evaluations || [];
  const allReflections = reflections || [];
  const currentSession = allSessions.at(-1) || null;
  const currentEvaluation = currentSession
    ? allEvaluations.find(
        (evaluation) => evaluation.session_id === currentSession.id,
      )
    : null;
  const currentReflection = currentSession
    ? allReflections.find(
        (reflection) => reflection.session_id === currentSession.id,
      )
    : null;
  const progress = deriveProgress(
    allSessions,
    allEvaluations,
    allReflections,
    bonusPoints || 0,
  );
  const currentGrade = currentSession
    ? progress.gradeAt[currentSession.id]
    : null;
  const currentPoints = currentSession
    ? progress.pointsAt[currentSession.id] || 0
    : 0;
  const evaluatedCount = evaluationCount(currentEvaluation);
  const jokers = Math.max(0, jokerBalance || 0);
  const jokerTargets = allSessions
    .filter((session) => {
      const evaluation = allEvaluations.find(
        (row) => row.session_id === session.id,
      );
      const count = evaluationCount(evaluation);
      return Boolean(
        evaluation && !evaluation.joker_used && count >= 1 && count <= 2,
      );
    })
    .slice(-5);

  const statusCopy = {
    pending: {
      title: "입장 승인 대기",
      description: `${viewer.name} 학생의 요청을 선생님께 보냈습니다. 승인되면 카드와 상점을 볼 수 있어요.`,
    },
    active: {
      title: "오늘의 카드",
      description: `${room?.title || "수업 방"} · ${viewer.name} 학생의 성장 기록`,
    },
    revoked: {
      title: "입장이 중지되었습니다",
      description: "현재 이 수업 방을 이용할 수 없습니다. 선생님에게 문의해 주세요.",
    },
  }[viewer.status];

  return (
    <AppShell
      eyebrow="Student home"
      title={statusCopy.title}
      description={statusCopy.description}
    >
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

      {viewer.status === "pending" && (
        <div className="approval-wait" role="status">
          <span className="approval-wait__icon" aria-hidden="true">
            ⏳
          </span>
          <div>
            <strong>선생님의 승인을 기다리고 있어요</strong>
            <p>승인 후 이 페이지를 새로고침하면 바로 시작할 수 있습니다.</p>
          </div>
        </div>
      )}

      {viewer.status === "active" && (
        <>
          <div className="student-summary">
            <div>
              <span>총 별 포인트</span>
              <strong>{progress.totalPoints}P</strong>
            </div>
            <div>
              <span>현재 스트릭</span>
              <strong>{progress.currentStreak}일</strong>
            </div>
            <div>
              <span>조커 카드</span>
              <strong>{jokers}장</strong>
            </div>
          </div>
          {(progress.bonusPoints > 0 ||
            (progress.recovery &&
              progress.recovery.progress > 0 &&
              progress.recovery.progress < 3)) && (
            <p className="form-help bonus-hint">
              {progress.bonusPoints > 0 && (
                <>보너스 {progress.bonusPoints}P 포함 · </>
              )}
              {progress.recovery && progress.recovery.progress < 3 ? (
                <>
                  회복 진행 {progress.recovery.progress}/3일 (완성하면 +10P)
                </>
              ) : progress.growthCount > 0 ? (
                <>성장 보너스 {progress.growthCount}회 반영</>
              ) : null}
            </p>
          )}

          {(jokers > 0 || jokerTargets.length > 0) && (
            <section className="section-block joker-panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Joker</p>
                  <h2>조커 카드</h2>
                </div>
                <span className="count-badge">보유 {jokers}장</span>
              </div>
              <p className="form-help">
                체크가 1~2개만 있는 날에 쓰면 그날을 도장으로 이어 줘요. 숙제
                3연속·퍼펙트 위크·상점에서 얻을 수 있어요.
              </p>
              {jokers > 0 && jokerTargets.length ? (
                <ul className="joker-target-list">
                  {jokerTargets.map((session) => (
                    <li key={session.id}>
                      <div>
                        <strong>{session.session_date}</strong>
                        <span>부분 체크 날 · 조커 사용 가능</span>
                      </div>
                      <form action={applyJoker.bind(null, session.id)}>
                        <SubmitButton pendingLabel="사용 중…">
                          이 날에 쓰기
                        </SubmitButton>
                      </form>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="empty-state">
                  {jokers > 0
                    ? "지금은 조커를 쓸 수 있는 부분 체크 날이 없어요."
                    : "조건을 달성하거나 상점에서 조커를 모아 보세요."}
                </p>
              )}
            </section>
          )}

          {!currentSession ? (
            <p className="empty-state">아직 시작된 수업일이 없습니다.</p>
          ) : !currentEvaluation || evaluatedCount === 0 ? (
            <div className="approval-wait" role="status">
              <span className="approval-wait__icon" aria-hidden="true">
                ✏️
              </span>
              <div>
                <strong>선생님 평가를 기다리고 있어요</strong>
                <p>{currentSession.session_date} 수업 평가가 등록되면 카드가 열립니다.</p>
              </div>
            </div>
          ) : (
            <>
              <RewardCard
                sessionDate={currentSession.session_date}
                grade={currentGrade}
                points={currentPoints}
                streak={progress.streakAt[currentSession.id] || progress.currentStreak}
                attitude={currentEvaluation.attitude}
                participation={currentEvaluation.participation}
                homework={currentEvaluation.homework}
                isLucky={currentEvaluation.is_lucky}
                jokerUsed={currentEvaluation.joker_used}
                teacherMemo={currentEvaluation.teacher_memo}
                praiseTags={currentReflection?.praise_tags || []}
                studentName={viewer.name}
                cardIndex={
                  allSessions.findIndex((session) => session.id === currentSession.id) +
                  1
                }
                totalDays={allSessions.length}
              />

              <section className="reflection-section">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Self check</p>
                    <h2>오늘의 자기관찰</h2>
                  </div>
                  <span className="count-badge">칭찬 최대 3개</span>
                </div>
                <form
                  className="reflection-form"
                  action={saveReflection.bind(null, currentSession.id)}
                >
                  <fieldset>
                    <legend>오늘 잘한 것</legend>
                    <div className="reflection-chips">
                      {praiseOptions.map(([value, label]) => (
                        <label key={value}>
                          <input
                            type="checkbox"
                            name="praise"
                            value={value}
                            defaultChecked={
                              currentReflection?.praise_tags.includes(value) ||
                              false
                            }
                          />
                          <span>{label}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <fieldset>
                    <legend>
                      오늘 어려웠던 것 <small>감점 없음</small>
                    </legend>
                    <div className="reflection-chips reflection-chips--struggle">
                      {struggleOptions.map(([value, label]) => (
                        <label key={value}>
                          <input
                            type="checkbox"
                            name="struggle"
                            value={value}
                            defaultChecked={
                              currentReflection?.struggle_tags.includes(value) ||
                              false
                            }
                          />
                          <span>{label}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <SubmitButton pendingLabel="기록 저장 중…">
                    자기관찰 저장
                  </SubmitButton>
                </form>
              </section>
            </>
          )}

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
        </>
      )}

      <form className="actions" action={signOut}>
        <SubmitButton className="button" pendingLabel="나가는 중…">
          이 브라우저에서 나가기
        </SubmitButton>
      </form>
    </AppShell>
  );
}
