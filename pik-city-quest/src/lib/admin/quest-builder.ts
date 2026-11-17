import { z } from "zod";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/utils";

export const questPayload = z.object({
  name: z.string().min(2), slug: z.string().optional().nullable(), tagline: z.string().optional().nullable(), description: z.string().min(2), coverImage: z.string().optional().nullable(),
  type: z.enum(["SPECIAL", "REGULAR"]), difficulty: z.enum(["EASY", "MEDIUM", "HARD", "EXPERT"]), durationMinutes: z.coerce.number().int().min(10),
  completionRule: z.enum(["SEQUENTIAL", "OPEN", "MINIMUM", "CUSTOM"]), minCheckpoints: z.coerce.number().int().nullable().optional(),
  unlockConditions: z.object({ requiresQuestId: z.string().nullable().optional(), requiresBadgeId: z.string().nullable().optional(), requiresLevel: z.coerce.number().nullable().optional() }).default({}),
  rules: z.string().optional().nullable(), completionXp: z.coerce.number().int().min(0), bonusXp: z.coerce.number().int().min(0).default(0),
  startsAt: z.string().nullable().optional(), endsAt: z.string().nullable().optional(), isFeatured: z.boolean().default(false), sortOrder: z.coerce.number().int().default(0), status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  rewardIds: z.array(z.string()).default([]), badgeIds: z.array(z.string()).default([]),
  checkpoints: z.array(z.object({ id: z.string().optional().nullable(), destinationId: z.string(), intro: z.string().optional().nullable(), missions: z.array(z.object({ missionId: z.string(), isMandatory: z.boolean().default(true), xpOverride: z.coerce.number().int().nullable().optional() })) })).min(1),
});
export type QuestPayload = z.infer<typeof questPayload>;

export async function saveQuest(id: string | null, p: QuestPayload, actorId: string) {
  const areaSlugs = Array.from(new Set((await prisma.destination.findMany({ where: { id: { in: p.checkpoints.map((c) => c.destinationId) } }, include: { area: true } })).map((d) => d.area.slug)));
  const base = {
    name: p.name, slug: p.slug || slugify(p.name), tagline: p.tagline ?? null, description: p.description, coverImage: p.coverImage ?? null, type: p.type, difficulty: p.difficulty, durationMinutes: p.durationMinutes,
    completionRule: p.completionRule, minCheckpoints: p.completionRule === "MINIMUM" ? p.minCheckpoints ?? p.checkpoints.length : null, unlockConditions: JSON.stringify(Object.fromEntries(Object.entries(p.unlockConditions).filter(([, v]) => v))),
    rules: p.rules ?? null, completionXp: p.completionXp, bonusXp: p.bonusXp, startsAt: p.startsAt ? new Date(p.startsAt) : null, endsAt: p.endsAt ? new Date(p.endsAt) : null, isFeatured: p.isFeatured, sortOrder: p.sortOrder, status: p.status, areas: JSON.stringify(areaSlugs),
  };
  const quest = id ? await prisma.quest.update({ where: { id }, data: base }) : await prisma.quest.create({ data: { ...base, createdById: actorId } });
  // Sync checkpoints: keep ids that still exist (preserves visitor progress), remove dropped, create new.
  const existing = await prisma.questCheckpoint.findMany({ where: { questId: quest.id } });
  const keep = new Set(p.checkpoints.map((c) => c.id).filter(Boolean) as string[]);
  const toDelete = existing.filter((e) => !keep.has(e.id)).map((e) => e.id);
  if (toDelete.length) await prisma.questCheckpoint.deleteMany({ where: { id: { in: toDelete } } });
  // two-phase order update to avoid unique(questId, order) collisions
  for (const [i, cp] of p.checkpoints.entries()) if (cp.id && existing.find((e) => e.id === cp.id)) await prisma.questCheckpoint.update({ where: { id: cp.id }, data: { order: 1000 + i } });
  for (const [i, cp] of p.checkpoints.entries()) {
    const data = { destinationId: cp.destinationId, order: i, intro: cp.intro ?? null, isStart: i === 0, isEnd: i === p.checkpoints.length - 1 };
    let cpId = cp.id && existing.find((e) => e.id === cp.id) ? cp.id : null;
    if (cpId) await prisma.questCheckpoint.update({ where: { id: cpId }, data });
    else cpId = (await prisma.questCheckpoint.create({ data: { ...data, questId: quest.id } })).id;
    await prisma.checkpointMission.deleteMany({ where: { checkpointId: cpId, missionId: { notIn: cp.missions.map((m) => m.missionId) } } });
    for (const [j, m] of cp.missions.entries()) await prisma.checkpointMission.upsert({ where: { checkpointId_missionId: { checkpointId: cpId, missionId: m.missionId } }, update: { order: j, isMandatory: m.isMandatory, xpOverride: m.xpOverride ?? null }, create: { checkpointId: cpId, missionId: m.missionId, order: j, isMandatory: m.isMandatory, xpOverride: m.xpOverride ?? null } });
  }
  await prisma.reward.updateMany({ where: { questId: quest.id, id: { notIn: p.rewardIds } }, data: { questId: null } });
  if (p.rewardIds.length) await prisma.reward.updateMany({ where: { id: { in: p.rewardIds } }, data: { questId: quest.id, issuance: "QUEST_COMPLETION" } });
  await prisma.badge.updateMany({ where: { relatedQuestId: quest.id, id: { notIn: p.badgeIds } }, data: { relatedQuestId: null } });
  if (p.badgeIds.length) for (const bid of p.badgeIds) { const b = await prisma.badge.findUnique({ where: { id: bid } }); const c = b ? JSON.parse(b.criteria || "{}") : {}; await prisma.badge.update({ where: { id: bid }, data: { relatedQuestId: quest.id, criteria: JSON.stringify({ ...c, type: c.type === "MANUAL" || !c.type ? "QUEST_COMPLETE" : c.type, questId: c.type && c.type !== "MANUAL" && c.type !== "QUEST_COMPLETE" ? c.questId : quest.id }) } }); }
  return prisma.quest.findUnique({ where: { id: quest.id } });
}

