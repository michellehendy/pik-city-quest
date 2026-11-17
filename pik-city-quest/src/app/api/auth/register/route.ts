import { prisma } from "@/lib/db";
import { api, ok, rateLimit, clientKey } from "@/lib/api";
import { registerSchema } from "@/lib/validators";
import { HttpError, createSession, hashPassword, randomToken, requestMeta, setSessionCookie, sha256 } from "@/lib/auth";
import { slugify } from "@/lib/utils";
import { sendMail } from "@/lib/mail";
import { notify } from "@/lib/gamification";

export const POST = api(async (req) => {
  if (!rateLimit(clientKey(req, "register"), 10)) throw new HttpError(429, "Too many attempts. Try again in a minute.");
  const body = registerSchema.parse(await req.json());
  const exists = await prisma.user.findUnique({ where: { email: body.email } });
  if (exists) throw new HttpError(409, "An account with this email already exists.");
  let username = body.username || slugify(body.name).replace(/-/g, "_").slice(0, 18) || "explorer";
  for (let i = 0; await prisma.user.findUnique({ where: { username } }); i++) username = `${username.replace(/\d+$/, "")}${Math.floor(100 + Math.random() * 900)}`;
  const user = await prisma.user.create({
    data: { email: body.email, name: body.name, username, passwordHash: await hashPassword(body.password), instagram: body.instagram || null, dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : null },
  });
  const raw = randomToken(24);
  await prisma.emailVerificationToken.create({ data: { userId: user.id, tokenHash: sha256(raw), expiresAt: new Date(Date.now() + 3 * 86400000) } });
  const link = `${process.env.APP_URL || ""}/verify/${raw}`;
  const mail = await sendMail(user.email, "Verify your PIK CITY QUEST account", `Welcome to PIK CITY QUEST, ${user.name}!\n\nVerify your email: ${link}`);
  await notify(user.id, "SYSTEM", "WELCOME TO PIK CITY QUEST!", "You're ready to explore PIK. Choose your quest, complete fun missions, and collect experiences along the way.", "/quests");
  const meta = await requestMeta();
  const { jwt, expiresAt } = await createSession(user.id, meta);
  await setSessionCookie(jwt, expiresAt);
  return ok({ ok: true, userId: user.id, demoVerifyLink: mail.delivered ? undefined : link });
});
