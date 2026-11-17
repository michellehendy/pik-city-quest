import Image from "next/image";
import { notFound } from "next/navigation";
import { Gift, Share2, Compass, Clock, Hash, Zap } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TopBar } from "@/components/app/top-bar";
import { Button } from "@/components/ui";
import { fmtDate, formatDuration } from "@/lib/utils";
import { Celebration } from "./celebration";

export const dynamic = "force-dynamic";

export default async function CompletePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const me = (await getCurrentUser())!;
  const quest = await prisma.quest.findUnique({ where: { slug }, include: { checkpoints: { include: { destination: true }, orderBy: { order: "asc" } }, badges: true } });
  if (!quest) notFound();
  const run = await prisma.questRun.findFirst({ where: { userId: me.id, questId: quest.id, status: "COMPLETED" }, orderBy: { completedAt: "desc" }, include: { checkpoints: { where: { status: "COMPLETED" }, include: { checkpoint: { include: { destination: true } } } } } });
  if (!run) notFound();
  const rewards = await prisma.userReward.findMany({ where: { userId: me.id, source: "QUEST_COMPLETION", sourceRefId: run.id }, include: { reward: true } });
  const badge = quest.badges[0] ?? null;
  const minutes = run.completedAt ? Math.round((run.completedAt.getTime() - run.startedAt.getTime()) / 60000) : 0;
  const stamps = run.checkpoints.map((c) => c.checkpoint.destination.name);
  const base = process.env.APP_URL || "";
  return (
    <div>
      <TopBar back={`/quests/${slug}`} title="Quest complete" />
      <Celebration />
      <div className="mx-auto max-w-lg lg:max-w-3xl px-4 space-y-5">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-900 via-teal-800 to-teal-600 text-white p-6 text-center shadow-float">
          {quest.coverImage && <Image src={quest.coverImage} alt="" fill sizes="100vw" className="object-cover opacity-20" />}
          <div className="relative">
            <div className="mx-auto size-28 rounded-full bg-white/15 border-4 border-sun-500 flex items-center justify-center text-6xl animate-pop shadow-float">{badge?.icon ?? "🏆"}</div>
            <h1 className="text-3xl font-black mt-4 tracking-tight">QUEST COMPLETE!</h1>
            <p className="text-sm text-white/90 mt-1">You explored all {run.checkpoints.length} destinations across PIK. Congratulations on completing your adventure!</p>
            <div className="font-extrabold text-lg mt-3">{quest.name}</div>
            <div className="grid grid-cols-2 gap-2 mt-4 text-left">
              {[["Completion date", fmtDate(run.completedAt, "d MMM yyyy, HH:mm")], ["Checkpoints", `${run.checkpoints.length} / ${quest.checkpoints.length}`], ["Total XP earned", `${run.xpEarned} XP`], ["Completion time", formatDuration(minutes)]].map(([l, v]) => <div key={l} className="rounded-xl bg-white/12 p-3"><div className="text-[10px] font-bold uppercase tracking-wide text-white/70">{l}</div><div className="font-black">{v}</div></div>)}
            </div>
            {badge && <div className="mt-3 text-xs font-bold text-sun-300">Digital completion badge: {badge.icon} {badge.name}</div>}
            <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-black"><Hash className="size-3" />{run.completionCode}</div>
          </div>
        </section>
        <section className="flex flex-wrap gap-1.5 justify-center">{stamps.map((s) => <span key={s} className="pill bg-white shadow-card text-teal-800 normal-case tracking-normal">✓ {s}</span>)}</section>
        <section className="card p-4 space-y-3">
          <div className="flex items-center gap-2 font-black text-ink"><Gift className="size-5 text-sun-500" />Your rewards</div>
          {rewards.length ? rewards.map((r) => <div key={r.id} className="flex items-center gap-3 rounded-xl bg-sun-100 p-3"><div className="relative size-12 rounded-lg overflow-hidden bg-white shrink-0">{r.reward.imageUrl && <Image src={r.reward.imageUrl} alt="" fill sizes="48px" className="object-cover" />}</div><div className="flex-1 min-w-0"><div className="font-bold text-sm text-ink truncate">{r.reward.name}</div><div className="text-[11px] text-ink-soft">{r.reward.partnerName} · valid until {fmtDate(r.expiresAt)}</div></div></div>)
            : <p className="text-sm text-ink-soft">No reward is attached to this quest yet. Keep collecting XP — points can be exchanged for Tourist Exclusive perks.</p>}
          <Button href={rewards[0] ? `/profile/rewards/${rewards[0].id}` : "/profile/exchange"} variant="sun" full size="lg">CLAIM YOUR REWARD</Button>
        </section>
        <section className="card p-4 space-y-3">
          <div className="flex items-center gap-2 font-black text-ink"><Share2 className="size-5 text-teal-700" />Share your achievement</div>
          <ShareBlock data={{ template: quest.type === "SPECIAL" ? "seasonal" : "quest", title: quest.name, subtitle: `${run.checkpoints.length} / ${quest.checkpoints.length} CHECKPOINTS`, userName: me.name, avatarUrl: me.avatarUrl, date: fmtDate(run.completedAt), stamps, xp: run.xpEarned, code: run.completionCode ?? "", shareUrl: `${base}/share/achievement/${run.completionCode}`, coverUrl: quest.coverImage, badgeEmoji: badge?.icon ?? "🏆" }} />
        </section>
        <Button href="/quests" variant="ghost" full><Compass className="size-4" />EXPLORE MORE QUESTS</Button>
        <div className="text-center text-[11px] text-ink-soft flex items-center justify-center gap-1"><Clock className="size-3" /><Zap className="size-3" />XP and rewards were issued once, after verification.</div>
      </div>
    </div>
  );
}
import { ShareCard, type ShareCardData } from "@/components/app/share-card";
function ShareBlock({ data }: { data: ShareCardData }) { return <ShareCard data={data} />; }