export const missionPayload = z.object({
  name: z.string().min(2), description: z.string().min(2), instructions: z.string().min(2), type: z.string(), destinationId: z.string().nullable().optional(), difficulty: z.string().default("EASY"), xp: z.coerce.number().int().min(0),
  verification: z.enum(["AUTO", "MANUAL"]), stepsOrdered: z.boolean().default(true), maxAttempts: z.coerce.number().int().nullable().optional(), timeLimitSec: z.coerce.number().int().nullable().optional(), isActive: z.boolean().default(true), isReusable: z.boolean().default(true),
  requirements: z.array(z.object({ id: z.string().optional().nullable(), type: z.string(), label: z.string().nullable().optional(), isMandatory: z.boolean().default(true), config: z.record(z.string(), z.unknown()).default({}) })).min(1),
});
export type MissionPayload = z.infer<typeof missionPayload>;
export async function saveMission(id: string | null, p: MissionPayload) {
  const manual = p.requirements.some((r) => ["PHOTO", "VIDEO", "SOCIAL", "FIND_OBJECT"].includes(r.type));
  const base = { name: p.name, description: p.description, instructions: p.instructions, type: p.requirements.length > 1 ? "MULTI" : p.requirements[0].type, destinationId: p.destinationId || null, difficulty: p.difficulty, xp: p.xp, verification: manual ? "MANUAL" : p.verification, stepsOrdered: p.stepsOrdered, maxAttempts: p.maxAttempts ?? null, timeLimitSec: p.timeLimitSec ?? null, isActive: p.isActive, isReusable: p.isReusable };
  const m = id ? await prisma.mission.update({ where: { id }, data: base }) : await prisma.mission.create({ data: base });
  const existing = await prisma.missionRequirement.findMany({ where: { missionId: m.id } });
  const keep = new Set(p.requirements.map((r) => r.id).filter(Boolean) as string[]);
  await prisma.missionRequirement.deleteMany({ where: { missionId: m.id, id: { notIn: Array.from(keep) } } });
  for (const [i, r] of p.requirements.entries()) {
    const data = { order: i, type: r.type, label: r.label ?? null, isMandatory: r.isMandatory, config: JSON.stringify(r.config ?? {}) };
    if (r.id && existing.find((e) => e.id === r.id)) await prisma.missionRequirement.update({ where: { id: r.id }, data });
    else await prisma.missionRequirement.create({ data: { ...data, missionId: m.id } });
  }
  return prisma.mission.findUnique({ where: { id: m.id }, include: { requirements: { orderBy: { order: "asc" } } } });
}
