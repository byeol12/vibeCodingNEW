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
  _formData: FormData,
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
        .select("attitude,participation,homework,is_lucky")
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
  const teacherMemo = String(formData.get("teacherMemo") || "")
    .trim()
    .slice(0, 1000);
  const completed = attitude && participation && homework;
  const wasCompleted = Boolean(
    existing?.attitude && existing.participation && existing.homework,
  );
  const isLucky =
    existing?.is_lucky || (completed && !wasCompleted && randomInt(10) === 0);

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

  revalidatePath(`/room/${roomId}`);
  revalidatePath("/me");
  const message = isLucky && !existing?.is_lucky ? "럭키 카드 평가를 저장했습니다." : "수업 평가를 저장했습니다.";
  redirect(
    `/room/${roomId}?session=${sessionId}&message=${encodeURIComponent(message)}`,
  );
}
