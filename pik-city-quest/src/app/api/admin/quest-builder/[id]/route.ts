import { api, ok } from "@/lib/api";
import { HttpError, requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { questPayload, saveQuest } from "@/lib/admin/quest-builder";
import { audit } from "@/lib/gamification";
import { questInclude } from "@/lib/queries";
import { parseJson } from "@/lib/utils";
type Ctx = { params: Promise<{ id: string }> };
export const GET = api(async (_req, ctx: Ctx) => {
  await requirePermission("quests.manage");
  const { id } = await ctx.params;
  const q = await prisma.quest.findUnique({ where: { id }, include: questInclude });
  if (!q) throw new HttpError(404, "Quest not found");
  return ok({ quest: { ...q, unlockConditions: parseJson(q.unlockConditions, {}), rewardIds: q.rewards.map((r) => r.id), badgeIds: q.badges.map((b) => b.id), checkpoints: q.checkpoints.map((c) => ({ id: c.id, destinationId: c.destinationId, intro: c.intro, missions: c.missions.map((m) => ({ missionId: m.missionId, isMandatory: m.isMandatory, xpOverride: m.xpOverride })) })) } });
});
export const PUT = api(async (req, ctx: Ctx) => {
  const user = await requirePermission("quests.manage");
  const { id } = await ctx.params;
  const p = questPayload.parse(await req.json());
  const quest = await saveQuest(id, p, user.id);
  await audit(user.id, "UPDATE_QUEST", "Quest", id, { name: quest!.name, status: quest!.status });
  return ok({ quest });
});
