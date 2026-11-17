import { api, ok } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
export const GET = api(async () => {
  const user = await requirePermission("redemption.verify");
  const items = await prisma.rewardRedemption.findMany({ where: user.role === "PARTNER_ADMIN" ? { partnerId: user.partnerId ?? "__none__" } : {}, include: { redeemedBy: { select: { username: true } }, userReward: { include: { user: { select: { username: true } }, reward: { select: { name: true, partnerName: true } } } } }, orderBy: { createdAt: "desc" }, take: 200 });
  return ok({ items });
});
