import { api, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { retrySubmission } from "@/lib/engine";

export const POST = api(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const sub = await retrySubmission(user.id, id);
  return ok({ submission: sub });
});
