import { z } from "zod";
import { api, ok } from "@/lib/api";
import { HttpError, clearSessionCookie, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/gamification";

/** Account deletion: personal data is removed; historical quest completions are anonymised (audit requirement). */
export const POST = api(async (req) => {
  const user = await requireUser();
  const { confirm } = z.object({ confirm: z.string() }).parse(await req.json());
  if (confirm !== "DELETE") throw new HttpError(400, "Type DELETE to confirm.");
  await audit(user.id, "DELETE_ACCOUNT", "User", user.id, { email: user.email });
  await prisma.user.update({ where: { id: user.id }, data: { email: `deleted-${user.id}@deleted.local`, name: "Deleted explorer", username: `deleted_${user.id.slice(-8)}`, passwordHash: null, googleId: null, avatarUrl: null, instagram: null, dateOfBirth: null, isActive: false, publicProfile: false } });
  await prisma.session.updateMany({ where: { userId: user.id }, data: { revokedAt: new Date() } });
  await clearSessionCookie();
  return ok({ ok: true });
});
