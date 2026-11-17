import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/constants";

// Lightweight route guard. Real authorisation happens server-side in each page / API handler (lib/auth.ts).
const PUBLIC_PREFIXES = ["/login", "/register", "/forgot-password", "/reset-password", "/verify", "/share", "/api/auth", "/api/share", "/api/media", "/manifest.webmanifest", "/icons", "/pik-tourism-board-logo.png", "/qr/"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p))) return NextResponse.next();
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  if (!hasSession) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Please sign in to continue." }, { status: 401 });
    const url = new URL("/login", request.url);
    const next = pathname + request.nextUrl.search;
    if (next !== "/") url.searchParams.set("next", next);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico|woff2?)$).*)"],
};
