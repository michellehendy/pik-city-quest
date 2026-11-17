import { api, ok } from "@/lib/api";
import { requirePermission, randomToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/gamification";
export const POST = api(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requirePermission("qr.manage");
  const { id } = await ctx.params;
  const qr = await prisma.qrCode.update({ where: { id }, data: { token: randomToken(18), rotatedAt: new Date() } });
  await audit(user.id, "ROTATE_QR", "QrCode", id);
  return ok({ qr });
});
