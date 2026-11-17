import { prisma } from "@/lib/db";
import { api, ok } from "@/lib/api";
import { HttpError, sha256 } from "@/lib/auth";
import { z } from "zod";

export const POST = api(async (req) => {
  const { token } = z.object({ token: z.string().min(10) }).parse(await req.json());
  const rec = await prisma.emailVerificationToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!rec || rec.usedAt || rec.expiresAt < new Date()) throw new HttpError(400, "This verification link is invalid or has expired.");
  await prisma.$transaction([
    prisma.user.update({ where: { id: rec.userId }, data: { emailVerifiedAt: new Date() } }),
    prisma.emailVerificationToken.update({ where: { id: rec.id }, data: { usedAt: new Date() } }),
  ]);
  return ok({ ok: true });
});
