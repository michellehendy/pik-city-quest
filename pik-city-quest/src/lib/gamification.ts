// Centralised gamification engine: XP ledger, levels, badges, rewards, challenges, streaks, notifications, audit.
import { prisma } from "./db";
import { parseJson, randomCode, todayKey, weekKey } from "./utils";
import { randomBytes } from "crypto";

export type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
const db = () => prisma;

// ───────── Notifications & audit ─────────
export async function notify(userId: string, type: string, title: string, body: string, link?: string) {
  return db().notification.create({ data: { userId, type, title, body, link } });
}
export async function audit(actorId: string | null, action: string, entity: string, entityId?: string | null, meta?: Record<string, unknown>, ip?: string | null) {
  return db().auditLog.create({ data: { actorId, action, entity, entityId: entityId ?? null, meta: JSON.stringify(meta ?? {}), ip: ip ?? null } });
}

// ───────── XP rules & levels ─────────
export async function xpRule(key: string, fallback: number) {
  const r = await db().xpRule.findUnique({ where: { key } });
  return r?.amount ?? fallback;
}
export async function getLevels() {
  return db().level.findMany({ orderBy: { order: "asc" } });
}
export function levelForXp(levels: Array<{ order: number; name: string; minXp: number; icon: string; color: string }>, xp: number) {
  let current = levels[0];
  for (const l of levels) if (xp >= l.minXp) current = l;
  const next = levels.find((l) => l.order === (current?.order ?? 0) + 1) ?? null;
  const span = next ? next.minXp - current.minXp : 1;
  const progress = next ? Math.min(1, (xp - current.minXp) / span) : 1;
  return { current, next, progress, xpToNext: next ? Math.max(0, next.minXp - xp) : 0 };
}
export async function userLevel(xp: number) {
  return levelForXp(await getLevels(), xp);
}

/** Idempotent XP award. The unique (userId, kind, refType, refId) key prevents duplicate awards. */
export async function awardXp(input: { userId: string; amount: number; kind: string; refType: string; refId: string; description: string }) {
  if (input.amount === 0) return { awarded: false, amount: 0 };
  const exists = await db().xpTransaction.findUnique({ where: { userId_kind_refType_refId: { userId: input.userId, kind: input.kind, refType: input.refType, refId: input.refId } } });
  if (exists) return { awarded: false, amount: 0 };
  const before = await db().user.findUnique({ where: { id: input.userId }, select: { xpTotal: true } });
  await db().xpTransaction.create({ data: input });
  const pointsPerXp = await xpRule("POINTS_PER_XP", 1);
  const after = await db().user.update({
    where: { id: input.userId },
    data: { xpTotal: { increment: input.amount }, pointsBalance: { increment: Math.max(0, Math.round(input.amount * pointsPerXp)) } },
    select: { xpTotal: true },
  });
  // Level-up detection
  const levels = await getLevels();
  const prev = levelForXp(levels, before?.xpTotal ?? 0).current;
  const now = levelForXp(levels, after.xpTotal).current;
  if (now && prev && now.order > prev.order) {
    await notify(input.userId, "LEVEL_UP", "LEVEL UP!", `You are now a ${now.name}. Keep exploring PIK!`, "/profile");
    await evaluateBadges(input.userId, { reason: "LEVEL" });
  }
  return { awarded: true, amount: input.amount };
}

// ───────── Streaks ─────────
export async function touchStreak(userId: string) {
  const user = await db().user.findUnique({ where: { id: userId }, select: { streakDays: true, lastActiveDate: true } });
  if (!user) return;
  const today = todayKey();
  if (user.lastActiveDate === today) return;
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const yesterday = todayKey(y);
  const streakDays = user.lastActiveDate === yesterday ? user.streakDays + 1 : 1;
  await db().user.update({ where: { id: userId }, data: { streakDays, lastActiveDate: today } });
  if (streakDays > 1) {
    const amt = await xpRule("STREAK_DAY", 10);
    await awardXp({ userId, amount: amt, kind: "STREAK", refType: "Day", refId: today, description: `${streakDays}-day streak bonus` });
  }
}

