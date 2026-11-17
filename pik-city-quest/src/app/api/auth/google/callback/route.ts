import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { createSession, requestMeta, setSessionCookie } from "@/lib/auth";
import { slugify } from "@/lib/utils";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const store = await cookies();
  const expected = store.get("pikq_oauth_state")?.value;
  store.set("pikq_oauth_state", "", { path: "/", maxAge: 0 });
  if (!code || !state || state !== expected) return NextResponse.redirect(new URL("/login?error=google_state", req.url));
  const redirectUri = `${process.env.APP_URL || url.origin}/api/auth/google/callback`;
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, redirect_uri: redirectUri, grant_type: "authorization_code" }),
  });
  if (!tokenRes.ok) return NextResponse.redirect(new URL("/login?error=google_token", req.url));
  const tokens = (await tokenRes.json()) as { access_token: string };
  const infoRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${tokens.access_token}` } });
  const info = (await infoRes.json()) as { sub: string; email: string; name?: string; picture?: string; email_verified?: boolean };
  let user = await prisma.user.findFirst({ where: { OR: [{ googleId: info.sub }, { email: info.email.toLowerCase() }] } });
  let isNew = false;
  if (!user) {
    let username = slugify(info.name || info.email.split("@")[0]).replace(/-/g, "_").slice(0, 18) || "explorer";
    while (await prisma.user.findUnique({ where: { username } })) username = `${username}${Math.floor(100 + Math.random() * 900)}`;
    user = await prisma.user.create({ data: { email: info.email.toLowerCase(), googleId: info.sub, name: info.name || "Explorer", username, avatarUrl: info.picture, emailVerifiedAt: info.email_verified ? new Date() : null } });
    isNew = true;
  } else if (!user.googleId) {
    user = await prisma.user.update({ where: { id: user.id }, data: { googleId: info.sub, avatarUrl: user.avatarUrl ?? info.picture, emailVerifiedAt: user.emailVerifiedAt ?? (info.email_verified ? new Date() : null) } });
  }
  const { jwt, expiresAt } = await createSession(user.id, await requestMeta());
  await setSessionCookie(jwt, expiresAt);
  return NextResponse.redirect(new URL(isNew ? "/welcome" : "/", req.url));
}
