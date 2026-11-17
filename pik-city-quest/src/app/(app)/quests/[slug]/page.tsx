import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CalendarDays, CheckCircle2, Clock, Flag, Gift, Lock, MapPin, Navigation, Play, Zap } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getQuestBySlug, questTotals } from "@/lib/queries";
import { questStatusForUser, unlockConditionCheck } from "@/lib/engine";
import { TopBar } from "@/components/app/top-bar";
import { Button, Difficulty, Pill, Progress } from "@/components/ui";
import { RouteMap } from "@/components/app/route-map";
import { StartQuestButton } from "./start-button";
import { fmtDate, formatDuration, parseJson } from "@/lib/utils";
import { MISSION_TYPE_META } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function QuestDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const me = (await getCurrentUser())!;
  const quest = await getQuestBySlug(slug);
  if (!quest || (quest.status !== "PUBLISHED" && !["SUPER_ADMIN", "QUEST_MANAGER"].includes(me.role))) notFound();
  const [userStatus, run, unread] = await Promise.all([
    questStatusForUser(me.id, quest),
    prisma.questRun.findFirst({ where: { userId: me.id, questId: quest.id, status: { in: ["ACTIVE", "COMPLETED"] } }, orderBy: { startedAt: "desc" }, include: { checkpoints: true, submissions: true } }),
    prisma.notification.count({ where: { userId: me.id, isRead: false } }),
  ]);
  const lockReasons = userStatus === "LOCKED" ? await unlockConditionCheck(me.id, parseJson(quest.unlockConditions, {})) : [];
  const totals = questTotals(quest);
  const progressOf = (cpId: string) => run?.checkpoints.find((c) => c.checkpointId === cpId)?.status ?? (quest.completionRule === "SEQUENTIAL" ? "LOCKED" : "AVAILABLE");
  const completed = run?.checkpoints.filter((c) => c.status === "COMPLETED").length ?? 0;
  const needed = quest.completionRule === "MINIMUM" ? Math.min(quest.checkpoints.length, quest.minCheckpoints ?? quest.checkpoints.length) : quest.checkpoints.length;
  const stops = quest.checkpoints.map((cp) => ({ lat: cp.destination.lat, lng: cp.destination.lng, name: cp.destination.name, order: cp.order, isEnd: cp.isEnd, status: run ? progressOf(cp.id) : undefined }));
  const currentCp = run?.status === "ACTIVE" ? quest.checkpoints.find((cp) => ["AVAILABLE", "IN_PROGRESS", "SUBMITTED"].includes(progressOf(cp.id))) : null;
  const currentMission = currentCp?.missions.find((m) => run!.submissions.find((s) => s.checkpointId === currentCp.id && s.missionId === m.missionId)?.status !== "APPROVED");
  const ruleLabel = { SEQUENTIAL: "Complete checkpoints in order", OPEN: "Open route — any order", MINIMUM: `Complete ${needed} of ${quest.checkpoints.length} checkpoints`, CUSTOM: "Custom rules" }[quest.completionRule] ?? quest.completionRule;

  return (
    <div>
      <TopBar back="/quests" title={quest.name} unread={unread} />
      <div className="mx-auto max-w-lg lg:max-w-5xl px-4 space-y-5 lg:grid lg:grid-cols-[1fr_380px] lg:gap-6 lg:space-y-0">
        <div className="space-y-5">
          <section className="relative h-64 rounded-3xl overflow-hidden shadow-float">
            {quest.coverImage && <Image src={quest.coverImage} alt={quest.name} fill priority sizes="(min-width:1024px) 60vw, 100vw" className="object-cover" />}
            <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/20 to-transparent" />
            <div className="absolute top-3 left-3 flex gap-1.5"><Pill tone={quest.type === "SPECIAL" ? "sun" : "white"}>{quest.type === "SPECIAL" ? "★ Special quest" : "Regular quest"}</Pill><Pill tone="white">{userStatus}</Pill></div>
            <div className="absolute bottom-4 left-4 right-4 text-white">
              <h1 className="text-2xl font-black leading-tight">{quest.name}</h1>
              {quest.tagline && <p className="text-sm text-white/85">{quest.tagline}</p>}
            </div>
          </section>
          <section className="grid grid-cols-4 gap-2 text-center">
            {[{ l: "Difficulty", v: <Difficulty level={quest.difficulty} /> }, { l: "Duration", v: <b>{formatDuration(quest.durationMinutes)}</b> }, { l: "Checkpoints", v: <b>{quest.checkpoints.length}</b> }, { l: "Total XP", v: <b className="text-teal-700">{totals.totalXp}</b> }].map((s) => <div key={s.l} className="card p-2.5"><div className="text-sm">{s.v}</div><div className="text-[10px] font-bold text-ink-soft uppercase mt-1">{s.l}</div></div>)}
          </section>
          <section className="card p-4 space-y-3">
            <p className="text-sm text-ink-soft leading-relaxed">{quest.description}</p>
            <div className="flex flex-wrap gap-2 text-[11px] font-bold text-ink-soft">
              <span className="inline-flex items-center gap-1"><Flag className="size-3.5 text-teal-700" />{ruleLabel}</span>
              {(quest.startsAt || quest.endsAt) && <span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5 text-teal-700" />{quest.startsAt ? fmtDate(quest.startsAt) : "Now"} – {quest.endsAt ? fmtDate(quest.endsAt) : "ongoing"}</span>}
              <span className="inline-flex items-center gap-1"><MapPin className="size-3.5 text-teal-700" />Start: {quest.checkpoints[0]?.destination.name}</span>
              <span className="inline-flex items-center gap-1"><Flag className="size-3.5 text-coral" />End: {quest.checkpoints.at(-1)?.destination.name}</span>
            </div>
            {!!quest.rewards.length && <div className="rounded-xl bg-sun-100 p-3 flex items-center gap-2 text-sm font-bold text-sun-600"><Gift className="size-4" />Rewards: {quest.rewards.map((r) => r.name).join(", ")}</div>}
            {!!quest.badges.length && <div className="text-xs font-bold text-ink-soft">Completion badge: {quest.badges.map((b) => `${b.icon} ${b.name}`).join(", ")}</div>}
          </section>
          {run && (
            <section className="card p-4">
              <div className="flex justify-between text-xs font-bold text-ink-soft mb-1"><span>Your progress</span><span>{completed}/{quest.checkpoints.length} checkpoints · {run.status === "COMPLETED" ? run.xpEarned : run.submissions.reduce((s, x) => s + x.xpAwarded, 0) + completed * 25} XP</span></div>
              <Progress value={completed / quest.checkpoints.length} color="bg-gradient-to-r from-teal-600 to-sun-500" height="h-3" />
              {run.status === "COMPLETED" && <Button href={`/quests/${quest.slug}/complete`} className="mt-3" full variant="sun">🎉 View your completion & rewards</Button>}
            </section>
          )}
          <section>
            <div className="section-title mb-2 px-1">Route map</div>
            <RouteMap stops={stops} height={260} />
          </section>
          <section>
            <div className="section-title mb-3 px-1">Checkpoint route</div>
            <ol className="relative space-y-3">
              <div className="absolute left-[21px] top-6 bottom-6 w-0.5 bg-teal-800/15" />
              <li className="flex items-center gap-3 relative"><span className="size-11 rounded-full bg-sun-500 text-ink flex items-center justify-center font-black text-xs shadow-card">START</span><span className="text-xs font-bold text-ink-soft">Begin at {quest.checkpoints[0]?.destination.name}</span></li>
              {quest.checkpoints.map((cp) => {
                const st = run ? progressOf(cp.id) : "PREVIEW";
                const isCurrent = currentCp?.id === cp.id;
                return (
                  <li key={cp.id} className={cn("card relative overflow-hidden", isCurrent && "ring-2 ring-sun-500", cp.isEnd && "border-2 border-coral/40")}>
                    <div className="flex gap-3 p-3">
                      <div className="relative shrink-0"><div className={cn("size-11 rounded-full flex items-center justify-center font-black text-sm border-4 border-white shadow-card", st === "COMPLETED" ? "bg-emerald-500 text-white" : st === "LOCKED" ? "bg-slate-200 text-slate-500" : st === "SUBMITTED" ? "bg-sun-500 text-ink" : "bg-teal-800 text-white")}>{st === "COMPLETED" ? <CheckCircle2 className="size-5" /> : st === "LOCKED" ? <Lock className="size-4" /> : cp.isEnd ? "🏁" : cp.order + 1}</div></div>
                      <div className="relative size-16 rounded-xl overflow-hidden shrink-0">{cp.destination.coverImage && <Image src={cp.destination.coverImage} alt={cp.destination.name} fill sizes="64px" className="object-cover" />}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap"><Link href={`/destinations/${cp.destination.slug}`} className="font-extrabold text-ink leading-tight">{cp.destination.name}</Link>{cp.isEnd && <Pill tone="red">Final destination</Pill>}{st !== "PREVIEW" && <Pill tone={st === "COMPLETED" ? "green" : st === "LOCKED" ? "gray" : st === "SUBMITTED" ? "sun" : "teal"}>{st.replace("_", " ")}</Pill>}</div>
                        <div className="text-[11px] text-ink-soft">{cp.destination.area.name} · {cp.missions.length} mission{cp.missions.length === 1 ? "" : "s"} · {cp.missions.reduce((s, m) => s + (m.xpOverride ?? m.mission.xp), 0)} XP</div>
                        <p className="text-xs text-ink-soft line-clamp-2 mt-1">{cp.intro ?? cp.destination.description}</p>
                      </div>
                    </div>
                    <div className="px-3 pb-3 space-y-1.5">
                      {cp.missions.map((m) => {
                        const sub = run?.submissions.find((s) => s.checkpointId === cp.id && s.missionId === m.missionId);
                        const playable = run?.status === "ACTIVE" && st !== "LOCKED" && sub?.status !== "APPROVED";
                        const row = (
                          <div className={cn("flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs", playable ? "bg-teal-50 hover:bg-teal-100" : "bg-slate-50")}>
                            <span className={cn("size-6 rounded-full flex items-center justify-center text-[10px] font-black", sub?.status === "APPROVED" ? "bg-emerald-500 text-white" : "bg-white text-teal-800")}>{sub?.status === "APPROVED" ? "✓" : m.order + 1}</span>
                            <div className="flex-1 min-w-0"><div className="font-bold text-ink truncate">{m.mission.name}</div><div className="text-[10px] text-ink-soft">{MISSION_TYPE_META[m.mission.type]?.label}{!m.isMandatory && " · optional"} · {m.mission.verification === "AUTO" ? "auto-verified" : "reviewed by PIK team"}</div></div>
                            <span className="font-black text-teal-700">+{m.xpOverride ?? m.mission.xp}</span>
                            {sub && sub.status !== "APPROVED" && <Pill tone={sub.status === "REJECTED" ? "red" : sub.status === "SUBMITTED" ? "sun" : "gray"}>{sub.status.replace("_", " ")}</Pill>}
                            {playable && <Play className="size-4 text-teal-800" />}
                          </div>
                        );
                        return playable ? <Link key={m.id} href={`/quests/${quest.slug}/mission/${cp.id}/${m.missionId}`}>{row}</Link> : <div key={m.id}>{row}</div>;
                      })}
                      <div className="flex gap-2 pt-1"><a className="btn btn-ghost min-h-8 px-3 text-[11px]" href={`https://www.google.com/maps/dir/?api=1&destination=${cp.destination.lat},${cp.destination.lng}`} target="_blank" rel="noreferrer"><Navigation className="size-3.5" />Navigate</a><Link className="btn btn-ghost min-h-8 px-3 text-[11px]" href={`/map?focus=${cp.destination.slug}`}><MapPin className="size-3.5" />Map</Link></div>
                    </div>
                  </li>
                );
              })}
              <li className="flex items-center gap-3 relative"><span className="size-11 rounded-full bg-coral text-white flex items-center justify-center font-black text-[10px] shadow-card">FINISH</span><span className="text-xs font-bold text-ink-soft">Complete {needed} checkpoint{needed > 1 ? "s" : ""} to finish · +{quest.completionXp}{quest.bonusXp ? ` (+${quest.bonusXp} bonus)` : ""} XP</span></li>
            </ol>
          </section>
        </div>

        {/* CTA (sticky on mobile) */}
        <aside className="fixed inset-x-0 bottom-[calc(var(--nav-h)+var(--safe-bottom))] z-40 px-4 pb-2 lg:static lg:p-0">
          <div className="mx-auto max-w-lg card p-3 lg:p-4 lg:sticky lg:top-20 space-y-2">
            {userStatus === "AVAILABLE" && <StartQuestButton questId={quest.id} rules={quest.rules} name={quest.name} />}
            {userStatus === "ONGOING" && currentCp && currentMission && (
              <>
                <div className="hidden lg:block"><div className="eyebrow">Current mission</div><div className="font-extrabold">{currentMission.mission.name}</div><div className="text-xs text-ink-soft">{currentCp.destination.name} · +{currentMission.xpOverride ?? currentMission.mission.xp} XP</div></div>
                <Button href={`/quests/${quest.slug}/mission/${currentCp.id}/${currentMission.missionId}`} full size="lg">Continue: {currentMission.mission.name} <ArrowRight className="size-4" /></Button>
              </>
            )}
            {userStatus === "ONGOING" && (!currentCp || !currentMission) && <Button href="/quests" full variant="ghost">Waiting for verification · Explore other quests</Button>}
            {userStatus === "COMPLETED" && <Button href={`/quests/${quest.slug}/complete`} full size="lg" variant="sun">View achievement</Button>}
            {userStatus === "UPCOMING" && <div className="text-center text-sm font-bold text-ink-soft py-2"><Clock className="inline size-4 mr-1" />Starts {fmtDate(quest.startsAt)}</div>}
            {userStatus === "ENDED" && <div className="text-center text-sm font-bold text-ink-soft py-2">This quest ended {fmtDate(quest.endsAt)}</div>}
            {userStatus === "LOCKED" && <div className="text-center text-sm font-bold text-ink-soft py-2"><Lock className="inline size-4 mr-1" />{lockReasons.join(" ")}</div>}
            <div className="hidden lg:flex items-center justify-center gap-1 text-[11px] text-ink-soft"><Zap className="size-3 text-sun-500" />{totals.missions} missions · {totals.totalXp} XP available</div>
          </div>
        </aside>
      </div>
      <div className="h-20 lg:hidden" />
    </div>
  );
}
