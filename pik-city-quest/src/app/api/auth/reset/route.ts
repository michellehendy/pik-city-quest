import { prisma } from "@/lib/db";
import { api, ok } from "@/lib/api";
import { HttpError, hashPassword, sha256 } from "@/lib/auth";
import { z } from "zod";

export const POST = api(async (req) => {
  const { token, password } = z.object({ token: z.string().min(10), password: z.string().min(8).max(100) }).parse(await req.json());
  const rec = await prisma.passwordResetToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!rec || rec.usedAt || rec.expiresAt < new Date()) throw new HttpError(400, "This reset link is invalid or has expired.");
  await prisma.$transaction([
    prisma.user.update({ where: { id: rec.userId }, data: { passwordHash: await hashPassword(password) } }),
    prisma.passwordResetToken.update({ where: { id: rec.id }, data: { usedAt: new Date() } }),
    prisma.session.updateMany({ where: { userId: rec.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
  ]);
  return ok({ ok: true });
});