// ───────── Rewards ─────────
function voucher(prefix: string) {
  return `${prefix}-${randomCode(8)}`;
}
export async function issueReward(userId: string, rewardId: string, source: string, sourceRefId: string) {
  const reward = await db().reward.findUnique({ where: { id: rewardId }, include: { _count: { select: { userRewards: true } } } });
  if (!reward || !reward.isActive) return null;
  if (reward.expiresAt && reward.expiresAt < new Date()) return null;
  const existing = await db().userReward.findUnique({ where: { userId_rewardId_sourceRefId: { userId, rewardId, sourceRefId } } });
  if (existing) return existing;
  if (reward.totalLimit != null && reward._count.userRewards >= reward.totalLimit) return null;
  const mine = await db().userReward.count({ where: { userId, rewardId } });
  if (mine >= reward.perUserLimit) return null;
  const expiresAt = reward.expiresAt ?? new Date(Date.now() + reward.validDays * 86400000);
  const ur = await db().userReward.create({
    data: { userId, rewardId, voucherCode: voucher(reward.voucherPrefix), qrToken: randomBytes(18).toString("base64url"), status: "AVAILABLE", source, sourceRefId, expiresAt },
  });
  await notify(userId, "REWARD", "REWARD AVAILABLE!", `You have a new exclusive reward waiting for you: ${reward.name}.`, `/profile/rewards/${ur.id}`);
  return ur;
}

export async function redeemWithPoints(userId: string, rewardId: string) {
  const reward = await db().reward.findUnique({ where: { id: rewardId } });
  if (!reward || !reward.isActive || reward.pointsCost == null) throw new Error("This reward cannot be exchanged with points.");
  const user = await db().user.findUnique({ where: { id: userId }, select: { pointsBalance: true } });
  if (!user || user.pointsBalance < reward.pointsCost) throw new Error("Not enough points for this reward.");
  const refId = `${rewardId}:${Date.now()}`;
  const ur = await issueReward(userId, rewardId, "POINTS", refId);
  if (!ur) throw new Error("Reward is no longer available.");
  await db().xpTransaction.create({ data: { userId, amount: -reward.pointsCost, kind: "POINTS_REDEEM", refType: "UserReward", refId: ur.id, description: `Points exchanged for ${reward.name}` } });
  await db().user.update({ where: { id: userId }, data: { pointsBalance: { decrement: reward.pointsCost } } });
  return ur;
}

export async function expireRewards(userId?: string) {
  await db().userReward.updateMany({ where: { status: "AVAILABLE", expiresAt: { lt: new Date() }, ...(userId ? { userId } : {}) }, data: { status: "EXPIRED" } });
}

/** Partner / admin verifies and redeems a reward QR. Enforces partner scoping and prevents duplicate redemption. */
export async function verifyRedemption(actor: { id: string; role: string; partnerId: string | null }, qrTokenOrCode: string, location?: string) {
  const ur = await db().userReward.findFirst({ where: { OR: [{ qrToken: qrTokenOrCode }, { voucherCode: qrTokenOrCode.toUpperCase() }] }, include: { reward: true, user: { select: { name: true, username: true } } } });
  if (!ur) return { ok: false as const, reason: "Voucher not found." };
  if (actor.role === "PARTNER_ADMIN" && ur.reward.partnerId && ur.reward.partnerId !== actor.partnerId) return { ok: false as const, reason: "This voucher belongs to another partner.", userReward: ur };
  if (ur.status === "REDEEMED") return { ok: false as const, reason: `Already redeemed on ${ur.redeemedAt?.toLocaleString()}.`, userReward: ur };
  if (ur.status === "EXPIRED" || ur.expiresAt < new Date()) {
    if (ur.status !== "EXPIRED") await db().userReward.update({ where: { id: ur.id }, data: { status: "EXPIRED" } });
    return { ok: false as const, reason: "Voucher has expired.", userReward: ur };
  }
  const updated = await db().userReward.update({ where: { id: ur.id }, data: { status: "REDEEMED", redeemedAt: new Date(), redemption: { create: { redeemedById: actor.id, partnerId: actor.partnerId ?? ur.reward.partnerId, location } } }, include: { reward: true, user: { select: { name: true, username: true } } } });
  await notify(ur.userId, "REWARD", "REWARD REDEEMED", `${ur.reward.name} was redeemed${location ? ` at ${location}` : ""}. Enjoy!`, `/profile/rewards/${ur.id}`);
  await audit(actor.id, "REDEEM_REWARD", "UserReward", ur.id, { reward: ur.reward.name, location });
  return { ok: true as const, userReward: updated };
}

