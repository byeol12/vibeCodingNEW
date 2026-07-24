import { notFound } from "next/navigation";
import { requestPurchase } from "@/app/me/purchase-actions";
import { AppShell } from "@/components/app-shell";
import { SignOutButton } from "@/components/sign-out-button";
import { StudentTabBar, type StudentTabId } from "@/components/student-tab-bar";
import { SubmitButton } from "@/components/submit-button";
import { deriveProgress, evaluationCount } from "@/domain/progress";
import {
  countPerfectWeeks,
  tallyTags,
  weeklyCompletionSeries,
} from "@/domain/stats";
import { requireActiveStudent } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

type StudentSectionPageProps = {
  params: Promise<{ section: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const gradeNames = {
  C: "커먼",
  U: "언커먼",
  R: "레어",
  E: "에픽",
  L: "레전더리",
  J: "조커",
} as const;

const praiseCatalog = [
  ["hand", "🙋 발표"],
  ["ask", "🧠 질문"],
  ["note", "✍️ 필기"],
  ["time", "⏰ 시간"],
  ["retry", "🔁 다시 풀기"],
  ["help", "🤝 도움"],
  ["focus", "🎯 집중"],
  ["grit", "💪 포기 않음"],
  ["prep", "📚 예복습"],
  ["greet", "😊 인사"],
] as const;

const struggleCatalog = [
  ["sleepy", "😴 잠 부족"],
  ["phone", "📱 폰"],
  ["focus", "🌀 집중 안 됨"],
  ["hard", "😰 어려움"],
  ["lost", "🤯 뭘 할지"],
] as const;

const purchaseStatusLabel = {
  pending: "승인 대기",
  approved: "승인됨",
  rejected: "거절됨",
  refunded: "환불됨",
} as const;

const sectionCopy: Record<string, { title: string; description: string }> = {
  dex: {
    title: "카드 보관함",
    description: "획득 카드와 아직 잠긴 수업일 슬롯을 보여줍니다.",
  },
  shop: {
    title: "보상 상점",
    description: "사용 가능한 포인트로 교사가 등록한 보상을 요청합니다.",
  },
  stats: {
    title: "내 성장 그래프",
    description:
      "도장·퍼펙트 위크·주간 추이·칭찬/방해 요인까지 한눈에 보여줍니다.",
  },
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function StudentSectionPage({
  params,
  searchParams,
}: StudentSectionPageProps) {
  const viewer = await requireActiveStudent();
  const { section } = await params;
  const copy = sectionCopy[section];
  if (!copy) notFound();
  if (section !== "dex" && section !== "shop" && section !== "stats") {
    notFound();
  }
  const activeTab: StudentTabId = section;
  const query = await searchParams;
  const error = first(query.error);
  const message = first(query.message);
  const supabase = await createClient();
  const [
    { data: room },
    { data: sessions },
    { data: evaluations },
    { data: reflections },
    { data: shopItems },
    { data: purchases },
    { data: cardArts },
    { data: bonusPoints },
    { data: availableBalance },
  ] = await Promise.all([
    supabase
      .from("rooms")
      .select("title")
      .eq("id", viewer.roomId)
      .maybeSingle(),
    supabase
      .from("sessions")
      .select("id,session_date")
      .eq("room_id", viewer.roomId)
      .order("session_date"),
    supabase
      .from("evaluations")
      .select(
        "session_id,attitude,participation,homework,is_lucky,joker_used",
      )
      .eq("room_id", viewer.roomId)
      .eq("student_id", viewer.studentId),
    supabase
      .from("reflections")
      .select("session_id,praise_tags,struggle_tags")
      .eq("room_id", viewer.roomId)
      .eq("student_id", viewer.studentId),
    supabase
      .from("shop_items")
      .select(
        "id,icon,name,description,price,limit_month,limit_season,needs_approval",
      )
      .eq("room_id", viewer.roomId)
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("purchases")
      .select("id,item_id,price_paid,status,requested_at,shop_items(name,icon)")
      .eq("room_id", viewer.roomId)
      .eq("student_id", viewer.studentId)
      .order("requested_at", { ascending: false }),
    section === "dex"
      ? supabase
          .from("card_arts")
          .select("grade,storage_path")
          .eq("room_id", viewer.roomId)
      : Promise.resolve({ data: [] }),
    supabase.rpc("student_bonus_points", {
      p_student_id: viewer.studentId,
    }),
    section === "shop"
      ? supabase.rpc("student_available_balance", {
          p_student_id: viewer.studentId,
        })
      : Promise.resolve({ data: 0 }),
  ]);
  const artUrlByGrade = new Map<string, string>();
  await Promise.all(
    (cardArts || []).map(async (art) => {
      const { data } = await supabase.storage
        .from("card-art")
        .createSignedUrl(art.storage_path, 60 * 60);
      if (data?.signedUrl) artUrlByGrade.set(art.grade, data.signedUrl);
    }),
  );
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
  }).format(new Date());
  const allSessions = sessions || [];
  const pastSessions = allSessions.filter(
    (session) => session.session_date <= today,
  );
  const allEvaluations = evaluations || [];
  const allReflections = reflections || [];
  const progress = deriveProgress(
    pastSessions,
    allEvaluations,
    allReflections,
    bonusPoints || 0,
  );
  const cardCount = Object.values(progress.gradeAt).filter(Boolean).length;
  const totalPast = Math.max(1, pastSessions.length);
  const completionRate = (field: "attitude" | "participation" | "homework") =>
    Math.round(
      (allEvaluations.filter((evaluation) => evaluation[field]).length /
        totalPast) *
        100,
    );
  const stamps = allEvaluations.filter(
    (evaluation) =>
      evaluationCount(evaluation) === 3 || evaluation.joker_used,
  ).length;
  const monthlyStamps = (() => {
    const byMonth = new Map<
      string,
      { label: string; stamps: number; total: number }
    >();
    for (const session of pastSessions) {
      const key = session.session_date.slice(0, 7);
      const entry = byMonth.get(key) || {
        label: new Intl.DateTimeFormat("ko-KR", {
          year: "numeric",
          month: "short",
        }).format(new Date(`${session.session_date}T00:00:00+09:00`)),
        stamps: 0,
        total: 0,
      };
      entry.total += 1;
      const evaluation = allEvaluations.find(
        (row) => row.session_id === session.id,
      );
      if (
        evaluation &&
        (evaluationCount(evaluation) === 3 || evaluation.joker_used)
      ) {
        entry.stamps += 1;
      }
      byMonth.set(key, entry);
    }
    return [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, value]) => value)
      .slice(-6);
  })();
  const gradeOrder = ["C", "U", "R", "E", "L", "J"] as const;
  const gradeCounts = gradeOrder.map((grade) => ({
    grade,
    label: gradeNames[grade],
    count: Object.values(progress.gradeAt).filter((value) => value === grade)
      .length,
  }));
  const maxGradeCount = Math.max(1, ...gradeCounts.map((row) => row.count));
  const maxMonthStamps = Math.max(
    1,
    ...monthlyStamps.map((month) => month.stamps),
  );
  const reflectionRate = Math.round(
    (allReflections.filter((reflection) => reflection.praise_tags.length > 0)
      .length /
      totalPast) *
      100,
  );
  const stampRate = Math.round((stamps / totalPast) * 100);
  const perfectWeeks = countPerfectWeeks(pastSessions, allEvaluations);
  const weeklySeries = weeklyCompletionSeries(pastSessions, allEvaluations);
  const praiseTallies = tallyTags(
    allReflections.map((reflection) => ({ tags: reflection.praise_tags })),
    praiseCatalog,
  );
  const struggleTallies = tallyTags(
    allReflections.map((reflection) => ({ tags: reflection.struggle_tags })),
    struggleCatalog,
  );
  const spent =
    purchases
      ?.filter((purchase) => purchase.status === "approved")
      .reduce((sum, purchase) => sum + purchase.price_paid, 0) || 0;
  const reserved =
    purchases
      ?.filter((purchase) => purchase.status === "pending")
      .reduce((sum, purchase) => sum + purchase.price_paid, 0) || 0;
  const availablePoints =
    section === "shop"
      ? Math.max(0, availableBalance || 0)
      : Math.max(0, progress.totalPoints - spent - reserved);
  const pendingItemIds = new Set(
    purchases
      ?.filter((purchase) => purchase.status === "pending")
      .map((purchase) => purchase.item_id) || [],
  );

  return (
    <AppShell
      eyebrow={room?.title || "Student"}
      title={copy.title}
      description={copy.description}
      headerAccessory={
        <SignOutButton message="이 브라우저에서 학생 세션이 종료돼요." />
      }
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

      {section === "dex" && (
        <>
          <div className="collection-summary">
            <strong>
              {
                pastSessions.filter((session) => progress.gradeAt[session.id])
                  .length
              }
            </strong>
            <span>/ {pastSessions.length}장 수집</span>
          </div>
          <ul className="dex-grid">
            {allSessions.map((session, index) => {
              const grade = progress.gradeAt[session.id];
              const artUrl = grade ? artUrlByGrade.get(grade) : undefined;
              return (
                <li
                  className={
                    grade
                      ? `dex-card dex-card--${grade}`
                      : "dex-card dex-card--locked"
                  }
                  key={session.id}
                >
                  <span className="dex-card__number">#{index + 1}</span>
                  {artUrl && grade ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      className="dex-card__art"
                      src={artUrl}
                      alt={`${gradeNames[grade]} 카드`}
                    />
                  ) : (
                    <div aria-hidden="true">{grade ? "★" : "🔒"}</div>
                  )}
                  <strong>{grade ? gradeNames[grade] : "미획득"}</strong>
                  <span>{session.session_date}</span>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {section === "stats" && (
        <>
          <div className="student-summary stats-summary">
            <div>
              <span>총 별 포인트</span>
              <strong>{progress.totalPoints}P</strong>
            </div>
            <div>
              <span>완성 도장</span>
              <strong>
                {stamps}개 · {stampRate}%
              </strong>
            </div>
            <div>
              <span>최고 스트릭</span>
              <strong>{progress.bestStreak}일</strong>
            </div>
            <div>
              <span>퍼펙트 위크</span>
              <strong>{perfectWeeks}회</strong>
            </div>
          </div>

          <section className="stats-panel">
            <h2>평가 항목 완료율</h2>
            {[
              ["수업 태도", completionRate("attitude")],
              ["수업 참여", completionRate("participation")],
              ["숙제 확인", completionRate("homework")],
              ["자기관찰(칭찬)", reflectionRate],
            ].map(([label, rate]) => (
              <div className="rate-row" key={String(label)}>
                <div>
                  <strong>{label}</strong>
                  <span>{rate}%</span>
                </div>
                <div className="rate-track">
                  <span style={{ width: `${rate}%` }} />
                </div>
              </div>
            ))}
          </section>

          <section className="stats-panel">
            <h2>주별 완료율</h2>
            {weeklySeries.length ? (
              <div className="week-line" aria-label="주별 완료율 추이">
                <svg viewBox="0 0 320 120" role="img">
                  <title>주별 완료율</title>
                  <polyline
                    fill="none"
                    stroke="#8b70e8"
                    strokeWidth="3"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    points={weeklySeries
                      .map((row, index) => {
                        const x =
                          weeklySeries.length === 1
                            ? 160
                            : (index / (weeklySeries.length - 1)) * 300 + 10;
                        const y = 100 - (row.rate / 100) * 80;
                        return `${x},${y}`;
                      })
                      .join(" ")}
                  />
                  {weeklySeries.map((row, index) => {
                    const x =
                      weeklySeries.length === 1
                        ? 160
                        : (index / (weeklySeries.length - 1)) * 300 + 10;
                    const y = 100 - (row.rate / 100) * 80;
                    return (
                      <circle
                        key={row.key}
                        cx={x}
                        cy={y}
                        r="4.5"
                        fill="#6048c7"
                      >
                        <title>
                          {row.label} · {row.rate}% ({row.done}/{row.total})
                        </title>
                      </circle>
                    );
                  })}
                </svg>
                <ul className="week-line__labels">
                  {weeklySeries.map((row) => (
                    <li key={`${row.key}-label`}>
                      <strong>{row.label}</strong>
                      <span>{row.rate}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="empty-state">아직 집계할 수업일이 없어요.</p>
            )}
            <p className="form-help">
              현재 스트릭 {progress.currentStreak}일
              {progress.recovery
                ? ` · 회복 ${progress.recovery.progress}/3`
                : ""}
            </p>
          </section>

          <section className="stats-panel">
            <h2>등급별 카드</h2>
            {cardCount ? (
              <ul className="grade-bars" aria-label="등급별 카드 수">
                {gradeCounts.map((row) => (
                  <li key={row.grade}>
                    <div
                      className={`grade-bars__col grade-bars__col--${row.grade}`}
                      style={{
                        height: `${Math.max(
                          8,
                          Math.round((row.count / maxGradeCount) * 120),
                        )}px`,
                      }}
                      title={`${row.label} ${row.count}장`}
                    />
                    <strong>{row.grade}</strong>
                    <span>{row.count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-state">아직 획득한 카드가 없어요.</p>
            )}
          </section>

          <section className="stats-panel">
            <h2>가장 많이 받은 칭찬</h2>
            {praiseTallies.length ? (
              <ul className="tag-rank" aria-label="칭찬 태그 순위">
                {praiseTallies.slice(0, 5).map((row) => {
                  const max = praiseTallies[0]?.count || 1;
                  return (
                    <li key={row.key}>
                      <div>
                        <strong>{row.label}</strong>
                        <span>{row.count}회</span>
                      </div>
                      <div className="rate-track">
                        <span
                          style={{
                            width: `${Math.round((row.count / max) * 100)}%`,
                          }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="empty-state">아직 기록된 칭찬 태그가 없어요.</p>
            )}
          </section>

          <section className="stats-panel">
            <h2>자주 걸린 방해 요인</h2>
            <p className="form-help">
              감점 없는 관찰 기록이에요. 반복되면 선생님과 루틴을 바꿔 볼 수
              있어요.
            </p>
            {struggleTallies.length ? (
              <ul className="tag-rank tag-rank--struggle" aria-label="방해 요인">
                {struggleTallies.slice(0, 5).map((row) => {
                  const max = struggleTallies[0]?.count || 1;
                  return (
                    <li key={row.key}>
                      <div>
                        <strong>{row.label}</strong>
                        <span>{row.count}회</span>
                      </div>
                      <div className="rate-track">
                        <span
                          style={{
                            width: `${Math.round((row.count / max) * 100)}%`,
                          }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="empty-state">아직 기록된 방해 요인이 없어요.</p>
            )}
          </section>

          <section className="stats-panel">
            <h2>월별 도장</h2>
            {monthlyStamps.length ? (
              <ul className="month-cols" aria-label="월별 도장 수">
                {monthlyStamps.map((month) => (
                  <li key={month.label}>
                    <div
                      className="month-cols__col"
                      style={{
                        height: `${Math.max(
                          8,
                          Math.round((month.stamps / maxMonthStamps) * 120),
                        )}px`,
                      }}
                      title={`${month.label} ${month.stamps}/${month.total}`}
                    />
                    <strong>{month.label}</strong>
                    <span>
                      {month.stamps}/{month.total}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-state">아직 집계할 수업일이 없어요.</p>
            )}
          </section>
        </>
      )}

      {section === "shop" && (
        <>
          <div className="shop-balance">
            <span>사용 가능한 별 포인트</span>
            <strong>{availablePoints}P</strong>
          </div>
          {shopItems?.length ? (
            <ul className="shop-catalog">
              {shopItems.map((item) => {
                const pending = pendingItemIds.has(item.id);
                const affordable = availablePoints >= item.price;
                return (
                  <li key={item.id}>
                    <span className="shop-catalog__icon" aria-hidden="true">
                      {item.icon}
                    </span>
                    <div>
                      <strong>{item.name}</strong>
                      <p>{item.description}</p>
                      <small>
                        {item.needs_approval ? "선생님 승인 필요" : "바로 사용"} ·{" "}
                        {item.limit_month
                          ? `월 ${item.limit_month}회`
                          : item.limit_season
                            ? `학기 ${item.limit_season}회`
                            : "무제한"}
                      </small>
                      {pending || !affordable ? (
                        <button className="button" type="button" disabled>
                          {pending ? "승인 대기" : "포인트 부족"}
                        </button>
                      ) : (
                        <form action={requestPurchase.bind(null, item.id)}>
                          <SubmitButton
                            className="button button--primary"
                            pendingLabel="요청 중…"
                          >
                            {item.price}P 구매
                          </SubmitButton>
                        </form>
                      )}
                    </div>
                    <b>{item.price}P</b>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="empty-state">선생님이 상점 보상을 준비 중입니다.</p>
          )}

          {!!purchases?.length && (
            <section className="section-block">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">History</p>
                  <h2>구매 기록</h2>
                </div>
              </div>
              <ul className="member-list">
                {purchases.slice(0, 8).map((purchase) => {
                  const item = Array.isArray(purchase.shop_items)
                    ? purchase.shop_items[0]
                    : purchase.shop_items;
                  return (
                    <li key={purchase.id}>
                      <div>
                        <strong>
                          {item?.icon || "🎁"} {item?.name || "보상"}
                        </strong>
                        <span>
                          {purchase.price_paid}P ·{" "}
                          {purchaseStatusLabel[purchase.status]}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </>
      )}

      <StudentTabBar active={activeTab} />
    </AppShell>
  );
}
