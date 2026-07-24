"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTeacher } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function updateStudentStatus(
  roomId: string,
  studentId: string,
  status: "active" | "revoked",
  _formData?: FormData,
) {
  void _formData;
  if (
    !uuidPattern.test(roomId) ||
    !uuidPattern.test(studentId) ||
    (status !== "active" && status !== "revoked")
  ) {
    redirect(`/room/${roomId}?error=${encodeURIComponent("잘못된 승인 요청입니다.")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("students")
    .update({ status })
    .eq("id", studentId)
    .eq("room_id", roomId);

  if (error) {
    redirect(
      `/room/${roomId}?error=${encodeURIComponent("학생 상태를 변경하지 못했습니다.")}`,
    );
  }

  revalidatePath(`/room/${roomId}`);
  revalidatePath("/me");
  const message = status === "active" ? "학생 입장을 승인했습니다." : "학생 입장을 중지했습니다.";
  redirect(`/room/${roomId}?message=${encodeURIComponent(message)}`);
}

export async function saveEvaluation(
  roomId: string,
  sessionId: string,
  studentId: string,
  formData: FormData,
) {
  if (
    !uuidPattern.test(roomId) ||
    !uuidPattern.test(sessionId) ||
    !uuidPattern.test(studentId)
  ) {
    redirect(`/room/${roomId}?error=${encodeURIComponent("잘못된 평가 요청입니다.")}`);
  }

  const teacher = await requireTeacher();
  const supabase = await createClient();
  const [{ data: session }, { data: student }, { data: existing }] =
    await Promise.all([
      supabase
        .from("sessions")
        .select("id")
        .eq("id", sessionId)
        .eq("room_id", roomId)
        .maybeSingle(),
      supabase
        .from("students")
        .select("id")
        .eq("id", studentId)
        .eq("room_id", roomId)
        .eq("status", "active")
        .maybeSingle(),
      supabase
        .from("evaluations")
        .select("attitude,participation,homework,is_lucky,joker_used")
        .eq("session_id", sessionId)
        .eq("student_id", studentId)
        .maybeSingle(),
    ]);

  if (!session || !student) {
    redirect(`/room/${roomId}?error=${encodeURIComponent("수업일 또는 학생을 확인할 수 없습니다.")}`);
  }

  const attitude = formData.get("attitude") === "on";
  const participation = formData.get("participation") === "on";
  const homework = formData.get("homework") === "on";
  const wantJoker = formData.get("jokerUsed") === "on";
  const teacherMemo = String(formData.get("teacherMemo") || "")
    .trim()
    .slice(0, 1000);
  const completed = attitude && participation && homework;
  const wasCompleted = Boolean(
    existing?.attitude && existing.participation && existing.homework,
  );
  const isLucky =
    existing?.is_lucky || (completed && !wasCompleted && randomInt(10) === 0);
  const itemCount =
    Number(attitude) + Number(participation) + Number(homework);

  // 조커는 원장 RPC로만 켜고 끈다. 평가 저장은 기존 사용 상태를 유지한다.
  const jokerUsed = Boolean(existing?.joker_used);

  const { error } = await supabase.from("evaluations").upsert(
    {
      room_id: roomId,
      session_id: sessionId,
      student_id: studentId,
      evaluated_by: teacher.userId,
      attitude,
      participation,
      homework,
      is_lucky: isLucky,
      joker_used: jokerUsed,
      teacher_memo: teacherMemo,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "student_id,session_id" },
  );

  if (error) {
    redirect(
      `/room/${roomId}?session=${sessionId}&error=${encodeURIComponent("평가를 저장하지 못했습니다.")}`,
    );
  }

  if (wantJoker && !jokerUsed && itemCount >= 1 && itemCount <= 2) {
    const { error: jokerError } = await supabase.rpc("apply_joker", {
      p_session_id: sessionId,
      p_student_id: studentId,
    });
    if (jokerError) {
      redirect(
        `/room/${roomId}?session=${sessionId}&error=${encodeURIComponent(
          jokerError.message.toLowerCase().includes("no joker")
            ? "보유한 조커가 없어 적용하지 못했습니다. 평가는 저장됐어요."
            : "조커를 적용하지 못했습니다. 평가는 저장됐어요.",
        )}`,
      );
    }
  } else if (!wantJoker && jokerUsed) {
    const { error: refundError } = await supabase.rpc("refund_joker", {
      p_session_id: sessionId,
      p_student_id: studentId,
    });
    if (refundError) {
      redirect(
        `/room/${roomId}?session=${sessionId}&error=${encodeURIComponent(
          "조커 취소를 반영하지 못했습니다. 평가는 저장됐어요.",
        )}`,
      );
    }
  }

  await supabase.rpc("sync_joker_awards", { p_student_id: studentId });
  await supabase.rpc("sync_bonus_awards", { p_student_id: studentId });

  revalidatePath(`/room/${roomId}`);
  revalidatePath("/me");
  revalidatePath(`/me/shop`);
  revalidatePath(`/room/${roomId}/report`);
  const message =
    isLucky && !existing?.is_lucky
      ? "럭키 카드 평가를 저장했습니다."
      : "수업 평가를 저장했습니다.";
  redirect(
    `/room/${roomId}?session=${sessionId}&message=${encodeURIComponent(message)}`,
  );
}

export async function awardManualBonus(roomId: string, formData: FormData) {
  if (!uuidPattern.test(roomId)) {
    redirect(`/room/${roomId}/report?error=${encodeURIComponent("잘못된 방입니다.")}`);
  }

  await requireTeacher();
  const studentId = String(formData.get("student_id") || "");
  const points = Number(formData.get("points"));
  const note = String(formData.get("note") || "")
    .trim()
    .slice(0, 200);

  if (!uuidPattern.test(studentId)) {
    redirect(
      `/room/${roomId}/report?error=${encodeURIComponent("학생을 선택해 주세요.")}`,
    );
  }
  if (!Number.isInteger(points) || points < 1 || points > 100) {
    redirect(
      `/room/${roomId}/report?error=${encodeURIComponent("보너스는 1~100P만 가능합니다.")}`,
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: student } = await supabase
    .from("students")
    .select("id,name")
    .eq("id", studentId)
    .eq("room_id", roomId)
    .eq("status", "active")
    .maybeSingle();

  if (!student) {
    redirect(
      `/room/${roomId}/report?error=${encodeURIComponent("활성 학생만 보너스를 줄 수 있습니다.")}`,
    );
  }

  const { error } = await supabase.from("bonus_events").insert({
    room_id: roomId,
    student_id: studentId,
    kind: "manual",
    points,
    note,
    created_by: user?.id ?? null,
  });

  if (error) {
    redirect(
      `/room/${roomId}/report?error=${encodeURIComponent("보너스를 지급하지 못했습니다.")}`,
    );
  }

  revalidatePath(`/room/${roomId}/report`);
  revalidatePath("/me");
  revalidatePath("/me/shop");
  redirect(
    `/room/${roomId}/report?message=${encodeURIComponent(
      `${student.name} 학생에게 보너스 ${points}P를 지급했습니다.`,
    )}`,
  );
}
