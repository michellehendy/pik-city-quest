import Image from "next/image";
import Link from "next/link";
import { Award, BookOpen, ChevronRight, Gift, HelpCircle, LogOut, Repeat, Settings, Trophy, Zap, AtSign, Mail, CalendarDays, Pencil } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getUserOverview } from "@/lib/queries";
import { TopBar } from "@/components/app/top-bar";
import { Avatar, Pill, Progress } from "@/components/ui";
import { BadgeGrid } from "./badge-grid";
import { LogoutButton } from "./logout-button";
import { fmtDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const me = (await getCurrentUser())!;
  const [ov, badges, owned] = await Promise.all([getUserOverview(me.id), prisma.badge.findMany({ where: { isActive: true }, orderBy: [{ category: "asc" }, { sortOrder: "asc" }] }), prisma.userBadge.findMany({ where: { userId: me.id } })]);
  const ownedMap = Object.fromEntries(owned.map((o) => [o.badgeId, o.earnedAt.toISOString()]));
  const sections = [
    { href: "/profile/rewards", icon: <Gift className="size-5" />, title: "My Rewards", sub: `${ov?.rewardCount ?? 0} rewards collected` },
    { href: "/profile/story", icon: <BookOpen className="size-5" />, title: "My Story", sub: "Your personal PIK travel journal" },
    { href: "/profile/leaderboard", icon: <Trophy className="size-5" />, title: "Leaderboard", sub: `You are ranked #${ov?.rank ?? "–"}` },
    { href: "/profile/exchange", icon: <Repeat className="size-5" />, title: "Exchange My Rewards", sub: `${me.pointsBalance} points · Tourist Exclusive` },
    { href: "/profile/settings", icon: <Settings className="size-5" />, title: "Settings", sub: "Profile, security, notifications, privacy" },
    { href: "/profile/faq", icon: <HelpCircle className="size-5" />, title: "Support & FAQ", sub: "How quests, missions and rewards work" },
  ];
  return (
    <div>
      <TopBar title="Profile" unread={ov?.unread} />
      <div className="mx-auto max-w-lg lg:max-w-5xl px-4 space-y-5 lg:grid lg:grid-cols-[1fr_1fr] lg:gap-6 lg:space-y-0">
        <div className="space-y-5">
          <section className="card overflow-hidden">
            <div className="relative h-28 bg-gradient-to-r from-teal-900 to-teal-600"><Image src="https://storage.googleapis.com/gcs-pik-prod/pik-prod/places/1740/image/pantjoran-pik-2-1787043281.webp" alt="" fill sizes="600px" className="object-cover opacity-40" /></div>
            <div className="px-4 pb-4 -mt-10">
              <div className="flex items-end justify-between"><Avatar src={me.avatarUrl} name={me.name} size={84} ring className="border-4 border-white" /><Link href="/profile/edit" className="btn btn-ghost min-h-9 px-3 text-xs"><Pencil className="size-3.5" />Edit profile</Link></div>
              <div className="mt-2"><div className="text-xl font-black text-ink">{me.name}</div><div className="text-sm font-semibold text-ink-soft">@{me.username}</div></div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-soft mt-2">
                <span className="inline-flex items-center gap-1"><Mail className="size-3" />{me.email}{me.emailVerifiedAt ? " ✓" : " (unverified)"}</span>
                {me.instagram && <a className="inline-flex items-center gap-1" href={`https://instagram.com/${me.instagram.replace("@", "")}`} target="_blank" rel="noreferrer"><AtSign className="size-3" />@{me.instagram.replace("@", "")}</a>}
                <span className="inline-flex items-center gap-1"><CalendarDays className="size-3" />Explorer since {fmtDate(me.createdAt)}</span>
              </div>
              <div className="mt-4 rounded-2xl p-3" style={{ background: `linear-gradient(135deg, ${ov?.level.current.color}22, ${ov?.level.current.color}08)` }}>
                <div className="flex items-center gap-3"><div className="size-12 rounded-full bg-white shadow-card flex items-center justify-center text-2xl">{ov?.level.current.icon}</div><div className="flex-1"><div className="eyebrow">Explorer level {ov?.level.current.order}</div><div className="font-black text-ink">{ov?.level.current.name}</div></div><Pill tone="sun"><Zap className="size-3" />{me.xpTotal} XP</Pill></div>
                <Progress value={ov?.level.progress ?? 0} className="mt-2" color="bg-gradient-to-r from-teal-600 to-sun-500" />
                <div className="flex justify-between text-[10px] font-semibold text-ink-soft mt-1"><span>{ov?.level.current.name}</span><span>{ov?.level.next ? `${ov.level.xpToNext} XP to ${ov.level.next.name}` : "Max level"}</span></div>
                <div className="flex gap-1 mt-2">{ov?.levels.map((l) => <div key={l.id} title={`${l.name} · ${l.minXp} XP`} className={`flex-1 rounded-full h-1.5 ${l.order <= (ov.level.current.order ?? 1) ? "bg-teal-700" : "bg-teal-800/15"}`} />)}</div>
              </div>
              <div className="grid grid-cols-4 gap-2 mt-3 text-center">
                {[["Quests", ov?.completedQuests], ["Missions", ov?.missions], ["Rewards", ov?.rewardCount], ["Badges", ov?.badgeCount]].map(([l, v]) => <div key={String(l)} className="rounded-xl bg-slate-50 p-2"><div className="text-lg font-black text-ink">{v}</div><div className="text-[10px] font-bold text-ink-soft uppercase">{l}</div></div>)}
              </div>
            </div>
          </section>
          <section className="card p-4">
            <div className="flex items-center justify-between mb-2"><div className="flex items-center gap-2 font-black text-ink"><Award className="size-5 text-sun-500" />Digital Badge Collection</div><Link href="/profile/badges" className="text-xs font-bold text-teal-700">See more</Link></div>
            <BadgeGrid badges={badges.map((b) => ({ id: b.id, slug: b.slug, name: b.name, icon: b.icon, color: b.color, rarity: b.rarity, category: b.category, description: b.description, earnedAt: ownedMap[b.id] ?? null }))} collapsible />
          </section>
        </div>
        <div className="space-y-5">
          <section className="card divide-y divide-teal-800/5">
            {sections.map((s) => <Link key={s.href} href={s.href} className="flex items-center gap-3 px-4 py-3.5 hover:bg-teal-50/60 first:rounded-t-[1.25rem] last:rounded-b-[1.25rem]"><div className="size-10 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center">{s.icon}</div><div className="flex-1 min-w-0"><div className="font-extrabold text-sm text-ink">{s.title}</div><div className="text-[11px] text-ink-soft truncate">{s.sub}</div></div><ChevronRight className="size-4 text-ink-soft" /></Link>)}
          </section>
          <LogoutButton><LogOut className="size-4" />Log out</LogoutButton>
        </div>
      </div>
    </div>
  );
}
