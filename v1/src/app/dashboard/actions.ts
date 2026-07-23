"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function dashboardRedirect(kind: "error" | "message", message: string) {
  redirect(`/dashboard?${kind}=${encodeURIComponent(message)}`);
}

function readRoomId(data: unknown) {
  const value = Array.isArray(data) ? data[0] : data;
  if (!value || typeof value !== "object" || !("id" in value)) return null;
  return typeof value.id === "string" ? value.id : null;
}

export async function createRoom(formData: FormData) {
  const title = String(formData.get("title") || "").trim();
  const weekdays = formData
    .getAll("weekdays")
    .map(Number)
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
  const startDate = String(formData.get("startDate") || "");
  const endDate = String(formData.get("endDate") || "");
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;

  if (
    !title ||
    title.length > 100 ||
    weekdays.length === 0 ||
    !datePattern.test(startDate) ||
    !datePattern.test(endDate) ||
    endDate < startDate
  ) {
    dashboardRedirect("error", "방 이름, 수업 요일, 기간을 확인해 주세요.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_room_with_sessions", {
    p_title: title,
    p_weekdays: [...new Set(weekdays)],
    p_start_date: startDate,
    p_end_date: endDate,
  });

  if (error) {
    dashboardRedirect("error", "방을 만들지 못했습니다. 입력값을 확인해 주세요.");
  }

  const roomId = readRoomId(data);
  if (!roomId) dashboardRedirect("error", "생성된 방 정보를 확인하지 못했습니다.");

  revalidatePath("/dashboard");
  redirect(`/room/${roomId}?message=${encodeURIComponent("수업 방을 만들었습니다.")}`);
}
