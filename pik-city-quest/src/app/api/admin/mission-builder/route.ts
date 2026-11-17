import { api, ok } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { missionPayload, saveMission } from "@/lib/admin/quest-builder";
import { audit } from "@/lib/gamification";
export const POST = api(async (req) => {
  const user = await requirePermission("missions.manage");
  const m = await saveMission(null, missionPayload.parse(await req.json()));
  await audit(user.id, "CREATE_MISSION", "Mission", m!.id, { name: m!.name });
  return ok({ mission: m }, { status: 201 });
});
