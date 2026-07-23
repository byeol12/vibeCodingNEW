"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

function homeRedirect(kind: "error" | "message", message: string) {
  redirect(`/?${kind}=${encodeURIComponent(message)}`);
}

function readableAuthError(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid login credentials")) {
    return "이메일 또는 비밀번호가 올바르지 않습니다.";
  }
  if (normalized.includes("already registered")) {
    return "이미 가입된 이메일입니다.";
  }
  if (normalized.includes("password")) {
    return "비밀번호는 8자 이상으로 입력해 주세요.";
  }
  return "인증 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";
}

export async function signInTeacher(formData: FormData) {
  if (!hasSupabaseEnv()) {
    homeRedirect("error", "먼저 Supabase 환경변수를 설정해 주세요.");
  }

  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  if (!email || !password) {
    homeRedirect("error", "이메일과 비밀번호를 모두 입력해 주세요.");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) homeRedirect("error", readableAuthError(error.message));

  redirect("/dashboard");
}

export async function signUpTeacher(formData: FormData) {
  if (!hasSupabaseEnv()) {
    homeRedirect("error", "먼저 Supabase 환경변수를 설정해 주세요.");
  }

  const displayName = String(formData.get("displayName") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  if (!displayName || !email || password.length < 8) {
    homeRedirect("error", "이름, 이메일, 8자 이상의 비밀번호를 입력해 주세요.");
  }

  const requestHeaders = await headers();
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ||
    requestHeaders.get("origin") ||
    "http://localhost:3000";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: { display_name: displayName },
    },
  });

  if (error) homeRedirect("error", readableAuthError(error.message));
  if (data.session) redirect("/dashboard");
  homeRedirect("message", "확인 이메일을 보냈습니다. 이메일의 링크를 눌러 주세요.");
}

export async function signOut() {
  if (hasSupabaseEnv()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}
