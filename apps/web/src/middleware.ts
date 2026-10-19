import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isLertaCommsPortalHost } from "./lib/lertaCommsPortal";

const COMMS_ALLOWED_PREFIXES = [
  "/login",
  "/messaging",
  "/_next",
  "/api",
  "/favicon.ico",
  "/manifest",
  "/messaging-push-sw.js",
];

export function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0];
  if (!isLertaCommsPortalHost(host)) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/messaging?tab=sohbet", request.url));
  }

  const allowed = COMMS_ALLOWED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (!allowed) {
    return NextResponse.redirect(new URL("/messaging?tab=sohbet", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
