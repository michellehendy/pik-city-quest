import { z } from "zod";
import { api, ok } from "@/lib/api";
import { HttpError, hashPassword, requireUser, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const POST = api(async (req) => {
  const user = await requireUser();
  const { current, next } = z.object({ current: z.string().optional(), next: z.string().min(8).max(100) }).parse(await req.json());
  const full = await prisma.user.findUnique({ where: { id: user.id } });
  if (full?.passwordHash && !(await verifyPassword(current ?? "", full.passwordHash))) throw new HttpError(400, "Current password is incorrect.");
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next) } });
  await prisma.session.updateMany({ where: { userId: user.id, revokedAt: null, id: { not: user.sessionId } }, data: { revokedAt: new Date() } });
  return ok({ ok: true });
});
