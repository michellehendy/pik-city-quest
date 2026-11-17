import { z } from "zod";
import { api, ok } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { verifyRedemption } from "@/lib/gamification";
export const GET = api(async (req) => {
  const user = await requirePermission("redemption.verify");
  const code = new URL(req.url).searchParams.get("code")?.trim() ?? "";
  const ur = await prisma.userReward.findFirst({ where: { OR: [{ qrToken: code }, { voucherCode: code.toUpperCase() }] }, include: { reward: true, user: { select: { name: true, username: true } }, redemption: true } });
  if (!ur) return ok({ found: false });
  const scoped = user.role === "PARTNER_ADMIN" && ur.reward.partnerId && ur.reward.partnerId !== user.partnerId;
  return ok({ found: true, scoped, userReward: { id: ur.id, status: ur.status, voucherCode: ur.voucherCode, expiresAt: ur.expiresAt, redeemedAt: ur.redeemedAt, reward: { name: ur.reward.name, partnerName: ur.reward.partnerName, description: ur.reward.description, terms: ur.reward.terms, imageUrl: ur.reward.imageUrl }, user: ur.user } });
});
export const POST = api(async (req) => {
  const user = await requirePermission("redemption.verify");
  const { code, location } = z.object({ code: z.string().min(4), location: z.string().optional() }).parse(await req.json());
  const r = await verifyRedemption({ id: user.id, role: user.role, partnerId: user.partnerId }, code.trim(), location);
  return ok(r);
});
