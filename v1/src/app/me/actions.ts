"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isWeeklyHelpfulFactor } from "@/domain/weekly";
import { requireActiveStudent } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

const praiseTags = new Set([
  "hand",
  "ask",
  "note",
  "time",
  "retry",
  "help",
  "focus",
  "grit",
  "prep",
  "greet",
]);
const struggleTags = new Set(["sleepy", "phone", "focus", "hard", "lost"]);
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function saveReflection(sessionId: string, formData: FormData) {
  if (!uuidPattern.test(sessionId)) {
    redirect(`/me?error=${encodeURIComponent("잘못된 수업 기록입니다.")}`);
  }

  const viewer = await requireActiveStudent();
  const supabase = await createClient();
  const { data: evaluation } = await supabase
    .from("evaluations")
    .select("attitude,participation,homework")
    .eq("room_id", viewer.roomId)
    .eq("student_id", viewer.studentId)
    .eq("session_id", sessionId)
    .maybeSingle();

  if (
    !evaluation ||
    (!evaluation.attitude &&
      !evaluation.participation &&
      !evaluation.homework)
  ) {
    redirect(`/me?error=${encodeURIComponent("선생님 평가가 먼저 필요합니다.")}`);
  }

  const selectedPraise = formData
    .getAll("praise")
    .map(String)
    .filter((tag) => praiseTags.has(tag))
    .slice(0, 3);
  const selectedStruggle = formData
    .getAll("struggle")
    .map(String)
    .filter((tag) => struggleTags.has(tag));

  const { error } = await supabase.from("reflections").upsert(
    {
      room_id: viewer.roomId,
      student_id: viewer.studentId,
      session_id: sessionId,
      praise_tags: [...new Set(selectedPraise)],
      struggle_tags: [...new Set(selectedStruggle)],
      updated_at: new Date().toISOString(),
    },
    { onConflict: "student_id,session_id" },
  );

  if (error) {
    redirect(`/me?error=${encodeURIComponent("자기관찰을 저장하지 못했습니다.")}`);
  }

  revalidatePath("/me");
  redirect(`/me?message=${encodeURIComponent("오늘의 자기관찰을 저장했습니다.")}`);
}

export async function applyJoker(sessionId: string, _formData: FormData) {
  void _formData;
  if (!uuidPattern.test(sessionId)) {
    redirect(`/me?error=${encodeURIComponent("잘못된 수업일입니다.")}`);
  }

  const viewer = await requireActiveStudent();
  const supabase = await createClient();
  const { error } = await supabase.rpc("apply_joker", {
    p_session_id: sessionId,
    p_student_id: viewer.studentId,
  });

  if (error) {
    const normalized = error.message.toLowerCase();
    const message = normalized.includes("no joker")
      ? "보유한 조커 카드가 없어요."
      : normalized.includes("partial")
        ? "체크가 1~2개인 날에만 조커를 쓸 수 있어요."
        : "조커를 사용하지 못했어요.";
    redirect(`/me?error=${encodeURIComponent(message)}`);
  }

  await supabase.rpc("sync_joker_awards", { p_student_id: viewer.studentId });
  await supabase.rpc("sync_bonus_awards", { p_student_id: viewer.studentId });
  revalidatePath("/me");
  revalidatePath("/me/shop");
  redirect(`/me?message=${encodeURIComponent("조커 카드를 사용했어요.")}`);
}

export async function saveWeeklyReflection(formData: FormData) {
  const viewer = await requireActiveStudent();
  const weekStart = String(formData.get("week_start") || "");
  const helpful = String(formData.get("helpful") || "");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    redirect(`/me?error=${encodeURIComponent("잘못된 주간 정보입니다.")}`);
  }
  if (!isWeeklyHelpfulFactor(helpful)) {
    redirect(`/me?error=${encodeURIComponent("하나를 골라 주세요.")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.from("weekly_reflections").upsert(
    {
      room_id: viewer.roomId,
      student_id: viewer.studentId,
      week_start: weekStart,
      helpful_factor: helpful,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "student_id,week_start" },
  );

  if (error) {
    redirect(`/me?error=${encodeURIComponent("주간 회고를 저장하지 못했습니다.")}`);
  }

  revalidatePath("/me");
  redirect(`/me?message=${encodeURIComponent("이번 주 회고를 저장했습니다.")}`);
}
