import { prisma } from "./db";
import { questStatusForUser, type QuestUserStatus } from "./engine";
import { getLevels, levelForXp, userRank } from "./gamification";
import { parseJson } from "./utils";

export const questInclude = {
  checkpoints: { orderBy: { order: "asc" as const }, include: { destination: { include: { area: true } }, missions: { orderBy: { order: "asc" as const }, include: { mission: { include: { requirements: { orderBy: { order: "asc" as const } } } } } } } },
  rewards: { where: { isActive: true } },
  badges: true,
  _count: { select: { runs: true } },
};

export function questTotals(q: { checkpoints: Array<{ missions: Array<{ isMandatory: boolean; xpOverride: number | null; mission: { xp: number } }> }>; completionXp: number; bonusXp: number }) {
  const missionXp = q.checkpoints.reduce((s, c) => s + c.missions.reduce((t, m) => t + (m.xpOverride ?? m.mission.xp), 0), 0);
  return { missionXp, totalXp: missionXp + q.completionXp + q.bonusXp + q.checkpoints.length * 25, checkpoints: q.checkpoints.length, missions: q.checkpoints.reduce((s, c) => s + c.missions.length, 0) };
}

export async function listQuests(userId: string | null, opts?: { includeDrafts?: boolean }) {
  const quests = await prisma.quest.findMany({ where: opts?.includeDrafts ? { archivedAt: null } : { status: "PUBLISHED", archivedAt: null }, include: questInclude, orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }] });
  const out = [] as Array<(typeof quests)[number] & { userStatus: QuestUserStatus; totals: ReturnType<typeof questTotals>; areaSlugs: string[] }>;
  for (const q of quests) out.push({ ...q, userStatus: await questStatusForUser(userId, q), totals: questTotals(q), areaSlugs: parseJson<string[]>(q.areas, []) });
  return out;
}

export async function getQuestBySlug(slug: string) {
  return prisma.quest.findUnique({ where: { slug }, include: questInclude });
}

export async function getActiveRuns(userId: string) {
  return prisma.questRun.findMany({ where: { userId, status: "ACTIVE" }, include: { quest: { include: questInclude }, checkpoints: true, submissions: { include: { requirements: true } } }, orderBy: { startedAt: "desc" } });
}

export type RunView = Awaited<ReturnType<typeof getActiveRuns>>[number];

/** Derives the "current mission" for an active run: first non-completed available checkpoint & its first unfinished mandatory mission. */
export function currentMissionFor(run: RunView) {
  const order = run.quest.checkpoints;
  const progressOf = (cpId: string) => run.checkpoints.find((c) => c.checkpointId === cpId);
  const completed = run.checkpoints.filter((c) => c.status === "COMPLETED").length;
  const needed = run.quest.completionRule === "MINIMUM" ? Math.min(order.length, run.quest.minCheckpoints ?? order.length) : order.length;
  for (const cp of order) {
    const p = progressOf(cp.id);
    if (!p || p.status === "LOCKED" || p.status === "COMPLETED") continue;
    const nextMission = cp.missions.find((m) => {
      const sub = run.submissions.find((s) => s.checkpointId === cp.id && s.missionId === m.missionId);
      return !sub || sub.status !== "APPROVED";
    });
    return { checkpoint: cp, progress: p, mission: nextMission?.mission ?? null, checkpointMission: nextMission ?? null, submission: nextMission ? run.submissions.find((s) => s.checkpointId === cp.id && s.missionId === nextMission.missionId) ?? null : null, completed, needed };
  }
  return { checkpoint: null, progress: null, mission: null, checkpointMission: null, submission: null, completed, needed };
}

export async function getUserOverview(userId: string) {
  const [user, levels, rank, counts, badgeCount, rewardCount, unread] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    getLevels(),
    userRank(userId),
    prisma.questRun.groupBy({ by: ["status"], where: { userId }, _count: true }),
    prisma.userBadge.count({ where: { userId } }),
    prisma.userReward.count({ where: { userId } }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);
  if (!user) return null;
  const missions = await prisma.missionSubmission.count({ where: { userId, status: "APPROVED" } });
  const level = levelForXp(levels, user.xpTotal);
  return { user, level, levels, rank, completedQuests: counts.find((c) => c.status === "COMPLETED")?._count ?? 0, activeQuests: counts.find((c) => c.status === "ACTIVE")?._count ?? 0, missions, badgeCount, rewardCount, unread };
}

export async function getDestinationsByArea() {
  const areas = await prisma.area.findMany({ orderBy: { sortOrder: "asc" }, include: { destinations: { where: { isActive: true }, orderBy: [{ category: "asc" }, { name: "asc" }], include: { checkpoints: { where: { quest: { status: "PUBLISHED", archivedAt: null } }, select: { questId: true } }, missions: { where: { isActive: true }, select: { id: true } } } } } });
  return areas;
}

export async function todaysChallenges(userId: string) {
  const now = new Date();
  const challenges = await prisma.challenge.findMany({ where: { isActive: true, OR: [{ startsAt: null }, { startsAt: { lte: now } }], AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }] }, include: { destination: true, mission: true, users: { where: { userId } } }, orderBy: { cadence: "asc" } });
  return challenges;
}
