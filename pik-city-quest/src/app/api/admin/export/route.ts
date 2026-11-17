import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { api } from "@/lib/api";

function csv(rows: Array<Record<string, unknown>>) {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => { const s = v instanceof Date ? v.toISOString() : v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}

export const GET = api(async (req) => {
  await requirePermission("analytics.view");
  const url = new URL(req.url);
  const type = url.searchParams.get("type") ?? "users";
  const days = Number(url.searchParams.get("days") ?? 30);
  const since = new Date(Date.now() - days * 86400000);
  const questId = url.searchParams.get("quest") || undefined;
  let rows: Array<Record<string, unknown>> = [];
  if (type === "users") rows = (await prisma.user.findMany({ where: { role: "VISITOR" }, select: { id: true, username: true, xpTotal: true, pointsBalance: true, streakDays: true, createdAt: true, lastLoginAt: true } })).map((u) => ({ ...u }));
  if (type === "runs") rows = (await prisma.questRun.findMany({ where: { startedAt: { gte: since }, ...(questId ? { questId } : {}) }, include: { quest: { select: { name: true } }, user: { select: { username: true } } } })).map((r) => ({ id: r.id, quest: r.quest.name, user: r.user.username, status: r.status, startedAt: r.startedAt, completedAt: r.completedAt, xpEarned: r.xpEarned, completionCode: r.completionCode }));
  if (type === "submissions") rows = (await prisma.missionSubmission.findMany({ where: { startedAt: { gte: since }, ...(questId ? { questRun: { questId } } : {}) }, include: { mission: { select: { name: true, type: true } }, user: { select: { username: true } }, checkpoint: { select: { destination: { select: { name: true } } } } } })).map((s) => ({ id: s.id, user: s.user.username, mission: s.mission.name, type: s.mission.type, destination: s.checkpoint?.destination.name ?? "", status: s.status, attempts: s.attempts, startedAt: s.startedAt, submittedAt: s.submittedAt, reviewedAt: s.reviewedAt, xpAwarded: s.xpAwarded, rejectionReason: s.rejectionReason, lat: s.lat, lng: s.lng }));
  if (type === "redemptions") rows = (await prisma.rewardRedemption.findMany({ where: { createdAt: { gte: since } }, include: { userReward: { include: { reward: true, user: { select: { username: true } } } }, redeemedBy: { select: { username: true } } } })).map((r) => ({ id: r.id, reward: r.userReward.reward.name, partner: r.userReward.reward.partnerName, user: r.userReward.user.username, voucherCode: r.userReward.voucherCode, redeemedBy: r.redeemedBy.username, location: r.location, redeemedAt: r.createdAt }));
  if (type === "xp") rows = (await prisma.xpTransaction.findMany({ where: { createdAt: { gte: since } }, include: { user: { select: { username: true } } }, orderBy: { createdAt: "desc" } })).map((t) => ({ id: t.id, user: t.user.username, amount: t.amount, kind: t.kind, refType: t.refType, refId: t.refId, description: t.description, createdAt: t.createdAt }));
  return new Response(csv(rows), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="pik-city-quest-${type}-${new Date().toISOString().slice(0, 10)}.csv"` } });
});
