"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { deriveProgress } from "@/domain/progress";
import { requireActiveStudent } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function purchaseError(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("already pending")) return "이미 승인 대기 중인 보상이에요.";
  if (normalized.includes("monthly")) return "이번 달 구매 한도를 다 썼어요.";
  if (normalized.includes("season")) return "학기 구매 한도를 다 썼어요.";
  if (normalized.includes("not found")) return "상점 항목을 찾을 수 없어요.";
  return "구매 요청을 보내지 못했어요.";
}

export async function requestPurchase(itemId: string, _formData: FormData) {
  void _formData;
  if (!uuidPattern.test(itemId)) {
    redirect(`/me/shop?error=${encodeURIComponent("잘못된 상점 항목입니다.")}`);
  }

  const viewer = await requireActiveStudent();
  const supabase = await createClient();
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
  }).format(new Date());

  const [
    { data: item },
    { data: sessions },
    { data: evaluations },
    { data: reflections },
    { data: purchases },
  ] = await Promise.all([
    supabase
      .from("shop_items")
      .select("id,price,is_active")
      .eq("id", itemId)
      .eq("room_id", viewer.roomId)
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
        "session_id,attitude,participation,homework,is_lucky,joker_used",
      )
      .eq("room_id", viewer.roomId)
      .eq("student_id", viewer.studentId),
    supabase
      .from("reflections")
      .select("session_id,praise_tags")
      .eq("room_id", viewer.roomId)
      .eq("student_id", viewer.studentId),
    supabase
      .from("purchases")
      .select("price_paid,status")
      .eq("room_id", viewer.roomId)
      .eq("student_id", viewer.studentId),
  ]);

  if (!item || !item.is_active) {
    redirect(`/me/shop?error=${encodeURIComponent("상점 항목을 찾을 수 없어요.")}`);
  }

  const progress = deriveProgress(
    sessions || [],
    evaluations || [],
    reflections || [],
  );
  const spent =
    purchases
      ?.filter((purchase) => purchase.status === "approved")
      .reduce((sum, purchase) => sum + purchase.price_paid, 0) || 0;
  const reserved =
    purchases
      ?.filter((purchase) => purchase.status === "pending")
      .reduce((sum, purchase) => sum + purchase.price_paid, 0) || 0;
  const available = Math.max(0, progress.totalPoints - spent - reserved);

  if (available < item.price) {
    redirect(`/me/shop?error=${encodeURIComponent("별 포인트가 부족해요.")}`);
  }

  const { error } = await supabase.rpc("request_purchase", {
    p_item_id: itemId,
  });

  if (error) {
    redirect(`/me/shop?error=${encodeURIComponent(purchaseError(error.message))}`);
  }

  revalidatePath("/me/shop");
  revalidatePath(`/room/${viewer.roomId}/approve`);
  redirect(`/me/shop?message=${encodeURIComponent("구매 요청을 보냈어요.")}`);
}
