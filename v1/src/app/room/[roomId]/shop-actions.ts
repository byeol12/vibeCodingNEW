"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTeacher } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function roomRedirect(
  roomId: string,
  section: string,
  kind: "error" | "message",
  message: string,
) {
  redirect(
    `/room/${roomId}/${section}?${kind}=${encodeURIComponent(message)}`,
  );
}

export async function upsertShopItem(roomId: string, formData: FormData) {
  if (!uuidPattern.test(roomId)) {
    roomRedirect(roomId, "shop", "error", "잘못된 방입니다.");
  }

  await requireTeacher();
  const itemId = String(formData.get("itemId") || "");
  const icon = String(formData.get("icon") || "🎁").trim().slice(0, 16) || "🎁";
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim().slice(0, 500);
  const price = Number(formData.get("price") || 0);
  const limitMonthRaw = String(formData.get("limitMonth") || "").trim();
  const limitSeasonRaw = String(formData.get("limitSeason") || "").trim();
  const needsApproval = formData.get("needsApproval") === "on";
  const sortOrder = Number(formData.get("sortOrder") || 0);
  const limitMonth = limitMonthRaw ? Number(limitMonthRaw) : null;
  const limitSeason = limitSeasonRaw ? Number(limitSeasonRaw) : null;

  if (
    !name ||
    name.length > 80 ||
    !Number.isFinite(price) ||
    price < 0 ||
    (limitMonth !== null && (!Number.isInteger(limitMonth) || limitMonth <= 0)) ||
    (limitSeason !== null &&
      (!Number.isInteger(limitSeason) || limitSeason <= 0)) ||
    (limitMonth !== null && limitSeason !== null)
  ) {
    roomRedirect(roomId, "shop", "error", "상점 항목 입력을 확인해 주세요.");
  }

  const supabase = await createClient();
  const payload = {
    room_id: roomId,
    icon,
    name,
    description,
    price,
    limit_month: limitMonth,
    limit_season: limitSeason,
    needs_approval: needsApproval,
    sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
    is_active: true,
    updated_at: new Date().toISOString(),
  };

  const { error } =
    itemId && uuidPattern.test(itemId)
      ? await supabase
          .from("shop_items")
          .update(payload)
          .eq("id", itemId)
          .eq("room_id", roomId)
      : await supabase.from("shop_items").insert(payload);

  if (error) {
    roomRedirect(roomId, "shop", "error", "상점 항목을 저장하지 못했습니다.");
  }

  revalidatePath(`/room/${roomId}/shop`);
  revalidatePath(`/me/shop`);
  roomRedirect(roomId, "shop", "message", "상점 항목을 저장했습니다.");
}

export async function deactivateShopItem(
  roomId: string,
  itemId: string,
  _formData: FormData,
) {
  void _formData;
  if (!uuidPattern.test(roomId) || !uuidPattern.test(itemId)) {
    roomRedirect(roomId, "shop", "error", "잘못된 항목입니다.");
  }

  await requireTeacher();
  const supabase = await createClient();
  const { error } = await supabase
    .from("shop_items")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", itemId)
    .eq("room_id", roomId);

  if (error) {
    roomRedirect(roomId, "shop", "error", "항목을 숨기지 못했습니다.");
  }

  revalidatePath(`/room/${roomId}/shop`);
  revalidatePath(`/me/shop`);
  roomRedirect(roomId, "shop", "message", "상점 항목을 숨겼습니다.");
}

export async function decidePurchase(
  roomId: string,
  purchaseId: string,
  status: "approved" | "rejected",
  _formData: FormData,
) {
  void _formData;
  if (
    !uuidPattern.test(roomId) ||
    !uuidPattern.test(purchaseId) ||
    (status !== "approved" && status !== "rejected")
  ) {
    roomRedirect(roomId, "approve", "error", "잘못된 승인 요청입니다.");
  }

  const teacher = await requireTeacher();
  const supabase = await createClient();
  const { error } = await supabase
    .from("purchases")
    .update({
      status,
      decided_at: new Date().toISOString(),
      decided_by: teacher.userId,
    })
    .eq("id", purchaseId)
    .eq("room_id", roomId)
    .eq("status", "pending");

  if (error) {
    roomRedirect(roomId, "approve", "error", "구매 요청을 처리하지 못했습니다.");
  }

  revalidatePath(`/room/${roomId}/approve`);
  revalidatePath(`/me/shop`);
  roomRedirect(
    roomId,
    "approve",
    "message",
    status === "approved" ? "구매를 승인했습니다." : "구매를 거절했습니다.",
  );
}

export async function seedShopPresets(roomId: string, _formData: FormData) {
  void _formData;
  if (!uuidPattern.test(roomId)) {
    roomRedirect(roomId, "shop", "error", "잘못된 방입니다.");
  }

  await requireTeacher();
  const supabase = await createClient();
  const { error } = await supabase.rpc("seed_default_shop_items", {
    target_room_id: roomId,
  });

  if (error) {
    roomRedirect(roomId, "shop", "error", "기본 보상을 채우지 못했습니다.");
  }

  revalidatePath(`/room/${roomId}/shop`);
  revalidatePath(`/me/shop`);
  roomRedirect(roomId, "shop", "message", "기본 보상 목록을 준비했습니다.");
}
