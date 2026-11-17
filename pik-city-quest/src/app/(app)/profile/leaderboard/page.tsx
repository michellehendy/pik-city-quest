import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { leaderboard, userRank } from "@/lib/gamification";
import { TopBar } from "@/components/app/top-bar";
import { Avatar } from "@/components/ui";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<{ period?: string; quest?: string }> }) {
  const sp = await searchParams;
  const me = (await getCurrentUser())!;
  const period = (["all", "monthly", "weekly"].includes(sp.period ?? "") ? sp.period : "all") as "all" | "monthly" | "weekly";
  const [rows, quests, rank] = await Promise.all([leaderboard({ period, questId: sp.quest, limit: 50 }), prisma.quest.findMany({ where: { status: "PUBLISHED" }, select: { id: true, name: true, type: true }, orderBy: { sortOrder: "asc" } }), userRank(me.id)]);
  const tabs = [{ k: "all", l: "All-time" }, { k: "monthly", l: "Monthly" }, { k: "weekly", l: "Weekly" }];
  return (
    <div>
      <TopBar back="/profile" title="Leaderboard" />
      <div className="mx-auto max-w-lg lg:max-w-3xl px-4 space-y-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
          {tabs.map((t) => <Link key={t.k} href={`/profile/leaderboard?period=${t.k}`} className={cn("shrink-0 rounded-full px-3.5 py-2 text-xs font-bold border", period === t.k && !sp.quest ? "bg-teal-800 text-white border-teal-800" : "bg-white text-ink-soft border-teal-800/10")}>{t.l}</Link>)}
          {quests.map((q) => <Link key={q.id} href={`/profile/leaderboard?quest=${q.id}`} className={cn("shrink-0 rounded-full px-3.5 py-2 text-xs font-bold border", sp.quest === q.id ? "bg-sun-500 text-ink border-sun-500" : "bg-white text-ink-soft border-teal-800/10")}>{q.type === "SPECIAL" ? "★ " : ""}{q.name}</Link>)}
        </div>
        {rows.length >= 3 && (
          <div className="grid grid-cols-3 items-end gap-2 pt-4">
            {[rows[1], rows[0], rows[2]].map((r, i) => <div key={r.user.id} className={cn("card p-3 text-center", i === 1 && "-mt-4 border-2 border-sun-500")}><Avatar src={r.user.avatarUrl} name={r.user.name} size={i === 1 ? 64 : 48} className="mx-auto" ring={i === 1} /><div className="text-2xl mt-1">{i === 1 ? "🥇" : i === 0 ? "🥈" : "🥉"}</div><div className="text-xs font-extrabold text-ink truncate">@{r.user.username}</div><div className="text-[10px] text-ink-soft">{r.level.icon} {r.level.name}</div><div className="text-sm font-black text-teal-700">{r.xp} XP</div></div>)}
          </div>
        )}
        <div className="card divide-y divide-teal-800/5">
          {rows.map((r) => (
            <div key={r.user.id} className={cn("flex items-center gap-3 px-4 py-3", r.user.id === me.id && "bg-teal-50")}>
              <div className="w-7 text-center text-sm font-black text-ink-soft">{r.rank}</div>
              <Avatar src={r.user.avatarUrl} name={r.user.name} size={36} />
              <div className="flex-1 min-w-0"><div className="font-bold text-sm text-ink truncate">@{r.user.username}{r.user.id === me.id && " (you)"}</div><div className="text-[11px] text-ink-soft">{r.level.icon} {r.level.name} · {r.completedQuests} quest{r.completedQuests === 1 ? "" : "s"}</div></div>
              <div className="text-sm font-black text-teal-700">{r.xp} XP</div>
            </div>
          ))}
          {!rows.length && <div className="p-6 text-center text-sm text-ink-soft">No activity in this period yet — be the first!</div>}
        </div>
        <div className="text-center text-xs font-bold text-ink-soft">Your all-time rank: #{rank}</div>
      </div>
    </div>
  );
}
