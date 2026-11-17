import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TopBar } from "@/components/app/top-bar";
import { Pill } from "@/components/ui";
import { ShareCard } from "@/components/app/share-card";
import { RARITY_COLORS } from "@/lib/constants";
import { fmtDate, parseJson } from "@/lib/utils";

export const dynamic = "force-dynamic";

function requirementText(c: Record<string, unknown>, rel: { dest?: string | null; quest?: string | null }) {
  switch (c.type) {
    case "DESTINATION_VISIT": return `Complete any mission at ${rel.dest ?? "the destination"}.`;
    case "AREA_VISITS": return `Complete missions at ${c.count} different destinations in ${String(c.areaSlug).replace("-", " ")}.`;
    case "CATEGORY_VISITS": return `Complete missions at ${c.count} ${c.category} destinations.`;
    case "TAG_VISITS": return `Complete missions at ${c.count} ${c.tag} destinations.`;
    case "MISSION_COUNT": return `Complete ${c.count} missions in total.`;
    case "MISSION_APPROVED": return `Complete the mission "${c.missionName}".`;
    case "QUEST_COMPLETE": return `Complete the quest ${rel.quest ?? c.questSlug}.`;
    case "WEEKEND_MISSIONS": return `Complete ${c.count} missions on a weekend.`;
    case "SUNSET_MISSIONS": return `Complete ${c.count} missions during golden hour (4–7 PM) at waterfront destinations.`;
    case "LEVEL": return `Reach explorer level ${c.order}.`;
    default: return "Awarded by the PIK Tourism team.";
  }
}

export default async function BadgeDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const me = (await getCurrentUser())!;
  const b = await prisma.badge.findUnique({ where: { slug }, include: { relatedDestination: true, relatedQuest: true, relatedEvent: true } });
  if (!b) notFound();
  const ub = await prisma.userBadge.findUnique({ where: { userId_badgeId: { userId: me.id, badgeId: b.id } } });
  const holders = await prisma.userBadge.count({ where: { badgeId: b.id } });
  const c = parseJson<Record<string, unknown>>(b.criteria, {});
  const base = process.env.APP_URL || "";
  return (
    <div>
      <TopBar back="/profile/badges" title={b.name} />
      <div className="mx-auto max-w-lg lg:max-w-3xl px-4 space-y-4">
        <section className="card p-6 text-center">
          <div className="mx-auto size-36 rounded-full flex items-center justify-center text-7xl border-[6px] animate-pop" style={{ background: ub ? `radial-gradient(circle at 30% 30%, ${b.color}ee, ${b.color}99)` : "#eef2f4", borderColor: ub ? RARITY_COLORS[b.rarity] : "#e2e8f0", filter: ub ? undefined : "grayscale(1)", boxShadow: ub ? `0 20px 40px -14px ${b.color}` : undefined }}>{b.icon}</div>
          <div className="mt-3 flex justify-center gap-1.5"><Pill tone="gray">{b.category}</Pill><span className="pill text-white" style={{ background: RARITY_COLORS[b.rarity] }}>{b.rarity}</span></div>
          <h1 className="text-2xl font-black text-ink mt-2">{b.name}</h1>
          <p className="text-sm text-ink-soft mt-1">{b.description}</p>
          <div className="mt-3 text-xs font-bold">{ub ? <span className="text-emerald-700">✓ Earned {fmtDate(ub.earnedAt, "d MMM yyyy, HH:mm")}</span> : <span className="text-ink-soft">🔒 Not yet unlocked</span>}</div>
          <div className="mt-4 rounded-xl bg-slate-50 p-3 text-left text-sm"><div className="eyebrow">How to unlock</div><div className="text-ink mt-0.5">{requirementText(c, { dest: b.relatedDestination?.name, quest: b.relatedQuest?.name })}</div><div className="text-[11px] text-ink-soft mt-1">+{b.xpBonus} XP bonus · {holders} explorer{holders === 1 ? "" : "s"} have this badge</div></div>
          <div className="flex flex-wrap justify-center gap-2 mt-3 text-xs font-bold">
            {b.relatedDestination && <Link href={`/destinations/${b.relatedDestination.slug}`} className="btn btn-ghost min-h-9 px-3 text-xs">📍 {b.relatedDestination.name}</Link>}
            {b.relatedQuest && <Link href={`/quests/${b.relatedQuest.slug}`} className="btn btn-ghost min-h-9 px-3 text-xs">🧭 {b.relatedQuest.name}</Link>}
            {b.relatedEvent && <a href={b.relatedEvent.url ?? "#"} target="_blank" rel="noreferrer" className="btn btn-ghost min-h-9 px-3 text-xs">🎉 {b.relatedEvent.title}</a>}
          </div>
        </section>
        {ub && <section className="card p-4"><div className="font-black text-ink mb-3">Share this badge</div><ShareCard data={{ template: "badge", title: b.name, subtitle: b.description.toUpperCase().slice(0, 48), userName: me.name, date: fmtDate(ub.earnedAt), stamps: [], xp: b.xpBonus, code: b.slug.toUpperCase().slice(0, 12), shareUrl: `${base}/share/badge/${b.slug}?u=${me.username}`, coverUrl: b.imageUrl ?? b.relatedDestination?.coverImage ?? b.relatedQuest?.coverImage ?? null, badgeEmoji: b.icon }} /></section>}
      </div>
    </div>
  );
}
