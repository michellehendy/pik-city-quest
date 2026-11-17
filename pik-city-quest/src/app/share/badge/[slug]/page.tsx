import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { RARITY_COLORS } from "@/lib/constants";
import { fmtDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
export default async function PublicBadge({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ u?: string }> }) {
  const { slug } = await params; const { u } = await searchParams;
  const b = await prisma.badge.findUnique({ where: { slug } });
  if (!b) notFound();
  const holder = u ? await prisma.user.findUnique({ where: { username: u }, include: { badges: { where: { badgeId: b.id } } } }) : null;
  const ub = holder?.badges[0];
  return (
    <main className="min-h-screen bg-gradient-to-br from-teal-900 to-teal-600 text-white flex items-center justify-center p-5">
      <div className="w-full max-w-sm rounded-3xl bg-white/10 border border-white/15 p-6 text-center">
        <div className="eyebrow !text-sun-400">PIK CITY QUEST · BADGE</div>
        <div className="mx-auto size-32 rounded-full flex items-center justify-center text-6xl border-[6px] mt-3" style={{ background: `radial-gradient(circle at 30% 30%, ${b.color}ee, ${b.color}99)`, borderColor: RARITY_COLORS[b.rarity] }}>{b.icon}</div>
        <h1 className="text-2xl font-black mt-3">{b.name}</h1><p className="text-sm text-white/85">{b.description}</p>
        {ub && holder?.publicProfile && <div className="text-xs text-sun-300 font-bold mt-2">Earned by {holder.name} on {fmtDate(ub.earnedAt)}</div>}
        <Link href="/register" className="btn btn-sun w-full mt-5">Start exploring PIK</Link>
      </div>
    </main>
  );
}