// ───────── Badges ─────────
type Criteria = { type: string; destinationId?: string; destinationName?: string; areaSlug?: string; count?: number; category?: string; tag?: string; missionId?: string; missionName?: string; questId?: string; questSlug?: string; order?: number };

async function approvedDestinations(userId: string) {
  const subs = await db().missionSubmission.findMany({
    where: { userId, status: "APPROVED" },
    select: { checkpoint: { select: { destinationId: true } }, mission: { select: { destinationId: true } } },
  });
  return Array.from(new Set(subs.map((s) => s.checkpoint?.destinationId ?? s.mission.destinationId).filter(Boolean) as string[]));
}

async function criteriaMet(userId: string, c: Criteria, levels: Awaited<ReturnType<typeof getLevels>>, user: { xpTotal: number }) {
  switch (c.type) {
    case "DESTINATION_VISIT": {
      const ids = await approvedDestinations(userId);
      return !!c.destinationId && ids.includes(c.destinationId);
    }
    case "AREA_VISITS": {
      const ids = await approvedDestinations(userId);
      if (!ids.length) return false;
      const n = await db().destination.count({ where: { id: { in: ids }, area: { slug: c.areaSlug } } });
      return n >= (c.count ?? 1);
    }
    case "CATEGORY_VISITS": {
      const ids = await approvedDestinations(userId);
      if (!ids.length) return false;
      const n = await db().destination.count({ where: { id: { in: ids }, categories: { contains: `"${c.category}"` } } });
      return n >= (c.count ?? 1);
    }
    case "TAG_VISITS": {
      const ids = await approvedDestinations(userId);
      if (!ids.length) return false;
      const n = await db().destination.count({ where: { id: { in: ids }, tags: { contains: `"${c.tag}"` } } });
      return n >= (c.count ?? 1);
    }
    case "MISSION_COUNT": {
      const n = await db().missionSubmission.count({ where: { userId, status: "APPROVED" } });
      return n >= (c.count ?? 1);
    }
    case "MISSION_APPROVED": {
      const where = c.missionId ? { missionId: c.missionId } : { mission: { name: c.missionName } };
      const n = await db().missionSubmission.count({ where: { userId, status: "APPROVED", ...where } });
      return n > 0;
    }
    case "QUEST_COMPLETE": {
      const where = c.questId ? { questId: c.questId } : { quest: { slug: c.questSlug } };
      const n = await db().questRun.count({ where: { userId, status: "COMPLETED", ...where } });
      return n > 0;
    }
    case "WEEKEND_MISSIONS": {
      const subs = await db().missionSubmission.findMany({ where: { userId, status: "APPROVED" }, select: { reviewedAt: true, submittedAt: true } });
      const n = subs.filter((s) => { const d = new Date((s.reviewedAt ?? s.submittedAt ?? new Date()).getTime() + 7 * 3600000); const day = d.getUTCDay(); return day === 0 || day === 6; }).length;
      return n >= (c.count ?? 1);
    }
    case "SUNSET_MISSIONS": {
      const subs = await db().missionSubmission.findMany({ where: { userId, status: "APPROVED" }, select: { reviewedAt: true, submittedAt: true, checkpoint: { select: { destination: { select: { tags: true } } } }, mission: { select: { destination: { select: { tags: true } } } } } });
      const n = subs.filter((s) => {
        const tags = (s.checkpoint?.destination.tags ?? s.mission.destination?.tags ?? "[]");
        if (!/sunset|beach/.test(tags)) return false;
        const h = new Date((s.reviewedAt ?? s.submittedAt ?? new Date()).getTime() + 7 * 3600000).getUTCHours();
        return h >= 16 && h < 19;
      }).length;
      return n >= (c.count ?? 1);
    }
    case "LEVEL": {
      return levelForXp(levels, user.xpTotal).current.order >= (c.order ?? 99);
    }
    default:
      return false; // MANUAL and unknown criteria are awarded by admins
  }
}

