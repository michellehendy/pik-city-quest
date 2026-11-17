import { api, ok } from "@/lib/api";
import { HttpError, requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { missionPayload, saveMission } from "@/lib/admin/quest-builder";
import { audit } from "@/lib/gamification";
import { parseJson } from "@/lib/utils";
type Ctx = { params: Promise<{ id: string }> };
export const GET = api(async (_req, ctx: Ctx) => {
  await requirePermission("missions.manage");
  const { id } = await ctx.params;
  const m = await prisma.mission.findUnique({ where: { id }, include: { requirements: { orderBy: { order: "asc" } }, destination: true } });
  if (!m) throw new HttpError(404, "Mission not found");
  return ok({ mission: { ...m, requirements: m.requirements.map((r) => ({ ...r, config: parseJson(r.config, {}) })) } });
});
export const PUT = api(async (req, ctx: Ctx) => {
  const user = await requirePermission("missions.manage");
  const { id } = await ctx.params;
  const m = await saveMission(id, missionPayload.parse(await req.json()));
  await audit(user.id, "UPDATE_MISSION", "Mission", id, { name: m!.name });
  return ok({ mission: m });
});
