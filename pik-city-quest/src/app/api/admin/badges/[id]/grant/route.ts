import { z } from "zod";
import { api, ok } from "@/lib/api";
import { HttpError, requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit, grantBadge } from "@/lib/gamification";
export const POST = api(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const admin = await requirePermission("badges.manage");
  const { id } = await ctx.params;
  const { username } = z.object({ username: z.string() }).parse(await req.json());
  const user = await prisma.user.findUnique({ where: { username: username.replace("@", "").toLowerCase() } });
  if (!user) throw new HttpError(404, "User not found");
  await grantBadge(user.id, id, { manual: true, by: admin.id });
  await audit(admin.id, "GRANT_BADGE", "Badge", id, { userId: user.id });
  return ok({ ok: true });
});
