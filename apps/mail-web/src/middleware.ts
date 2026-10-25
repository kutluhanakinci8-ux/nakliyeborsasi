import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const MAIL_UI_LOCALE_COOKIE = "lerta-mail-ui-locale";

export function middleware(request: NextRequest) {
  const lang = request.nextUrl.searchParams.get("lang");
  if (lang !== "en" && lang !== "tr") {
    return NextResponse.next();
  }
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-mail-ui-locale", lang);
  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.cookies.set(MAIL_UI_LOCALE_COOKIE, lang, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return response;
}

export const config = {
  matcher: ["/login", "/mail/:path*", "/help/:path*"],
};
