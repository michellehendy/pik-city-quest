import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TopBar } from "@/components/app/top-bar";
import { ExchangeList } from "./exchange-list";

export const dynamic = "force-dynamic";

export default async function ExchangePage() {
  const me = (await getCurrentUser())!;
  const [rewards, tenants] = await Promise.all([
    prisma.reward.findMany({ where: { isActive: true, pointsCost: { not: null }, OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }] }, include: { partner: true, _count: { select: { userRewards: true } } }, orderBy: [{ issuance: "asc" }, { pointsCost: "asc" }] }),
    prisma.partner.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);
  return (
    <div>
      <TopBar back="/profile" title="Exchange My Rewards" />
      <div className="mx-auto max-w-lg lg:max-w-4xl px-4">
        <ExchangeList points={me.pointsBalance} tenants={tenants.map((t) => ({ id: t.id, name: t.name, logoUrl: t.logoUrl, description: t.description }))} rewards={rewards.map((r) => ({ id: r.id, name: r.name, partnerName: r.partnerName, partnerLogo: r.partner?.logoUrl ?? null, description: r.description, imageUrl: r.imageUrl, terms: r.terms, instructions: r.instructions, pointsCost: r.pointsCost!, expiresAt: r.expiresAt?.toISOString() ?? null, validDays: r.validDays, issuance: r.issuance, remaining: r.totalLimit != null ? Math.max(0, r.totalLimit - r._count.userRewards) : null, isSample: r.isSample }))} />
      </div>
    </div>
  );
}
