import { z } from "zod";
import { api, ok } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { reviewSubmission } from "@/lib/engine";
export const POST = api(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requirePermission("verification.review");
  const { id } = await ctx.params;
  const { decision, reason } = z.object({ decision: z.enum(["APPROVE", "REJECT"]), reason: z.string().optional() }).parse(await req.json());
  const sub = await reviewSubmission(user.id, id, decision, reason);
  return ok({ submission: sub });
});
