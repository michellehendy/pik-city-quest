import { api, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { currentMissionFor, getActiveRuns } from "@/lib/queries";

export const GET = api(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const runs = await getActiveRuns(user.id);
  const run = runs.find((r) => r.questId === id);
  if (!run) {
    const done = await prisma.questRun.findFirst({ where: { userId: user.id, questId: id, status: "COMPLETED" }, orderBy: { completedAt: "desc" } });
    return ok({ status: done ? "COMPLETED" : "NONE", completionCode: done?.completionCode ?? null });
  }
  const cur = currentMissionFor(run);
  return ok({ status: "ACTIVE", runId: run.id, completed: cur.completed, total: run.quest.checkpoints.length, next: cur.checkpoint && cur.mission ? { checkpointId: cur.checkpoint.id, missionId: cur.mission.id, destination: cur.checkpoint.destination.name, mission: cur.mission.name } : null });
});
