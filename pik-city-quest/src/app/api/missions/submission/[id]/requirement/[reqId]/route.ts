import { z } from "zod";
import { api, ok, rateLimit } from "@/lib/api";
import { HttpError, requireUser } from "@/lib/auth";
import { submitRequirement } from "@/lib/engine";
import { geoSchema } from "@/lib/validators";

export const POST = api(async (req, ctx: { params: Promise<{ id: string; reqId: string }> }) => {
  const user = await requireUser();
  if (!rateLimit(`${user.id}:verify`, 60)) throw new HttpError(429, "Slow down a little and try again.");
  const { id, reqId } = await ctx.params;
  const body = z.object({ payload: z.record(z.string(), z.unknown()).default({}), geo: geoSchema, mediaUrl: z.string().nullable().optional() }).parse(await req.json());
  const result = await submitRequirement(user.id, id, reqId, body.payload, body.geo ?? null, body.mediaUrl ?? null);
  return ok(result);
});
