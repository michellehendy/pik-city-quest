import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TopBar } from "@/components/app/top-bar";
import { StoryBuilder } from "./story-builder";
import { parseJson } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function StoryPage() {
  const me = (await getCurrentUser())!;
  const [subs, stories, badges, runs] = await Promise.all([
    prisma.missionSubmission.findMany({ where: { userId: me.id, status: "APPROVED" }, include: { requirements: true, mission: true, checkpoint: { include: { destination: true } } }, orderBy: { submittedAt: "asc" } }),
    prisma.story.findMany({ where: { userId: me.id }, orderBy: { createdAt: "desc" } }),
    prisma.userBadge.findMany({ where: { userId: me.id }, include: { badge: true }, orderBy: { earnedAt: "asc" } }),
    prisma.questRun.findMany({ where: { userId: me.id, status: "COMPLETED" }, include: { quest: true }, orderBy: { completedAt: "asc" } }),
  ]);
  const memories = [
    ...subs.flatMap((s) => s.requirements.filter((r) => r.mediaUrl).map((r) => ({ id: r.id, type: r.mediaUrl!.match(/\.(mp4|mov|webm)$/i) ? "video" : "photo", url: r.mediaUrl!, caption: s.mission.name, destination: s.checkpoint?.destination.name ?? "", date: (s.submittedAt ?? s.startedAt).toISOString() }))),
    ...subs.filter((s) => !s.requirements.some((r) => r.mediaUrl) && s.checkpoint?.destination.coverImage).map((s) => ({ id: `d${s.id}`, type: "stamp", url: s.checkpoint!.destination.coverImage!, caption: `${s.mission.name} ✓`, destination: s.checkpoint!.destination.name, date: (s.submittedAt ?? s.startedAt).toISOString() })),
    ...badges.map((b) => ({ id: `b${b.id}`, type: "badge", url: "", caption: `${b.badge.icon} ${b.badge.name}`, destination: "Badge", date: b.earnedAt.toISOString() })),
    ...runs.map((r) => ({ id: `q${r.id}`, type: "quest", url: r.quest.coverImage ?? "", caption: `🏆 ${r.quest.name} complete`, destination: `${r.xpEarned} XP`, date: (r.completedAt ?? r.startedAt).toISOString() })),
  ].sort((a, b) => a.date.localeCompare(b.date));
  return (
    <div>
      <TopBar back="/profile" title="My Story" />
      <div className="mx-auto max-w-lg lg:max-w-4xl px-4"><StoryBuilder memories={memories} userName={me.name} stories={stories.map((s) => ({ id: s.id, title: s.title, items: parseJson(s.items, []), createdAt: s.createdAt.toISOString() }))} /></div>
    </div>
  );
}
