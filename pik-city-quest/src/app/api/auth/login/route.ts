import { prisma } from "@/lib/db";
import { api, ok, rateLimit, clientKey } from "@/lib/api";
import { loginSchema } from "@/lib/validators";
import { HttpError, createSession, requestMeta, setSessionCookie, verifyPassword, isAdminRole } from "@/lib/auth";

export const POST = api(async (req) => {
  if (!rateLimit(clientKey(req, "login"), 15)) throw new HttpError(429, "Too many attempts. Try again in a minute.");
  const body = loginSchema.parse(await req.json());
  const user = await prisma.user.findUnique({ where: { email: body.email } });
  if (!user || !(await verifyPassword(body.password, user.passwordHash))) throw new HttpError(401, "Incorrect email or password.");
  if (!user.isActive) throw new HttpError(403, "This account has been deactivated.");
  const meta = await requestMeta();
  const { jwt, expiresAt } = await createSession(user.id, meta);
  await setSessionCookie(jwt, expiresAt);
  return ok({ ok: true, role: user.role, redirect: isAdminRole(user.role) ? "/admin" : "/" });
});
