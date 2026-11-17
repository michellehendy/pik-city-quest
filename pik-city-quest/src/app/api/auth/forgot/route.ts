import { prisma } from "@/lib/db";
import { api, ok, rateLimit, clientKey } from "@/lib/api";
import { HttpError, randomToken, sha256 } from "@/lib/auth";
import { sendMail } from "@/lib/mail";
import { z } from "zod";

export const POST = api(async (req) => {
  if (!rateLimit(clientKey(req, "forgot"), 5)) throw new HttpError(429, "Too many attempts. Try again later.");
  const { email } = z.object({ email: z.string().trim().toLowerCase().email() }).parse(await req.json());
  const user = await prisma.user.findUnique({ where: { email } });
  let demoLink: string | undefined;
  if (user) {
    const raw = randomToken(24);
    await prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash: sha256(raw), expiresAt: new Date(Date.now() + 3600000) } });
    const link = `${process.env.APP_URL || ""}/reset-password/${raw}`;
    const mail = await sendMail(email, "Reset your PIK CITY QUEST password", `Reset your password (valid 1 hour): ${link}`);
    if (!mail.delivered && process.env.NODE_ENV !== "production") demoLink = link;
  }
  return ok({ ok: true, message: "If that email exists, a reset link has been sent.", demoLink });
});
