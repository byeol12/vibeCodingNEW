import { NextResponse, type NextRequest } from "next/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.clone();
  const code = request.nextUrl.searchParams.get("code");

  if (!hasSupabaseEnv() || !code) {
    url.pathname = "/";
    url.search = "";
    url.searchParams.set("error", "이메일 확인 링크가 올바르지 않습니다.");
    return NextResponse.redirect(url);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  url.search = "";

  if (error) {
    url.pathname = "/";
    url.searchParams.set("error", "이메일 확인에 실패했습니다. 다시 로그인해 주세요.");
    return NextResponse.redirect(url);
  }

  url.pathname = "/dashboard";
  return NextResponse.redirect(url);
}
