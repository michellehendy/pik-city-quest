import { z } from "zod";
import { api, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const POST = api(async (req) => {
  const user = await requireUser();
  const body = z.object({ ids: z.array(z.string()).optional(), all: z.boolean().optional() }).parse(await req.json().catch(() => ({})));
  await prisma.notification.updateMany({ where: { userId: user.id, ...(body.all ? {} : { id: { in: body.ids ?? [] } }) }, data: { isRead: true } });
  return ok({ ok: true });
});
