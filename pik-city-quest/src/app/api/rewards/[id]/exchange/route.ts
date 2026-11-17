import { api, ok } from "@/lib/api";
import { HttpError, requireUser } from "@/lib/auth";
import { redeemWithPoints } from "@/lib/gamification";

export const POST = api(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  try { const ur = await redeemWithPoints(user.id, id); return ok({ userReward: ur }); }
  catch (e) { throw new HttpError(400, (e as Error).message); }
});
