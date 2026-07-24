import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

const otpTypes = new Set<EmailOtpType>([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

export async function GET(request: NextRequest) {
  const url = request.nextUrl.clone();
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const typeParam = request.nextUrl.searchParams.get("type");
  const type =
    typeParam && otpTypes.has(typeParam as EmailOtpType)
      ? (typeParam as EmailOtpType)
      : null;

  if (!hasSupabaseEnv()) {
    url.pathname = "/";
    url.search = "";
    url.searchParams.set("error", "Supabase 환경변수가 설정되지 않았습니다.");
    return NextResponse.redirect(url);
  }

  const supabase = await createClient();
  let errorMessage: string | null = null;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) errorMessage = error.message;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (error) errorMessage = error.message;
  } else {
    url.pathname = "/";
    url.search = "";
    url.searchParams.set(
      "error",
      "이메일 확인 링크가 올바르지 않습니다. 메일 링크를 다시 요청하거나, Vercel의 NEXT_PUBLIC_SITE_URL과 Supabase Redirect URL을 확인해 주세요.",
    );
    return NextResponse.redirect(url);
  }

  url.search = "";

  if (errorMessage) {
    url.pathname = "/";
    url.searchParams.set(
      "error",
      "이메일 확인에 실패했습니다. 링크가 만료됐을 수 있어요. 다시 가입하거나 로그인해 주세요.",
    );
    return NextResponse.redirect(url);
  }

  url.pathname = "/dashboard";
  return NextResponse.redirect(url);
}
