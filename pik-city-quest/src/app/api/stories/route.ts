import { z } from "zod";
import { api, ok } from "@/lib/api";
import { requireUser, randomToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const POST = api(async (req) => {
  const user = await requireUser();
  const body = z.object({ title: z.string().trim().min(1).max(80), items: z.array(z.object({ type: z.string(), url: z.string(), caption: z.string().optional(), destination: z.string().optional() })).max(40), isPublic: z.boolean().optional() }).parse(await req.json());
  const story = await prisma.story.create({ data: { userId: user.id, title: body.title, items: JSON.stringify(body.items), isPublic: body.isPublic ?? false, shareCode: randomToken(8) } });
  return ok({ story });
});
export const DELETE = api(async (req) => {
  const user = await requireUser();
  const { id } = z.object({ id: z.string() }).parse(await req.json());
  await prisma.story.deleteMany({ where: { id, userId: user.id } });
  return ok({ ok: true });
});
