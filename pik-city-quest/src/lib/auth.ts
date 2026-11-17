import { cookies, headers } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { prisma } from "./db";
import { ADMIN_ROLES, PERMISSIONS, type Permission, type Role, SESSION_COOKIE, SESSION_DAYS } from "./constants";
import { cache } from "react";

const secret = new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret-change-me");

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10);
}
export async function verifyPassword(pw: string, hash: string | null | undefined) {
  if (!hash) return false;
  return bcrypt.compare(pw, hash);
}

export function sha256(input: string) {
  return createHash("sha256").update(input).digest("hex");
}

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

/** Creates a DB-backed session and returns the signed cookie value */
export async function createSession(userId: string, meta?: { userAgent?: string | null; ip?: string | null }) {
  const raw = randomToken(32);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 3600 * 1000);
  const session = await prisma.session.create({
    data: { userId, tokenHash: sha256(raw), expiresAt, userAgent: meta?.userAgent ?? null, ip: meta?.ip ?? null },
  });
  const jwt = await new SignJWT({ sid: session.id, t: raw })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .setSubject(userId)
    .sign(secret);
  await prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
  return { jwt, expiresAt };
}

export async function setSessionCookie(jwt: string, expiresAt: Date) {
  const store = await cookies();
  store.set(SESSION_COOKIE, jwt, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", expires: new Date(0) });
}

export type SessionUser = NonNullable<Awaited<ReturnType<typeof loadSessionUser>>>;

async function loadSessionUser() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    const sid = payload.sid as string;
    const raw = payload.t as string;
    if (!sid || !raw) return null;
    const session = await prisma.session.findUnique({ where: { id: sid }, include: { user: true } });
    if (!session || session.revokedAt || session.expiresAt < new Date()) return null;
    if (session.tokenHash !== sha256(raw)) return null;
    if (!session.user.isActive) return null;
    const { passwordHash: _ph, ...user } = session.user;
    void _ph;
    return { ...user, sessionId: session.id };
  } catch {
    return null;
  }
}

/** Cached per request */
export const getCurrentUser = cache(loadSessionUser);

export async function revokeSession(sessionId: string) {
  await prisma.session.update({ where: { id: sessionId }, data: { revokedAt: new Date() } }).catch(() => {});
}

export function hasPermission(role: string, perm: Permission) {
  return (PERMISSIONS[perm] as readonly string[]).includes(role);
}
export function isAdminRole(role: string) {
  return (ADMIN_ROLES as string[]).includes(role);
}

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "Please sign in to continue.");
  return user;
}

export async function requirePermission(perm: Permission) {
  const user = await requireUser();
  if (!hasPermission(user.role, perm)) throw new HttpError(403, "You do not have access to this action.");
  return user;
}

export async function requestMeta() {
  const h = await headers();
  return {
    userAgent: h.get("user-agent"),
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null,
  };
}

export function roleLabel(role: string) {
  return (
    {
      VISITOR: "Explorer",
      SUPER_ADMIN: "Super Admin",
      QUEST_MANAGER: "Quest Manager",
      VERIFICATION_ADMIN: "Verification Admin",
      PARTNER_ADMIN: "Partner / Venue Admin",
    } as Record<string, string>
  )[role] ?? role;
}

export type { Role };
