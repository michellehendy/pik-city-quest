import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomToken } from "@/lib/auth";

// Google Sign-In (OAuth 2.0 authorization code). Requires GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET.
export async function GET(req: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return NextResponse.redirect(new URL("/login?error=google_not_configured", req.url));
  const state = randomToken(16);
  const store = await cookies();
  store.set("pikq_oauth_state", state, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 600 });
  const redirectUri = `${process.env.APP_URL || new URL(req.url).origin}/api/auth/google/callback`;
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");
  return NextResponse.redirect(url);
}
