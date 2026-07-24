"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseV0JsonText, type V0State } from "@/domain/v0-import";
import type { CardGrade } from "@/domain/contracts";
import { requireTeacher } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function importRedirect(
  kind: "error" | "message",
  message: string,
  roomId?: string,
) {
  const base = roomId ? `/dashboard/import?roomId=${roomId}` : "/dashboard/import";
  redirect(`${base}&${kind}=${encodeURIComponent(message)}`);
}

function purchaseStatus(value: string): "pending" | "approved" | "rejected" | "refunded" {
  if (value === "approved" || value === "rejected" || value === "refunded") {
    return value;
  }
  return "pending";
}

function dataUrlToBytes(dataUrl: string) {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  return {
    contentType: match[1],
    bytes: Buffer.from(match[2], "base64"),
  };
}

async function importCardArts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  roomId: string,
  cardArt: V0State["cardArt"],
) {
  let uploaded = 0;
  for (const [grade, dataUrl] of Object.entries(cardArt || {}) as [
    CardGrade,
    string,
  ][]) {
    const parsed = dataUrlToBytes(dataUrl);
    if (!parsed || parsed.bytes.length > 2 * 1024 * 1024) continue;
    const ext =
      parsed.contentType === "image/png"
        ? "png"
        : parsed.contentType === "image/webp"
          ? "webp"
          : "jpg";
    const storagePath = `${roomId}/${grade}/imported.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("card-art")
      .upload(storagePath, parsed.bytes, {
        contentType: parsed.contentType,
        upsert: true,
      });
    if (uploadError) continue;

    const { data: existing } = await supabase
      .from("card_arts")
      .select("id")
      .eq("room_id", roomId)
      .eq("grade", grade)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("card_arts")
        .update({
          storage_path: storagePath,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("card_arts").insert({
        room_id: roomId,
        grade,
        storage_path: storagePath,
      });
    }
    uploaded += 1;
  }
  return uploaded;
}

export async function importV0State(formData: FormData) {
  const teacher = await requireTeacher();
  const roomId = String(formData.get("roomId") || "");
  const studentId = String(formData.get("studentId") || "");
  const payload = String(formData.get("payload") || "");

  if (!uuidPattern.test(roomId) || !uuidPattern.test(studentId) || !payload) {
    importRedirect("error", "방, 학생, JSON 파일을 모두 확인해 주세요.");
  }

  let parsedState: V0State;
  try {
    parsedState = parseV0JsonText(payload).state;
  } catch (error) {
    importRedirect(
      "error",
      error instanceof Error ? error.message : "JSON을 읽지 못했습니다.",
      roomId,
    );
    return;
  }
  const state = parsedState;

  const supabase = await createClient();
  const [{ data: room }, { data: student }, { data: sessions }] =
    await Promise.all([
      supabase
        .from("rooms")
        .select("id,title")
        .eq("id", roomId)
        .eq("teacher_id", teacher.userId)
        .maybeSingle(),
      supabase
        .from("students")
        .select("id,name,status")
        .eq("id", studentId)
        .eq("room_id", roomId)
        .eq("status", "active")
        .maybeSingle(),
      supabase
        .from("sessions")
        .select("id,session_date")
        .eq("room_id", roomId),
    ]);

  if (!room || !student) {
    importRedirect("error", "방 또는 활성 학생을 찾을 수 없습니다.", roomId);
    return;
  }
  const targetStudent = student;

  const sessionByDate = new Map(
    (sessions || []).map((session) => [session.session_date, session.id]),
  );

  let evaluationsUpserted = 0;
  let reflectionsUpserted = 0;
  let skippedDates = 0;

  for (const [date, record] of Object.entries(state.records || {})) {
    const sessionId = sessionByDate.get(date);
    if (!sessionId) {
      skippedDates += 1;
      continue;
    }
    const hasEval =
      record.attitude ||
      record.participation ||
      record.homework ||
      record.jokerUsed ||
      Boolean(record.memo);
    if (hasEval) {
      const { error } = await supabase.from("evaluations").upsert(
        {
          room_id: roomId,
          student_id: studentId,
          session_id: sessionId,
          evaluated_by: teacher.userId,
          attitude: Boolean(record.attitude),
          participation: Boolean(record.participation),
          homework: Boolean(record.homework),
          is_lucky: Boolean(record.isLucky),
          joker_used: Boolean(record.jokerUsed),
          teacher_memo: record.memo || "",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "student_id,session_id" },
      );
      if (!error) evaluationsUpserted += 1;
    }

    const praise = record.praise || [];
    const struggle = record.struggle || [];
    if (praise.length || struggle.length) {
      const { error } = await supabase.from("reflections").upsert(
        {
          room_id: roomId,
          student_id: studentId,
          session_id: sessionId,
          praise_tags: praise,
          struggle_tags: struggle,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "student_id,session_id" },
      );
      if (!error) reflectionsUpserted += 1;
    }
  }

  // Shop items: insert missing by name
  const { data: existingShop } = await supabase
    .from("shop_items")
    .select("id,name,icon,effect")
    .eq("room_id", roomId);
  const shopByName = new Map(
    (existingShop || []).map((item) => [item.name, item]),
  );
  let shopInserted = 0;
  for (const [index, item] of (state.shopItems || []).entries()) {
    if (!item.name || shopByName.has(item.name)) continue;
    const { data: inserted } = await supabase
      .from("shop_items")
      .insert({
        room_id: roomId,
        icon: item.icon || "🎁",
        name: item.name,
        description: item.desc || "",
        price: item.price || 0,
        limit_month: item.limitMonth ?? null,
        limit_season: item.limitSeason ?? null,
        needs_approval: item.needsApproval !== false,
        sort_order: 100 + index,
        effect: item.effect === "joker" ? "joker" : null,
        is_active: true,
      })
      .select("id,name,icon,effect")
      .maybeSingle();
    if (inserted) {
      shopByName.set(inserted.name, inserted);
      shopInserted += 1;
    }
  }

  // Purchases: insert historical rows (skip duplicates by name+price+status roughly)
  const { data: existingPurchases } = await supabase
    .from("purchases")
    .select("id,price_paid,status,item_id,shop_items(name)")
    .eq("room_id", roomId)
    .eq("student_id", studentId);
  const purchaseKeys = new Set(
    (existingPurchases || []).map((purchase) => {
      const item = Array.isArray(purchase.shop_items)
        ? purchase.shop_items[0]
        : purchase.shop_items;
      return `${item?.name || ""}:${purchase.price_paid}:${purchase.status}`;
    }),
  );
  let purchasesInserted = 0;
  for (const purchase of state.purchases || []) {
    const shop =
      shopByName.get(purchase.name || "") ||
      [...shopByName.values()].find((item) => item.icon === purchase.icon);
    if (!shop) continue;
    const status = purchaseStatus(purchase.status || "pending");
    const key = `${shop.name}:${purchase.price}:${status}`;
    if (purchaseKeys.has(key)) continue;
    const decided =
      status === "pending"
        ? { decided_at: null, decided_by: null }
        : {
            decided_at: new Date(purchase.ts || Date.now()).toISOString(),
            decided_by: teacher.userId,
          };
    const { error } = await supabase.from("purchases").insert({
      room_id: roomId,
      student_id: studentId,
      item_id: shop.id,
      price_paid: purchase.price || 0,
      status,
      requested_at: new Date(purchase.ts || Date.now()).toISOString(),
      ...decided,
    });
    if (!error) {
      purchaseKeys.add(key);
      purchasesInserted += 1;
    }
  }

  await supabase.rpc("sync_joker_awards", { p_student_id: studentId });

  // Ensure use ledger rows for imported joker days
  for (const [date, record] of Object.entries(state.records || {})) {
    if (!record.jokerUsed) continue;
    const sessionId = sessionByDate.get(date);
    if (!sessionId) continue;
    await supabase.from("joker_events").insert({
      room_id: roomId,
      student_id: studentId,
      delta: -1,
      source: "session_use",
      session_id: sessionId,
      note: "v0 가져오기 조커 사용",
      created_by: teacher.userId,
    });
  }

  // Recovery awards from v0
  let recoveryInserted = 0;
  for (const date of Object.keys(state.recoveryAwards || {})) {
    const sessionId = sessionByDate.get(date);
    if (!sessionId) continue;
    const { error } = await supabase.from("bonus_events").insert({
      room_id: roomId,
      student_id: studentId,
      kind: "recovery",
      points: 10,
      break_session_id: sessionId,
      note: "v0 회복 보너스 이식",
      created_by: teacher.userId,
    });
    if (!error) recoveryInserted += 1;
  }

  if ((state.bonusPoints || 0) > 0) {
    await supabase.from("bonus_events").insert({
      room_id: roomId,
      student_id: studentId,
      kind: "manual",
      points: state.bonusPoints || 0,
      note: "v0 수동 보너스 이식",
      created_by: teacher.userId,
    });
  }

  await supabase.rpc("sync_bonus_awards", { p_student_id: studentId });

  const artsUploaded = await importCardArts(supabase, roomId, state.cardArt);

  revalidatePath(`/room/${roomId}`);
  revalidatePath(`/room/${roomId}/report`);
  revalidatePath(`/room/${roomId}/shop`);
  revalidatePath(`/room/${roomId}/art`);
  revalidatePath("/me");
  revalidatePath("/dashboard/import");

  importRedirect(
    "message",
    `${targetStudent.name} 학생에게 평가 ${evaluationsUpserted}·자기관찰 ${reflectionsUpserted}·상점 ${shopInserted}·구매 ${purchasesInserted}·아트 ${artsUploaded}·회복 ${recoveryInserted}건을 가져왔습니다.${
      skippedDates ? ` (방 일정에 없는 날짜 ${skippedDates}건 제외)` : ""
    }`,
    roomId,
  );
}
