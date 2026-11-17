import { api, ok } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { questPayload, saveQuest } from "@/lib/admin/quest-builder";
import { audit } from "@/lib/gamification";
export const POST = api(async (req) => {
  const user = await requirePermission("quests.manage");
  const p = questPayload.parse(await req.json());
  const quest = await saveQuest(null, p, user.id);
  await audit(user.id, "CREATE_QUEST", "Quest", quest!.id, { name: quest!.name });
  return ok({ quest }, { status: 201 });
});