export async function evaluateBadges(userId: string, _ctx?: { reason?: string }) {
  void _ctx;
  const [badges, owned, levels, user] = await Promise.all([
    db().badge.findMany({ where: { isActive: true } }),
    db().userBadge.findMany({ where: { userId }, select: { badgeId: true } }),
    getLevels(),
    db().user.findUnique({ where: { id: userId }, select: { xpTotal: true } }),
  ]);
  if (!user) return [];
  const ownedSet = new Set(owned.map((o) => o.badgeId));
  const newly: string[] = [];
  for (const b of badges) {
    if (ownedSet.has(b.id)) continue;
    const c = parseJson<Criteria>(b.criteria, { type: "MANUAL" });
    if (c.type === "MANUAL") continue;
    if (await criteriaMet(userId, c, levels, user)) {
      await grantBadge(userId, b.id);
      newly.push(b.id);
    }
  }
  return newly;
}

export async function grantBadge(userId: string, badgeId: string, context?: Record<string, unknown>) {
  const badge = await db().badge.findUnique({ where: { id: badgeId } });
  if (!badge) return null;
  const existing = await db().userBadge.findUnique({ where: { userId_badgeId: { userId, badgeId } } });
  if (existing) return existing;
  const ub = await db().userBadge.create({ data: { userId, badgeId, context: context ? JSON.stringify(context) : null } });
  await notify(userId, "BADGE", "NEW BADGE UNLOCKED!", `Congratulations! You've earned the ${badge.name} badge.`, `/profile/badges/${badge.slug}`);
  await awardXp({ userId, amount: badge.xpBonus, kind: "BADGE", refType: "Badge", refId: badgeId, description: `Badge earned: ${badge.name}` });
  // Badge-linked rewards
  const rewards = await db().reward.findMany({ where: { badgeId, isActive: true, issuance: "BADGE" } });
  for (const r of rewards) await issueReward(userId, r.id, "BADGE", badgeId);
  return ub;
}

// ───────── Challenges ─────────
export function periodKeyFor(cadence: string, d = new Date()) {
  if (cadence === "DAILY") return todayKey(d);
  if (cadence === "WEEKLY") return weekKey(d);
  return "once";
}
export async function evaluateChallenges(userId: string, ctx: { missionId: string; destinationId: string | null; areaSlug?: string | null }) {
  const now = new Date();
  const challenges = await db().challenge.findMany({ where: { isActive: true, OR: [{ startsAt: null }, { startsAt: { lte: now } }], AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }] } });
  const done: string[] = [];
  for (const ch of challenges) {
    const matches = ch.missionId ? ch.missionId === ctx.missionId : ch.destinationId ? ch.destinationId === ctx.destinationId : true;
    if (!matches) continue;
    const periodKey = periodKeyFor(ch.cadence, now);
    const existing = await db().userChallenge.findUnique({ where: { userId_challengeId_periodKey: { userId, challengeId: ch.id, periodKey } } });
    if (existing?.status === "COMPLETED") continue;
    await db().userChallenge.upsert({ where: { userId_challengeId_periodKey: { userId, challengeId: ch.id, periodKey } }, update: { status: "COMPLETED", completedAt: now }, create: { userId, challengeId: ch.id, periodKey, status: "COMPLETED", completedAt: now } });
    await awardXp({ userId, amount: ch.xp, kind: "CHALLENGE", refType: "Challenge", refId: `${ch.id}:${periodKey}`, description: `Challenge completed: ${ch.title}` });
    await notify(userId, "CHALLENGE", "CHALLENGE COMPLETE!", `${ch.title} — +${ch.xp} XP`, "/");
    if (ch.mysteryReward) {
      const mystery = await db().reward.findFirst({ where: { isActive: true, issuance: "CAMPAIGN" } });
      if (mystery) await issueReward(userId, mystery.id, "CAMPAIGN", `${ch.id}:${periodKey}`);
    }
    done.push(ch.id);
  }
  return done;
}

