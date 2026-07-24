import Link from "next/link";
import { notFound } from "next/navigation";
import {
  removeCardArt,
  uploadCardArt,
} from "@/app/room/[roomId]/art-actions";
import {
  deactivateShopItem,
  decidePurchase,
  seedShopPresets,
  upsertShopItem,
} from "@/app/room/[roomId]/shop-actions";
import { AppShell } from "@/components/app-shell";
import { SubmitButton } from "@/components/submit-button";
import { deriveProgress, evaluationCount } from "@/domain/progress";
import { requireTeacher } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type CardGrade = Database["public"]["Enums"]["card_grade"];

const gradeOptions: { grade: CardGrade; label: string }[] = [
  { grade: "C", label: "커먼" },
  { grade: "U", label: "언커먼" },
  { grade: "R", label: "레어" },
  { grade: "E", label: "에픽" },
  { grade: "L", label: "레전더리" },
  { grade: "J", label: "조커" },
];

type RoomSectionPageProps = {
  params: Promise<{ roomId: string; section: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
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

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function RoomSectionPage({
  params,
  searchParams,
}: RoomSectionPageProps) {
  await requireTeacher();
  const { roomId, section } = await params;
  const copy = sectionCopy[section];
  if (!copy) notFound();

  const supabase = await createClient();
  const query = await searchParams;
  const error = first(query.error);
  const message = first(query.message);
  const { data: room } = await supabase
    .from("rooms")
    .select("title")
    .eq("id", roomId)
    .maybeSingle();
  if (!room) notFound();

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
  }).format(new Date());

  const [
    { data: shopItems },
    { data: pendingPurchases },
    { data: students },
    { data: sessions },
    { data: evaluations },
    { data: reflections },
    { data: cardArts },
  ] = await Promise.all([
    section === "shop"
      ? supabase
          .from("shop_items")
          .select(
            "id,icon,name,description,price,limit_month,limit_season,needs_approval,sort_order,is_active",
          )
          .eq("room_id", roomId)
          .eq("is_active", true)
          .order("sort_order")
      : Promise.resolve({ data: [] }),
    section === "approve"
      ? supabase
          .from("purchases")
          .select(
            "id,price_paid,requested_at,students(name),shop_items(name,icon)",
          )
          .eq("room_id", roomId)
          .eq("status", "pending")
          .order("requested_at")
      : Promise.resolve({ data: [] }),
    section === "report"
      ? supabase
          .from("students")
          .select("id,name,status")
          .eq("room_id", roomId)
          .eq("status", "active")
          .order("name")
      : Promise.resolve({ data: [] }),
    section === "report"
      ? supabase
          .from("sessions")
          .select("id,session_date")
          .eq("room_id", roomId)
          .lte("session_date", today)
          .order("session_date")
      : Promise.resolve({ data: [] }),
    section === "report"
      ? supabase
          .from("evaluations")
          .select(
            "student_id,session_id,attitude,participation,homework,is_lucky,joker_used",
          )
          .eq("room_id", roomId)
      : Promise.resolve({ data: [] }),
    section === "report"
      ? supabase
          .from("reflections")
          .select("student_id,session_id,praise_tags")
          .eq("room_id", roomId)
      : Promise.resolve({ data: [] }),
    section === "art"
      ? supabase
          .from("card_arts")
          .select("id,grade,storage_path,updated_at")
          .eq("room_id", roomId)
          .order("grade")
      : Promise.resolve({ data: [] }),
  ]);

  const artPreviews = await Promise.all(
    (cardArts || []).map(async (art) => {
      const { data } = await supabase.storage
        .from("card-art")
        .createSignedUrl(art.storage_path, 60 * 60);
      return { ...art, previewUrl: data?.signedUrl || null };
    }),
  );

  return (
    <AppShell
      eyebrow={room.title}
      title={copy.title}
      description={copy.description}
    >
      <div className="actions">
        <Link className="button" href={`/room/${roomId}`}>
          수업 방으로 돌아가기
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

      {section === "shop" && (
        <>
          <form className="actions" action={seedShopPresets.bind(null, roomId)}>
            <SubmitButton className="button" pendingLabel="채우는 중…">
              기본 보상 채우기
            </SubmitButton>
          </form>

          <section className="section-block">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Add item</p>
                <h2>새 보상 추가</h2>
              </div>
            </div>
            <form
              className="room-form"
              action={upsertShopItem.bind(null, roomId)}
            >
              <label className="field">
                <span>아이콘</span>
                <input name="icon" defaultValue="🎁" maxLength={16} required />
              </label>
              <label className="field">
                <span>가격</span>
                <input name="price" type="number" min={0} defaultValue={30} required />
              </label>
              <label className="field field--wide">
                <span>이름</span>
                <input name="name" maxLength={80} required />
              </label>
              <label className="field field--wide">
                <span>설명</span>
                <input name="description" maxLength={500} />
              </label>
              <label className="field">
                <span>월 한도</span>
                <input name="limitMonth" type="number" min={1} placeholder="비우면 없음" />
              </label>
              <label className="field">
                <span>학기 한도</span>
                <input name="limitSeason" type="number" min={1} placeholder="비우면 없음" />
              </label>
              <label className="field field--wide check-inline">
                <input name="needsApproval" type="checkbox" defaultChecked />
                <span>선생님 승인 필요</span>
              </label>
              <div className="field--wide">
                <SubmitButton pendingLabel="추가 중…">보상 추가</SubmitButton>
              </div>
            </form>
          </section>

          <section className="section-block">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Catalog</p>
                <h2>현재 상점</h2>
              </div>
              <span className="count-badge">{shopItems?.length || 0}개</span>
            </div>
            {shopItems?.length ? (
              <ul className="shop-edit-list">
                {shopItems.map((item) => (
                  <li key={item.id}>
                    <form action={upsertShopItem.bind(null, roomId)}>
                      <input type="hidden" name="itemId" value={item.id} />
                      <input type="hidden" name="sortOrder" value={item.sort_order} />
                      <div className="shop-edit-grid">
                        <label className="field">
                          <span>아이콘</span>
                          <input name="icon" defaultValue={item.icon} maxLength={16} />
                        </label>
                        <label className="field">
                          <span>가격</span>
                          <input
                            name="price"
                            type="number"
                            min={0}
                            defaultValue={item.price}
                          />
                        </label>
                        <label className="field field--wide">
                          <span>이름</span>
                          <input name="name" defaultValue={item.name} maxLength={80} />
                        </label>
                        <label className="field field--wide">
                          <span>설명</span>
                          <input
                            name="description"
                            defaultValue={item.description}
                            maxLength={500}
                          />
                        </label>
                        <label className="field">
                          <span>월 한도</span>
                          <input
                            name="limitMonth"
                            type="number"
                            min={1}
                            defaultValue={item.limit_month ?? ""}
                          />
                        </label>
                        <label className="field">
                          <span>학기 한도</span>
                          <input
                            name="limitSeason"
                            type="number"
                            min={1}
                            defaultValue={item.limit_season ?? ""}
                          />
                        </label>
                        <label className="field field--wide check-inline">
                          <input
                            name="needsApproval"
                            type="checkbox"
                            defaultChecked={item.needs_approval}
                          />
                          <span>선생님 승인 필요</span>
                        </label>
                      </div>
                      <div className="member-actions">
                        <SubmitButton pendingLabel="저장 중…">저장</SubmitButton>
                      </div>
                    </form>
                    <form
                      action={deactivateShopItem.bind(null, roomId, item.id)}
                    >
                      <SubmitButton
                        className="button button--danger"
                        pendingLabel="숨기는 중…"
                      >
                        숨기기
                      </SubmitButton>
                    </form>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-state">
                아직 보상이 없습니다. 기본 보상 채우기를 눌러 시작하세요.
              </p>
            )}
          </section>
        </>
      )}

      {section === "approve" && (
        <section className="section-block">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Pending</p>
              <h2>승인 대기</h2>
            </div>
            <span className="count-badge">{pendingPurchases?.length || 0}건</span>
          </div>
          {pendingPurchases?.length ? (
            <ul className="member-list">
              {pendingPurchases.map((purchase) => {
                const student = Array.isArray(purchase.students)
                  ? purchase.students[0]
                  : purchase.students;
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
                        {student?.name || "학생"} · {purchase.price_paid}P
                      </span>
                    </div>
                    <div className="member-actions">
                      <form
                        action={decidePurchase.bind(
                          null,
                          roomId,
                          purchase.id,
                          "approved",
                        )}
                      >
                        <SubmitButton pendingLabel="승인 중…">승인</SubmitButton>
                      </form>
                      <form
                        action={decidePurchase.bind(
                          null,
                          roomId,
                          purchase.id,
                          "rejected",
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
                );
              })}
            </ul>
          ) : (
            <p className="empty-state">승인 대기 중인 요청이 없습니다.</p>
          )}
        </section>
      )}

      {section === "report" && (
        <section className="section-block">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Progress</p>
              <h2>학생별 요약</h2>
            </div>
            <span className="count-badge">{students?.length || 0}명</span>
          </div>
          {students?.length ? (
            <ul className="report-list">
              {students.map((student) => {
                const studentEvals =
                  evaluations?.filter(
                    (evaluation) => evaluation.student_id === student.id,
                  ) || [];
                const studentReflections =
                  reflections
                    ?.filter(
                      (reflection) => reflection.student_id === student.id,
                    )
                    .map((reflection) => ({
                      session_id: reflection.session_id,
                      praise_tags: reflection.praise_tags,
                    })) || [];
                const progress = deriveProgress(
                  sessions || [],
                  studentEvals,
                  studentReflections,
                );
                const stamps = studentEvals.filter(
                  (evaluation) => evaluationCount(evaluation) === 3,
                ).length;
                return (
                  <li key={student.id}>
                    <div>
                      <strong>{student.name}</strong>
                      <span>
                        도장 {stamps} · 포인트 {progress.totalPoints}P · 최고
                        스트릭 {progress.bestStreak}일
                      </span>
                    </div>
                    <span className="count-badge">
                      현재 {progress.currentStreak}일
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="empty-state">승인된 학생이 아직 없습니다.</p>
          )}
        </section>
      )}

      {section === "art" && (
        <>
          <section className="section-block">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Upload</p>
                <h2>등급별 아트 등록</h2>
              </div>
            </div>
            <form
              className="room-form"
              action={uploadCardArt.bind(null, roomId)}
            >
              <label className="field">
                <span>등급</span>
                <select name="grade" defaultValue="R" required>
                  {gradeOptions.map((option) => (
                    <option key={option.grade} value={option.grade}>
                      {option.grade} · {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field field--wide">
                <span>이미지 (PNG/JPG/WEBP/GIF, 2MB 이하)</span>
                <input name="file" type="file" accept="image/png,image/jpeg,image/webp,image/gif" required />
              </label>
              <div className="field--wide">
                <SubmitButton pendingLabel="올리는 중…">아트 저장</SubmitButton>
              </div>
            </form>
          </section>

          <section className="section-block">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Library</p>
                <h2>등록된 아트</h2>
              </div>
              <span className="count-badge">{artPreviews.length}장</span>
            </div>
            {artPreviews.length ? (
              <ul className="art-grid">
                {artPreviews.map((art) => {
                  const label =
                    gradeOptions.find((option) => option.grade === art.grade)
                      ?.label || art.grade;
                  return (
                    <li key={art.id}>
                      {art.previewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={art.previewUrl} alt={`${label} 카드 아트`} />
                      ) : (
                        <div className="art-grid__fallback">{art.grade}</div>
                      )}
                      <div>
                        <strong>
                          {art.grade} · {label}
                        </strong>
                        <span>
                          {new Intl.DateTimeFormat("ko-KR", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          }).format(new Date(art.updated_at))}
                        </span>
                      </div>
                      <form action={removeCardArt.bind(null, roomId, art.id)}>
                        <SubmitButton
                          className="button button--danger"
                          pendingLabel="삭제 중…"
                        >
                          삭제
                        </SubmitButton>
                      </form>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="empty-state">
                아직 등록된 아트가 없습니다. 등급을 고르고 이미지를 올려 주세요.
              </p>
            )}
          </section>
        </>
      )}
    </AppShell>
  );
}
