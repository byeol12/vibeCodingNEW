"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTeacher } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type CardGrade = Database["public"]["Enums"]["card_grade"];

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const grades = new Set<CardGrade>(["C", "U", "R", "E", "L", "J"]);
const allowedTypes = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);
const maxBytes = 2 * 1024 * 1024;

function artRedirect(
  roomId: string,
  kind: "error" | "message",
  message: string,
): never {
  redirect(`/room/${roomId}/art?${kind}=${encodeURIComponent(message)}`);
}

function extensionFor(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/gif") return "gif";
  return "jpg";
}

export async function uploadCardArt(roomId: string, formData: FormData) {
  if (!uuidPattern.test(roomId)) {
    artRedirect(roomId, "error", "잘못된 방입니다.");
  }

  await requireTeacher();
  const gradeRaw = String(formData.get("grade") || "").toUpperCase();
  const file = formData.get("file");

  if (!grades.has(gradeRaw as CardGrade)) {
    artRedirect(roomId, "error", "등급을 선택해 주세요.");
  }
  if (!(file instanceof File) || file.size === 0) {
    artRedirect(roomId, "error", "이미지 파일을 선택해 주세요.");
  }
  if (!allowedTypes.has(file.type)) {
    artRedirect(roomId, "error", "PNG, JPG, WEBP, GIF만 올릴 수 있어요.");
  }
  if (file.size > maxBytes) {
    artRedirect(roomId, "error", "이미지는 2MB 이하로 올려 주세요.");
  }

  const grade = gradeRaw as CardGrade;
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("card_arts")
    .select("id,storage_path")
    .eq("room_id", roomId)
    .eq("grade", grade)
    .maybeSingle();

  const storagePath = `${roomId}/${grade}/cover.${extensionFor(file.type)}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from("card-art")
    .upload(storagePath, bytes, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    artRedirect(roomId, "error", "이미지를 올리지 못했어요.");
  }

  if (existing) {
    const { error } = await supabase
      .from("card_arts")
      .update({
        storage_path: storagePath,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .eq("room_id", roomId);

    if (error) {
      artRedirect(roomId, "error", "아트 정보를 저장하지 못했어요.");
    }

    if (existing.storage_path !== storagePath) {
      await supabase.storage.from("card-art").remove([existing.storage_path]);
    }
  } else {
    const { error } = await supabase.from("card_arts").insert({
      room_id: roomId,
      grade,
      storage_path: storagePath,
    });

    if (error) {
      await supabase.storage.from("card-art").remove([storagePath]);
      artRedirect(roomId, "error", "아트 정보를 저장하지 못했어요.");
    }
  }

  revalidatePath(`/room/${roomId}/art`);
  revalidatePath(`/me/dex`);
  artRedirect(roomId, "message", `${grade} 등급 아트를 저장했어요.`);
}

export async function removeCardArt(
  roomId: string,
  artId: string,
  _formData: FormData,
) {
  void _formData;
  if (!uuidPattern.test(roomId) || !uuidPattern.test(artId)) {
    artRedirect(roomId, "error", "잘못된 요청입니다.");
  }

  await requireTeacher();
  const supabase = await createClient();
  const { data: art } = await supabase
    .from("card_arts")
    .select("id,storage_path,grade")
    .eq("id", artId)
    .eq("room_id", roomId)
    .maybeSingle();

  if (!art) {
    artRedirect(roomId, "error", "아트를 찾을 수 없어요.");
  }

  await supabase.storage.from("card-art").remove([art.storage_path]);
  const { error } = await supabase
    .from("card_arts")
    .delete()
    .eq("id", art.id)
    .eq("room_id", roomId);

  if (error) {
    artRedirect(roomId, "error", "아트를 삭제하지 못했어요.");
  }

  revalidatePath(`/room/${roomId}/art`);
  revalidatePath(`/me/dex`);
  artRedirect(roomId, "message", `${art.grade} 등급 아트를 삭제했어요.`);
}
