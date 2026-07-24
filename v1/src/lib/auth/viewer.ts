import { redirect } from "next/navigation";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type Viewer =
  | { role: "teacher"; userId: string }
  | {
      role: "student";
      userId: string;
      studentId: string;
      roomId: string;
      name: string;
      status: "pending" | "active" | "revoked";
    };

export async function getViewer(): Promise<Viewer | null> {
  if (!hasSupabaseEnv()) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || !userId) return null;

  if (data.claims.is_anonymous === true) {
    const { data: student } = await supabase
      .from("students")
      .select("id,room_id,name,status")
      .eq("auth_user_id", userId)
      .maybeSingle();

    if (!student) return null;
    return {
      role: "student",
      userId,
      studentId: student.id,
      roomId: student.room_id,
      name: student.name,
      status: student.status,
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  return profile ? { role: "teacher", userId } : null;
}

export async function requireTeacher() {
  const viewer = await getViewer();
  if (!viewer || viewer.role !== "teacher") redirect("/");
  return viewer;
}

export async function requireStudent() {
  const viewer = await getViewer();
  if (!viewer || viewer.role !== "student") redirect("/join");
  return viewer;
}

export async function requireActiveStudent() {
  const viewer = await requireStudent();
  if (viewer.status !== "active") redirect("/me");
  return viewer;
}
