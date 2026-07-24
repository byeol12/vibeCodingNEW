"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireActiveStudent } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function purchaseError(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("already pending")) return "이미 승인 대기 중인 보상이에요.";
  if (normalized.includes("monthly")) return "이번 달 구매 한도를 다 썼어요.";
  if (normalized.includes("season")) return "학기 구매 한도를 다 썼어요.";
  if (normalized.includes("insufficient")) return "별 포인트가 부족해요.";
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

  const [{ data: item }, { data: availableBalance }] = await Promise.all([
    supabase
      .from("shop_items")
      .select("id,price,is_active")
      .eq("id", itemId)
      .eq("room_id", viewer.roomId)
      .maybeSingle(),
    supabase.rpc("student_available_balance", {
      p_student_id: viewer.studentId,
    }),
  ]);

  if (!item || !item.is_active) {
    redirect(`/me/shop?error=${encodeURIComponent("상점 항목을 찾을 수 없어요.")}`);
  }

  if ((availableBalance || 0) < item.price) {
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
