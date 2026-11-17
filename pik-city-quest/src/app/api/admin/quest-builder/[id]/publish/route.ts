import { z } from "zod";
import { api, ok } from "@/lib/api";
import { HttpError, requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit, notify } from "@/lib/gamification";
export const POST = api(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requirePermission("quests.manage");
  const { id } = await ctx.params;
  const { status } = z.object({ status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]) }).parse(await req.json());
  const q = await prisma.quest.findUnique({ where: { id }, include: { _count: { select: { checkpoints: true } } } });
  if (!q) throw new HttpError(404, "Quest not found");
  if (status === "PUBLISHED" && !q._count.checkpoints) throw new HttpError(400, "Add at least one checkpoint before publishing.");
  const wasPublished = q.status === "PUBLISHED";
  const quest = await prisma.quest.update({ where: { id }, data: { status, archivedAt: status === "ARCHIVED" ? new Date() : null } });
  await audit(user.id, `QUEST_${status}`, "Quest", id, { name: q.name });
  if (status === "PUBLISHED" && !wasPublished && q.type === "SPECIAL") {
    const users = await prisma.user.findMany({ where: { role: "VISITOR", isActive: true }, select: { id: true } });
    await prisma.notification.createMany({ data: users.map((u) => ({ userId: u.id, type: "SPECIAL_QUEST", title: "SPECIAL QUEST AVAILABLE!", body: `A new limited-time quest is waiting for you: ${q.name}.`, link: `/quests/${q.slug}` })) });
  }
  void notify;
  return ok({ quest });
});
