import { z } from "zod";
import { api, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getOrCreateSubmission } from "@/lib/engine";

export const POST = api(async (req) => {
  const user = await requireUser();
  const body = z.object({ missionId: z.string(), checkpointId: z.string().nullable().optional(), runId: z.string().nullable().optional() }).parse(await req.json());
  const sub = await getOrCreateSubmission(user.id, body.missionId, { checkpointId: body.checkpointId ?? null, runId: body.runId ?? null });
  return ok({ submission: sub });
});
