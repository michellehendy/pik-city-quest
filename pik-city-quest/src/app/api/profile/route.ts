import { api, ok } from "@/lib/api";
import { HttpError, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { profileSchema } from "@/lib/validators";

export const PATCH = api(async (req) => {
  const user = await requireUser();
  const body = profileSchema.parse(await req.json());
  if (body.username && body.username !== user.username) {
    const taken = await prisma.user.findUnique({ where: { username: body.username } });
    if (taken) throw new HttpError(409, "That username is already taken.");
  }
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      name: body.name, username: body.username, instagram: body.instagram === undefined ? undefined : body.instagram || null,
      dateOfBirth: body.dateOfBirth === undefined ? undefined : body.dateOfBirth ? new Date(body.dateOfBirth) : null,
      publicProfile: body.publicProfile, language: body.language,
      notifPrefs: body.notifPrefs ? JSON.stringify(body.notifPrefs) : undefined, sharePrefs: body.sharePrefs ? JSON.stringify(body.sharePrefs) : undefined,
    },
    select: { id: true, name: true, username: true, instagram: true, publicProfile: true, language: true },
  });
  return ok({ user: updated });
});
