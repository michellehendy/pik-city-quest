import { api, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { abandonQuest } from "@/lib/engine";

export const POST = api(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await ctx.params; // run id
  await abandonQuest(user.id, id);
  return ok({ ok: true });
});
