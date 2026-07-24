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

function isAnonymousClaim(claims: Record<string, unknown> | undefined) {
  if (!claims) return false;
  const value = claims.is_anonymous;
  return value === true || value === "true";
}

export async function getViewer(): Promise<Viewer | null> {
  if (!hasSupabaseEnv()) return null;

  const supabase = await createClient();
  const [{ data: userData, error: userError }, { data: claimsData }] =
    await Promise.all([
      supabase.auth.getUser(),
      supabase.auth.getClaims(),
    ]);

  const user = userData.user;
  if (userError || !user) return null;

  const anonymous =
    user.is_anonymous === true ||
    isAnonymousClaim(claimsData?.claims as Record<string, unknown> | undefined);

  if (anonymous) {
    const { data: student } = await supabase
      .from("students")
      .select("id,room_id,name,status")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!student) return null;
    return {
      role: "student",
      userId: user.id,
      studentId: student.id,
      roomId: student.room_id,
      name: student.name,
      status: student.status,
    };
  }

  // 익명 클레임이 비어도 students 행이 있으면 학생으로 본다.
  const { data: studentByAuth } = await supabase
    .from("students")
    .select("id,room_id,name,status")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (studentByAuth) {
    return {
      role: "student",
      userId: user.id,
      studentId: studentByAuth.id,
      roomId: studentByAuth.room_id,
      name: studentByAuth.name,
      status: studentByAuth.status,
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  return profile ? { role: "teacher", userId: user.id } : null;
}

export async function requireTeacher() {
  const viewer = await getViewer();
  if (viewer?.role === "student") redirect("/me");
  if (!viewer || viewer.role !== "teacher") redirect("/");
  return viewer;
}

export async function requireStudent() {
  const viewer = await getViewer();
  if (viewer?.role === "teacher") redirect("/dashboard");
  if (!viewer || viewer.role !== "student") redirect("/join");
  return viewer;
}

export async function requireActiveStudent() {
  const viewer = await requireStudent();
  if (viewer.status !== "active") redirect("/me");
  return viewer;
}
