import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Flame, MapPin, Trophy, Zap } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { TopBar } from "@/components/app/top-bar";
import { Avatar, Button, Difficulty, Pill, Progress, SectionHeader } from "@/components/ui";
import { QuestCard } from "@/components/app/quest-card";
import { currentMissionFor, getActiveRuns, getDestinationsByArea, getUserOverview, listQuests, todaysChallenges } from "@/lib/queries";
import { leaderboard } from "@/lib/gamification";
import { formatDuration } from "@/lib/utils";
import { MISSION_TYPE_META } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const me = (await getCurrentUser())!;
  const [ov, runs, quests, areas, top, challenges] = await Promise.all([getUserOverview(me.id), getActiveRuns(me.id), listQuests(me.id), getDestinationsByArea(), leaderboard({ period: "all", limit: 3 }), todaysChallenges(me.id)]);
  const run = runs[0];
  const cur = run ? currentMissionFor(run) : null;
  const firstName = me.name.split(" ")[0];

  return (
    <div>
      <TopBar unread={ov?.unread} user={me} title="" />
      <div className="mx-auto max-w-lg lg:max-w-5xl px-4 space-y-7">
        {/* Greeting */}
        <section className="flex items-center gap-4 pt-2">
          <Link href="/profile"><Avatar src={me.avatarUrl} name={me.name} size={56} ring /></Link>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-ink-soft">Hey, {firstName}! Ready for another adventure?</div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-lg font-black text-ink truncate">{ov?.level.current.icon} {ov?.level.current.name}</span>
              <Pill tone="sun"><Zap className="size-3" />{me.xpTotal} XP</Pill>
            </div>
            <Progress value={ov?.level.progress ?? 0} className="mt-1.5" color="bg-gradient-to-r from-teal-600 to-sun-500" />
            <div className="text-[10px] font-semibold text-ink-soft mt-1">{ov?.level.next ? `${ov.level.xpToNext} XP to ${ov.level.next.name}` : "Max level reached"} {me.streakDays > 1 && <span className="ml-2 text-coral">🔥 {me.streakDays}-day streak</span>}</div>
          </div>
        </section>

        {/* Current quest */}
        {run && cur ? (
          <section className="card overflow-hidden">
            <div className="relative h-40">
              {run.quest.coverImage && <Image src={run.quest.coverImage} alt={run.quest.name} fill sizes="90vw" className="object-cover" />}
              <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/30 to-transparent" />
              <div className="absolute top-3 left-3"><Pill tone="sun">Current quest</Pill></div>
              <div className="absolute bottom-3 left-4 right-4 text-white">
                <div className="font-black text-xl leading-tight">{run.quest.name}</div>
                <div className="text-xs text-white/85 line-clamp-1">{run.quest.tagline ?? run.quest.description}</div>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <div className="flex justify-between text-[11px] font-bold text-ink-soft mb-1"><span>{cur.completed} / {run.quest.checkpoints.length} checkpoints</span><span>{run.xpEarned || xpSoFar(run)} XP earned · ~{formatDuration(Math.max(15, Math.round(run.quest.durationMinutes * (1 - cur.completed / run.quest.checkpoints.length))))} left</span></div>
                <Progress value={cur.completed / run.quest.checkpoints.length} />
              </div>
              {cur.checkpoint && (
                <div className="rounded-2xl bg-teal-50 border border-teal-200 p-3.5">
                  <div className="eyebrow mb-1">Current mission</div>
                  <div className="flex items-start gap-3">
                    <div className="relative size-14 rounded-xl overflow-hidden shrink-0">{cur.checkpoint.destination.coverImage && <Image src={cur.checkpoint.destination.coverImage} alt="" fill sizes="56px" className="object-cover" />}</div>
                    <div className="min-w-0 flex-1">
                      <div className="font-extrabold text-ink leading-tight">{cur.mission?.name ?? "Checkpoint complete"}</div>
                      <div className="text-xs text-ink-soft flex items-center gap-1 mt-0.5"><MapPin className="size-3" />{cur.checkpoint.destination.name} · {cur.checkpoint.destination.area.name}</div>
                      {cur.mission && <div className="text-[11px] mt-1 text-ink-soft line-clamp-2">{cur.mission.instructions}</div>}
                      <div className="flex gap-1.5 mt-1.5 flex-wrap">{cur.mission && <Pill tone="teal">{MISSION_TYPE_META[cur.mission.type]?.label}</Pill>}{cur.mission && <Pill tone="sun">+{cur.checkpointMission?.xpOverride ?? cur.mission.xp} XP</Pill>}{cur.submission && <Pill tone={cur.submission.status === "REJECTED" ? "red" : "gray"}>{cur.submission.status.replace("_", " ")}</Pill>}</div>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <Button href={cur.checkpoint && cur.mission ? `/quests/${run.quest.slug}/mission/${cur.checkpoint.id}/${cur.mission.id}` : `/quests/${run.quest.slug}`} full>Continue quest <ArrowRight className="size-4" /></Button>
                {cur.checkpoint && <Button href={`/map?focus=${cur.checkpoint.destination.slug}`} variant="ghost" aria-label="Navigate"><MapPin className="size-4" /></Button>}
              </div>
            </div>
          </section>
        ) : (
          <section className="card p-5 relative overflow-hidden">
            <div className="absolute -right-10 -top-10 size-40 rounded-full bg-sun-100" />
            <div className="relative">
              <div className="eyebrow">Ready for an adventure?</div>
              <h2 className="text-xl font-black text-ink mt-1">Explore available quests and start your journey around PIK.</h2>
              <Button href="/quests" variant="sun" className="mt-4">EXPLORE QUESTS <ArrowRight className="size-4" /></Button>
            </div>
          </section>
        )}

        {/* Today's missions */}
        <section>
          <SectionHeader eyebrow="Today" title="Today's Missions" action="See quests" href="/quests" />
          <div className="snap-row no-scrollbar -mx-4 px-4">
            {challenges.map((c) => {
              const done = c.users.some((u) => u.status === "COMPLETED");
              const href = c.mission ? `/missions/${c.mission.id}` : c.destination ? `/destinations/${c.destination.slug}` : "/quests";
              return (
                <Link key={c.id} href={href} className="card w-[230px] p-3.5 flex flex-col gap-2">
                  <div className="flex items-center justify-between"><Pill tone={c.cadence === "DAILY" ? "teal" : c.cadence === "WEEKLY" ? "purple" : c.cadence === "LIMITED" ? "sun" : "blue"}>{c.cadence}</Pill><Pill tone={done ? "green" : "gray"}>{done ? "Done" : "Open"}</Pill></div>
                  <div className="font-extrabold text-sm leading-snug text-ink">{c.title}</div>
                  <div className="text-[11px] text-ink-soft flex items-center gap-1 min-h-4"><MapPin className="size-3" />{c.destination?.name ?? "Anywhere in PIK"}</div>
                  <div className="flex items-center justify-between mt-auto"><Difficulty level={c.difficulty} /><span className="text-xs font-black text-teal-700">+{c.xp} XP</span></div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Explore PIK */}
        <section>
          <SectionHeader eyebrow="Explore PIK" title="Destinations by area" action="Open map" href="/map" />
          <div className="space-y-5">
            {areas.map((a) => (
              <div key={a.id}>
                <div className="flex items-center gap-2 mb-2 px-1"><span className="size-2.5 rounded-full" style={{ background: a.color }} /><span className="text-sm font-extrabold text-ink">{a.name}</span><span className="text-[11px] text-ink-soft">{a.destinations.length} places</span></div>
                <div className="snap-row no-scrollbar -mx-4 px-4">
                  {a.destinations.filter((d) => d.category === "Main Destinations").concat(a.destinations.filter((d) => d.category !== "Main Destinations")).slice(0, 10).map((d) => (
                    <div key={d.id} className="card w-[210px] overflow-hidden">
                      <Link href={`/destinations/${d.slug}`} className="block relative h-28">{d.coverImage && <Image src={d.coverImage} alt={d.name} fill sizes="210px" className="object-cover" />}<div className="absolute top-2 left-2"><Pill tone="white">{d.category}</Pill></div></Link>
                      <div className="p-3">
                        <Link href={`/destinations/${d.slug}`} className="font-extrabold text-sm leading-tight text-ink line-clamp-1">{d.name}</Link>
                        <p className="text-[11px] text-ink-soft line-clamp-2 mt-0.5 min-h-8">{d.description}</p>
                        <div className="flex items-center justify-between mt-2 text-[10px] font-bold text-ink-soft"><span>{a.name} · {d.checkpoints.length ? `${new Set(d.checkpoints.map((c) => c.questId)).size} quest${new Set(d.checkpoints.map((c) => c.questId)).size > 1 ? "s" : ""}` : `${d.missions.length} missions`}</span>
                          {d.websiteUrl && <a href={d.websiteUrl} target="_blank" rel="noreferrer" className="text-teal-700">Website ↗</a>}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Popular quests */}
        <section>
          <SectionHeader eyebrow="Popular" title="Popular Quests" action="View all" href="/quests" />
          <div className="snap-row no-scrollbar -mx-4 px-4">
            {quests.filter((q) => q.userStatus !== "ENDED").sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured) || b._count.runs - a._count.runs).slice(0, 6).map((q) => <QuestCard key={q.id} q={q} compact />)}
          </div>
        </section>

        {/* Leaderboard preview */}
        <section>
          <SectionHeader eyebrow="Leaderboard" title="Top explorers" action="View all leaderboard" href="/profile/leaderboard" />
          <div className="card divide-y divide-teal-800/5">
            {top.map((r) => (
              <div key={r.user.id} className="flex items-center gap-3 px-4 py-3">
                <div className={`size-7 rounded-full flex items-center justify-center text-xs font-black ${r.rank === 1 ? "bg-sun-500 text-ink" : r.rank === 2 ? "bg-slate-200 text-ink" : "bg-amber-200 text-ink"}`}>{r.rank}</div>
                <Avatar src={r.user.avatarUrl} name={r.user.name} size={36} />
                <div className="flex-1 min-w-0"><div className="font-bold text-sm text-ink truncate">@{r.user.username}</div><div className="text-[11px] text-ink-soft">{r.level.icon} {r.level.name}</div></div>
                <div className="text-sm font-black text-teal-700">{r.xp} XP</div>
              </div>
            ))}
            <div className="flex items-center gap-3 px-4 py-3 bg-teal-50/60 rounded-b-[1.25rem]">
              <div className="size-7 rounded-full bg-teal-800 text-white flex items-center justify-center text-xs font-black">{ov?.rank ?? "–"}</div>
              <Avatar src={me.avatarUrl} name={me.name} size={36} />
              <div className="flex-1 min-w-0"><div className="font-bold text-sm text-ink truncate">You · @{me.username}</div><div className="text-[11px] text-ink-soft">{ov?.level.current.icon} {ov?.level.current.name}</div></div>
              <div className="text-sm font-black text-teal-700">{me.xpTotal} XP</div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-3 gap-2 pb-2">
          <Link href="/profile/badges" className="card p-3 text-center"><Trophy className="mx-auto size-5 text-sun-500" /><div className="text-lg font-black">{ov?.badgeCount}</div><div className="text-[10px] font-bold text-ink-soft">BADGES</div></Link>
          <Link href="/profile/rewards" className="card p-3 text-center"><Flame className="mx-auto size-5 text-coral" /><div className="text-lg font-black">{ov?.rewardCount}</div><div className="text-[10px] font-bold text-ink-soft">REWARDS</div></Link>
          <Link href="/quests?status=COMPLETED" className="card p-3 text-center"><MapPin className="mx-auto size-5 text-teal-700" /><div className="text-lg font-black">{ov?.completedQuests}</div><div className="text-[10px] font-bold text-ink-soft">QUESTS DONE</div></Link>
        </section>
      </div>
    </div>
  );
}

function xpSoFar(run: Awaited<ReturnType<typeof getActiveRuns>>[number]) {
  return run.submissions.reduce((s, x) => s + x.xpAwarded, 0) + run.checkpoints.filter((c) => c.status === "COMPLETED").length * 25;
}
