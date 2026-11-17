import { z } from "zod";
import { api, ok } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { reviewSubmission } from "@/lib/engine";
export const POST = api(async (req) => {
  const user = await requirePermission("verification.review");
  const { ids, decision, reason } = z.object({ ids: z.array(z.string()).min(1).max(100), decision: z.enum(["APPROVE", "REJECT"]), reason: z.string().optional() }).parse(await req.json());
  const results: Array<{ id: string; ok: boolean; error?: string }> = [];
  for (const id of ids) { try { await reviewSubmission(user.id, id, decision, reason); results.push({ id, ok: true }); } catch (e) { results.push({ id, ok: false, error: (e as Error).message }); } }
  return ok({ results });
});
