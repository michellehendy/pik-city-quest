import { api, ok } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLevels, levelForXp } from "@/lib/gamification";

/** Dashboard + analytics data. All figures are computed from recorded activity. */
export const GET = api(async (req) => {
  const user = await requirePermission("analytics.view");
  const url = new URL(req.url);
  const days = Math.min(365, Math.max(1, Number(url.searchParams.get("days") ?? 30)));
  const questId = url.searchParams.get("quest") || undefined;
  const areaSlug = url.searchParams.get("area") || undefined;
  const destinationId = url.searchParams.get("destination") || undefined;
  const missionType = url.searchParams.get("missionType") || undefined;
  const segment = url.searchParams.get("segment") || undefined; // new | returning
  const since = new Date(Date.now() - days * 86400000);
  const partnerId = user.role === "PARTNER_ADMIN" ? user.partnerId : null;

  const subWhere = { submittedAt: { gte: since }, ...(questId ? { questRun: { questId } } : {}), ...(destinationId ? { checkpoint: { destinationId } } : {}), ...(areaSlug ? { checkpoint: { destination: { area: { slug: areaSlug } } } } : {}), ...(missionType ? { mission: { type: missionType } } : {}), ...(partnerId ? { checkpoint: { destination: { partnerId } } } : {}) };
  const runWhere = { startedAt: { gte: since }, ...(questId ? { questId } : {}) };

  const [totalUsers, newUsers, dau, mau, activeQuests, runs, completedRuns, subs, pending, redemptions, issued, expired, users, levels, qrScans, gpsCheckins, allSubs] = await Promise.all([
    prisma.user.count({ where: { role: "VISITOR" } }),
    prisma.user.count({ where: { role: "VISITOR", createdAt: { gte: since } } }),
    prisma.user.count({ where: { role: "VISITOR", xpTransactions: { some: { createdAt: { gte: new Date(Date.now() - 86400000) } } } } }),
    prisma.user.count({ where: { role: "VISITOR", xpTransactions: { some: { createdAt: { gte: new Date(Date.now() - 30 * 86400000) } } } } }),
    prisma.quest.count({ where: { status: "PUBLISHED", archivedAt: null } }),
    prisma.questRun.findMany({ where: runWhere, select: { id: true, status: true, startedAt: true, completedAt: true, questId: true, userId: true, quest: { select: { name: true } } } }),
    prisma.questRun.count({ where: { ...runWhere, status: "COMPLETED" } }),
    prisma.missionSubmission.findMany({ where: subWhere, select: { id: true, status: true, submittedAt: true, reviewedAt: true, startedAt: true, missionId: true, userId: true, mission: { select: { name: true, type: true, verification: true } }, checkpoint: { select: { destinationId: true, order: true, destination: { select: { name: true } } } } } }),
    prisma.missionSubmission.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } }),
    prisma.rewardRedemption.findMany({ where: { createdAt: { gte: since }, ...(partnerId ? { partnerId } : {}) }, include: { userReward: { include: { reward: { select: { name: true, partnerName: true } } } } } }),
    prisma.userReward.count({ where: { issuedAt: { gte: since }, ...(partnerId ? { reward: { partnerId } } : {}) } }),
    prisma.userReward.count({ where: { status: "EXPIRED", ...(partnerId ? { reward: { partnerId } } : {}) } }),
    prisma.user.findMany({ where: { role: "VISITOR" }, select: { xpTotal: true, createdAt: true } }),
    getLevels(),
    prisma.qrScan.groupBy({ by: ["success"], where: { createdAt: { gte: since } }, _count: true }),
    prisma.requirementSubmission.count({ where: { status: "APPROVED", requirement: { type: "GPS" }, verifiedAt: { gte: since } } }),
    prisma.xpTransaction.aggregate({ where: { createdAt: { gte: since }, amount: { gt: 0 } }, _sum: { amount: true } }),
  ]);

  // Time series (daily)
  const dayKey = (d: Date) => d.toISOString().slice(0, 10);
  const series: Record<string, { date: string; registrations: number; questStarts: number; questCompletions: number; missions: number }> = {};
  for (let i = days - 1; i >= 0; i--) { const d = new Date(Date.now() - i * 86400000); series[dayKey(d)] = { date: dayKey(d), registrations: 0, questStarts: 0, questCompletions: 0, missions: 0 }; }
  for (const u of users) if (u.createdAt >= since && series[dayKey(u.createdAt)]) series[dayKey(u.createdAt)].registrations++;
  for (const r of runs) { if (series[dayKey(r.startedAt)]) series[dayKey(r.startedAt)].questStarts++; if (r.completedAt && series[dayKey(r.completedAt)]) series[dayKey(r.completedAt)].questCompletions++; }
  for (const s of subs) if (s.status === "APPROVED" && s.submittedAt && series[dayKey(s.submittedAt)]) series[dayKey(s.submittedAt)].missions++;

  // Segment filter (new vs returning) applied to mission subs
  const userFirstRun: Record<string, Date> = {};
  for (const r of runs) if (!userFirstRun[r.userId] || r.startedAt < userFirstRun[r.userId]) userFirstRun[r.userId] = r.startedAt;
  const segSubs = segment ? subs.filter((s) => { const first = userFirstRun[s.userId]; return segment === "new" ? !first || first >= since : first && first < since; }) : subs;

  const approved = segSubs.filter((s) => s.status === "APPROVED");
  const rejected = segSubs.filter((s) => s.status === "REJECTED");
  const byMission: Record<string, { name: string; type: string; approved: number; rejected: number; attempts: number; avgMinutes: number[] }> = {};
  for (const s of segSubs) { const b = (byMission[s.missionId] ??= { name: s.mission.name, type: s.mission.type, approved: 0, rejected: 0, attempts: 0, avgMinutes: [] }); b.attempts++; if (s.status === "APPROVED") { b.approved++; if (s.reviewedAt) b.avgMinutes.push((s.reviewedAt.getTime() - s.startedAt.getTime()) / 60000); } if (s.status === "REJECTED") b.rejected++; }
  const byDest: Record<string, { name: string; visits: number; completions: number }> = {};
  for (const s of approved) if (s.checkpoint) { const b = (byDest[s.checkpoint.destinationId] ??= { name: s.checkpoint.destination.name, visits: 0, completions: 0 }); b.visits++; b.completions++; }
  const byType: Record<string, number> = {};
  for (const s of approved) byType[s.mission.type] = (byType[s.mission.type] ?? 0) + 1;

  // Funnel: registered → started → completed mission 1 → mission 2 → full quest
  const started = new Set(runs.map((r) => r.userId));
  const cpOrders = (n: number) => new Set(approved.filter((s) => s.checkpoint && s.checkpoint.order === n).map((s) => s.userId));
  const funnel = [
    { label: "Registered users", value: totalUsers },
    { label: "Started a quest", value: started.size },
    { label: "Completed checkpoint 1", value: cpOrders(0).size },
    { label: "Completed checkpoint 2", value: cpOrders(1).size },
    { label: "Completed full quest", value: new Set(runs.filter((r) => r.status === "COMPLETED").map((r) => r.userId)).size },
  ];
  // Checkpoint drop-off per quest
  const dropoff: Record<string, { quest: string; steps: number[] }> = {};
  const allRunsIds = new Set(runs.map((r) => r.id));
  const cps = await prisma.checkpointProgress.findMany({ where: { questRunId: { in: Array.from(allRunsIds) } }, select: { questRunId: true, status: true, checkpoint: { select: { order: true, questId: true } } } });
  for (const r of runs) dropoff[r.questId] ??= { quest: r.quest.name, steps: [] };
  for (const c of cps) { const d = dropoff[c.checkpoint.questId]; if (!d) continue; d.steps[c.checkpoint.order] = (d.steps[c.checkpoint.order] ?? 0) + (c.status === "COMPLETED" ? 1 : 0); }

  const completionTimes = runs.filter((r) => r.completedAt).map((r) => (r.completedAt!.getTime() - r.startedAt.getTime()) / 60000);
  const questPopularity: Record<string, { name: string; starts: number; completions: number }> = {};
  for (const r of runs) { const q = (questPopularity[r.questId] ??= { name: r.quest.name, starts: 0, completions: 0 }); q.starts++; if (r.status === "COMPLETED") q.completions++; }
  const levelDist = levels.map((l) => ({ name: l.name, icon: l.icon, count: users.filter((u) => levelForXp(levels, u.xpTotal).current.order === l.order).length }));
  const partnerPerf: Record<string, number> = {};
  for (const r of redemptions) partnerPerf[r.userReward.reward.partnerName] = (partnerPerf[r.userReward.reward.partnerName] ?? 0) + 1;

  return ok({
    kpis: { totalUsers, newUsers, dau, mau, activeQuests, questStarts: runs.length, completedQuests: completedRuns, missionsCompleted: approved.length, pendingVerifications: pending, rewardRedemptions: redemptions.length, rewardsIssued: issued, rewardsExpired: expired, completionRate: runs.length ? completedRuns / runs.length : 0, avgCompletionMinutes: completionTimes.length ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length : 0, missionRejectionRate: segSubs.length ? rejected.length / segSubs.length : 0, missionCompletionRate: segSubs.length ? approved.length / segSubs.length : 0, qrScans: qrScans.reduce((s, g) => s + g._count, 0), qrScanFailures: qrScans.find((g) => !g.success)?._count ?? 0, gpsCheckins, xpAwarded: allSubs._sum.amount ?? 0, returningUsers: Object.values(userFirstRun).filter((d) => d < since).length },
    series: Object.values(series),
    topDestinations: Object.values(byDest).sort((a, b) => b.visits - a.visits).slice(0, 10),
    hardestMissions: Object.values(byMission).map((m) => ({ ...m, successRate: m.attempts ? m.approved / m.attempts : 0, avgMinutes: m.avgMinutes.length ? m.avgMinutes.reduce((a, b) => a + b, 0) / m.avgMinutes.length : 0 })).sort((a, b) => a.successRate - b.successRate).slice(0, 10),
    missionsByType: Object.entries(byType).map(([type, count]) => ({ type, count })),
    funnel,
    dropoff: Object.values(dropoff),
    questPopularity: Object.values(questPopularity).sort((a, b) => b.starts - a.starts),
    levelDist,
    partnerPerf: Object.entries(partnerPerf).map(([partner, count]) => ({ partner, count })).sort((a, b) => b.count - a.count),
  });
});
