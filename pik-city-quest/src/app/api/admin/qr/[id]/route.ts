import { z } from "zod";
import { api, ok } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/gamification";
export const PATCH = api(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requirePermission("qr.manage");
  const { id } = await ctx.params;
  const body = z.object({ isActive: z.boolean().optional(), label: z.string().optional(), expiresAt: z.string().nullable().optional() }).parse(await req.json());
  const qr = await prisma.qrCode.update({ where: { id }, data: { isActive: body.isActive, label: body.label, expiresAt: body.expiresAt === undefined ? undefined : body.expiresAt ? new Date(body.expiresAt) : null } });
  await audit(user.id, "UPDATE_QR", "QrCode", id, body);
  return ok({ qr });
});
