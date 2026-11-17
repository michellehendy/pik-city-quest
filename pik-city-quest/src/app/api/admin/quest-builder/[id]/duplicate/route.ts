import { api, ok } from "@/lib/api";
import { HttpError, requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/gamification";
export const POST = api(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requirePermission("quests.manage");
  const { id } = await ctx.params;
  const q = await prisma.quest.findUnique({ where: { id }, include: { checkpoints: { include: { missions: true }, orderBy: { order: "asc" } } } });
  if (!q) throw new HttpError(404, "Quest not found");
  const copy = await prisma.quest.create({ data: { name: `${q.name} (copy)`, slug: `${q.slug}-copy-${Date.now().toString(36)}`, tagline: q.tagline, description: q.description, coverImage: q.coverImage, type: q.type, difficulty: q.difficulty, durationMinutes: q.durationMinutes, status: "DRAFT", completionRule: q.completionRule, minCheckpoints: q.minCheckpoints, unlockConditions: q.unlockConditions, rules: q.rules, completionXp: q.completionXp, bonusXp: q.bonusXp, areas: q.areas, sortOrder: q.sortOrder + 1, createdById: user.id, checkpoints: { create: q.checkpoints.map((c) => ({ destinationId: c.destinationId, order: c.order, intro: c.intro, isStart: c.isStart, isEnd: c.isEnd, missions: { create: c.missions.map((m) => ({ missionId: m.missionId, order: m.order, isMandatory: m.isMandatory, xpOverride: m.xpOverride })) } })) } } });
  await audit(user.id, "DUPLICATE_QUEST", "Quest", copy.id, { from: id });
  return ok({ quest: copy });
});