// ───────── Leaderboard ─────────
export async function leaderboard(opts: { period?: "all" | "monthly" | "weekly"; questId?: string; limit?: number }) {
  const limit = opts.limit ?? 50;
  const levels = await getLevels();
  if (opts.questId) {
    const runs = await db().questRun.findMany({ where: { questId: opts.questId, status: "COMPLETED", user: { role: "VISITOR", isActive: true } }, include: { user: { select: { id: true, name: true, username: true, avatarUrl: true, xpTotal: true, publicProfile: true } } }, orderBy: [{ xpEarned: "desc" }, { completedAt: "asc" }], take: limit });
    return runs.map((r, i) => ({ rank: i + 1, user: r.user, xp: r.xpEarned, level: levelForXp(levels, r.user.xpTotal).current, completedQuests: 1 }));
  }
  let since: Date | null = null;
  if (opts.period === "monthly") { since = new Date(); since.setDate(1); since.setHours(0, 0, 0, 0); }
  if (opts.period === "weekly") { since = new Date(); const day = (since.getDay() + 6) % 7; since.setDate(since.getDate() - day); since.setHours(0, 0, 0, 0); }
  if (!since) {
    const users = await db().user.findMany({ where: { role: "VISITOR", isActive: true }, select: { id: true, name: true, username: true, avatarUrl: true, xpTotal: true, publicProfile: true, _count: { select: { questRuns: { where: { status: "COMPLETED" } } } } }, orderBy: { xpTotal: "desc" }, take: limit });
    return users.map((u, i) => ({ rank: i + 1, user: u, xp: u.xpTotal, level: levelForXp(levels, u.xpTotal).current, completedQuests: u._count.questRuns }));
  }
  const grouped = await db().xpTransaction.groupBy({ by: ["userId"], where: { createdAt: { gte: since }, amount: { gt: 0 } }, _sum: { amount: true }, orderBy: { _sum: { amount: "desc" } }, take: limit });
  const users = await db().user.findMany({ where: { id: { in: grouped.map((g) => g.userId) }, role: "VISITOR", isActive: true }, select: { id: true, name: true, username: true, avatarUrl: true, xpTotal: true, publicProfile: true, _count: { select: { questRuns: { where: { status: "COMPLETED" } } } } } });
  const byId = Object.fromEntries(users.map((u) => [u.id, u]));
  return grouped.filter((g) => byId[g.userId]).map((g, i) => ({ rank: i + 1, user: byId[g.userId], xp: g._sum.amount ?? 0, level: levelForXp(levels, byId[g.userId].xpTotal).current, completedQuests: byId[g.userId]._count.questRuns }));
}

export async function userRank(userId: string) {
  const me = await db().user.findUnique({ where: { id: userId }, select: { xpTotal: true } });
  if (!me) return null;
  const above = await db().user.count({ where: { role: "VISITOR", isActive: true, xpTotal: { gt: me.xpTotal } } });
  return above + 1;
}
