import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { QuestBuilder } from "./builder";
import { parseJson } from "@/lib/utils";
export const dynamic = "force-dynamic";
export default async function QuestBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("quests.manage");
  const { id } = await params;
  const [destinations, missions, rewards, badges, quests] = await Promise.all([
    prisma.destination.findMany({ where: { isActive: true }, include: { area: true }, orderBy: [{ category: "asc" }, { name: "asc" }] }),
    prisma.mission.findMany({ where: { isActive: true }, include: { destination: { select: { id: true, name: true } }, requirements: { orderBy: { order: "asc" } } }, orderBy: { name: "asc" } }),
    prisma.reward.findMany({ where: { isActive: true }, select: { id: true, name: true, partnerName: true, questId: true } }),
    prisma.badge.findMany({ where: { isActive: true }, select: { id: true, name: true, icon: true, relatedQuestId: true } }),
    prisma.quest.findMany({ where: { archivedAt: null }, select: { id: true, name: true } }),
  ]);
  const quest = id === "new" ? null : await prisma.quest.findUnique({ where: { id }, include: { checkpoints: { orderBy: { order: "asc" }, include: { missions: { orderBy: { order: "asc" } } } }, rewards: true, badges: true } });
  const initial = quest ? { id: quest.id, name: quest.name, slug: quest.slug, tagline: quest.tagline ?? "", description: quest.description, coverImage: quest.coverImage ?? "", type: quest.type, difficulty: quest.difficulty, durationMinutes: quest.durationMinutes, completionRule: quest.completionRule, minCheckpoints: quest.minCheckpoints, unlockConditions: parseJson<Record<string, unknown>>(quest.unlockConditions, {}), rules: quest.rules ?? "", completionXp: quest.completionXp, bonusXp: quest.bonusXp, startsAt: quest.startsAt ? new Date(quest.startsAt.getTime() - quest.startsAt.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "", endsAt: quest.endsAt ? new Date(quest.endsAt.getTime() - quest.endsAt.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "", isFeatured: quest.isFeatured, sortOrder: quest.sortOrder, status: quest.status, rewardIds: quest.rewards.map((r) => r.id), badgeIds: quest.badges.map((b) => b.id), checkpoints: quest.checkpoints.map((c) => ({ id: c.id, destinationId: c.destinationId, intro: c.intro ?? "", missions: c.missions.map((m) => ({ missionId: m.missionId, isMandatory: m.isMandatory, xpOverride: m.xpOverride })) })) } : null;
  return <QuestBuilder initial={initial} destinations={destinations.map((d) => ({ id: d.id, name: d.name, area: d.area.name, category: d.category, image: d.coverImage }))} missions={missions.map((m) => ({ id: m.id, name: m.name, type: m.type, xp: m.xp, verification: m.verification, destinationId: m.destinationId, destinationName: m.destination?.name ?? null, steps: m.requirements.map((r) => r.type) }))} rewards={rewards} badges={badges} quests={quests} />;
}
