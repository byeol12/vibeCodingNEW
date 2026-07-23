import { NextResponse, type NextRequest } from "next/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { updateSession } from "@/lib/supabase/proxy";

const protectedPrefixes = ["/dashboard", "/room", "/me"];

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isProtected = protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (!hasSupabaseEnv()) {
    if (!isProtected) return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("setup", "required");
    return NextResponse.redirect(url);
  }

  const response = await updateSession(request);
  if (!isProtected) return response;

  const hasAuthCookie = request.cookies
    .getAll()
    .some(({ name }) => name.startsWith("sb-") && name.includes("-auth-token"));
  if (hasAuthCookie) return response;

  const url = request.nextUrl.clone();
  url.pathname = pathname.startsWith("/me") ? "/join" : "/";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
