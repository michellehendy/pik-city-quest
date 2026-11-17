// Quest & mission engine: starting quests, unlock rules, requirement verification, manual review, quest completion.
import { prisma } from "./db";
import { HttpError } from "./auth";
import { haversineMeters, parseJson, randomCode } from "./utils";
import { awardXp, evaluateBadges, evaluateChallenges, grantBadge, issueReward, notify, audit, touchStreak, xpRule } from "./gamification";
import { AUTO_VERIFIED, MANUAL_VERIFIED } from "./constants";

export type QuestUserStatus = "AVAILABLE" | "ONGOING" | "COMPLETED" | "UPCOMING" | "ENDED" | "LOCKED";

export function questWindowStatus(q: { status: string; startsAt: Date | null; endsAt: Date | null }, now = new Date()) {
  if (q.status !== "PUBLISHED") return "UNPUBLISHED" as const;
  if (q.startsAt && q.startsAt > now) return "UPCOMING" as const;
  if (q.endsAt && q.endsAt < now) return "ENDED" as const;
  return "LIVE" as const;
}

export async function unlockConditionCheck(userId: string, conditions: Record<string, unknown>) {
  const reasons: string[] = [];
  if (conditions.requiresQuestId) {
    const done = await prisma.questRun.count({ where: { userId, questId: String(conditions.requiresQuestId), status: "COMPLETED" } });
    if (!done) { const q = await prisma.quest.findUnique({ where: { id: String(conditions.requiresQuestId) } }); reasons.push(`Complete "${q?.name ?? "the required quest"}" first.`); }
  }
  if (conditions.requiresBadgeId) {
    const has = await prisma.userBadge.count({ where: { userId, badgeId: String(conditions.requiresBadgeId) } });
    if (!has) { const b = await prisma.badge.findUnique({ where: { id: String(conditions.requiresBadgeId) } }); reasons.push(`Earn the ${b?.name ?? "required"} badge first.`); }
  }
  if (conditions.requiresLevel) {
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { xpTotal: true } });
    const levels = await prisma.level.findMany({ orderBy: { order: "asc" } });
    const cur = levels.filter((l) => (u?.xpTotal ?? 0) >= l.minXp).pop();
    if ((cur?.order ?? 1) < Number(conditions.requiresLevel)) reasons.push(`Reach level ${levels.find((l) => l.order === Number(conditions.requiresLevel))?.name ?? conditions.requiresLevel} first.`);
  }
  return reasons;
}

export async function questStatusForUser(userId: string | null, quest: { id: string; status: string; startsAt: Date | null; endsAt: Date | null; unlockConditions: string }) {
  const w = questWindowStatus(quest);
  if (w === "UPCOMING") return "UPCOMING" as QuestUserStatus;
  if (w === "ENDED") return "ENDED" as QuestUserStatus;
  if (!userId) return "AVAILABLE" as QuestUserStatus;
  const run = await prisma.questRun.findFirst({ where: { userId, questId: quest.id, status: { in: ["ACTIVE", "COMPLETED"] } }, orderBy: { startedAt: "desc" } });
  if (run?.status === "ACTIVE") return "ONGOING";
  if (run?.status === "COMPLETED") return "COMPLETED";
  const reasons = await unlockConditionCheck(userId, parseJson(quest.unlockConditions, {}));
  return reasons.length ? "LOCKED" : "AVAILABLE";
}

// ───────── Start quest ─────────
export async function startQuest(userId: string, questId: string) {
  const quest = await prisma.quest.findUnique({ where: { id: questId }, include: { checkpoints: { orderBy: { order: "asc" } } } });
  if (!quest) throw new HttpError(404, "Quest not found.");
  const w = questWindowStatus(quest);
  if (w !== "LIVE") throw new HttpError(400, w === "UPCOMING" ? "This quest hasn't started yet." : w === "ENDED" ? "This quest has ended." : "This quest is not available.");
  if (!quest.checkpoints.length) throw new HttpError(400, "This quest has no checkpoints yet.");
  const reasons = await unlockConditionCheck(userId, parseJson(quest.unlockConditions, {}));
  if (reasons.length) throw new HttpError(403, reasons.join(" "));
  const existing = await prisma.questRun.findFirst({ where: { userId, questId, status: "ACTIVE" } });
  if (existing) return existing;
  const completed = await prisma.questRun.findFirst({ where: { userId, questId, status: "COMPLETED" } });
  if (completed) throw new HttpError(400, "You have already completed this quest.");
  const sequential = quest.completionRule === "SEQUENTIAL";
  const run = await prisma.questRun.create({
    data: {
      userId, questId,
      checkpoints: { create: quest.checkpoints.map((cp, i) => ({ checkpointId: cp.id, status: sequential ? (i === 0 ? "AVAILABLE" : "LOCKED") : "AVAILABLE", unlockedAt: sequential && i > 0 ? null : new Date() })) },
    },
  });
  await notify(userId, "QUEST_STARTED", "QUEST STARTED!", `${quest.name} is on. Head to your first checkpoint.`, `/quests/${quest.slug}`);
  await audit(userId, "START_QUEST", "QuestRun", run.id, { questId });
  return run;
}

export async function abandonQuest(userId: string, runId: string) {
  const run = await prisma.questRun.findFirst({ where: { id: runId, userId, status: "ACTIVE" } });
  if (!run) throw new HttpError(404, "Active quest not found.");
  await prisma.questRun.update({ where: { id: runId }, data: { status: "ABANDONED" } });
}

// ───────── Submissions ─────────
export async function getOrCreateSubmission(userId: string, missionId: string, opts: { runId?: string | null; checkpointId?: string | null }) {
  const mission = await prisma.mission.findUnique({ where: { id: missionId }, include: { requirements: { orderBy: { order: "asc" } } } });
  if (!mission || !mission.isActive) throw new HttpError(404, "Mission not found.");
  let runId: string | null = opts.runId ?? null;
  const checkpointId: string | null = opts.checkpointId ?? null;
  if (checkpointId) {
    const cp = await prisma.questCheckpoint.findUnique({ where: { id: checkpointId }, include: { missions: true, quest: true } });
    if (!cp) throw new HttpError(404, "Checkpoint not found.");
    if (!cp.missions.some((m) => m.missionId === missionId)) throw new HttpError(400, "Mission is not part of this checkpoint.");
    const run = await prisma.questRun.findFirst({ where: { userId, questId: cp.questId, status: "ACTIVE" } });
    if (!run) throw new HttpError(400, "Start the quest before attempting this mission.");
    runId = run.id;
    const w = questWindowStatus(cp.quest);
    if (w !== "LIVE") throw new HttpError(400, "This quest is not currently active.");
    const prog = await prisma.checkpointProgress.findUnique({ where: { questRunId_checkpointId: { questRunId: run.id, checkpointId } } });
    if (!prog || prog.status === "LOCKED") throw new HttpError(403, "This checkpoint is still locked. Complete the previous checkpoint first.");
  }
  const existing = await prisma.missionSubmission.findFirst({ where: { userId, missionId, questRunId: runId, checkpointId }, include: { requirements: true }, orderBy: { startedAt: "desc" } });
  if (existing) return existing;
  const sub = await prisma.missionSubmission.create({
    data: { userId, missionId, questRunId: runId, checkpointId, status: "IN_PROGRESS", requirements: { create: mission.requirements.map((r) => ({ requirementId: r.id })) } },
    include: { requirements: true },
  });
  if (checkpointId && runId) {
    await prisma.checkpointProgress.updateMany({ where: { questRunId: runId, checkpointId, status: "AVAILABLE" }, data: { status: "IN_PROGRESS" } });
  }
  return sub;
}

type GeoInput = { lat: number; lng: number; accuracyM?: number } | null | undefined;

async function effectiveDestination(sub: { checkpointId: string | null; missionId: string }) {
  if (sub.checkpointId) {
    const cp = await prisma.questCheckpoint.findUnique({ where: { id: sub.checkpointId }, include: { destination: true } });
    if (cp) return cp.destination;
  }
  const m = await prisma.mission.findUnique({ where: { id: sub.missionId }, include: { destination: true } });
  return m?.destination ?? null;
}

function withinTimeWindow(win: { from: string; to: string } | undefined) {
  if (!win) return true;
  const now = new Date(Date.now() + 7 * 3600000); // WIB
  const hm = now.getUTCHours() * 60 + now.getUTCMinutes();
  const [fh, fm] = win.from.split(":").map(Number);
  const [th, tm] = win.to.split(":").map(Number);
  return hm >= fh * 60 + fm && hm <= th * 60 + tm;
}

export type VerifyResult = { ok: boolean; message: string; status: string; data?: Record<string, unknown> };

/** Verifies one requirement of a mission submission. Server-side only. */
export async function submitRequirement(userId: string, submissionId: string, requirementId: string, payload: Record<string, unknown>, geo: GeoInput, mediaUrl?: string | null): Promise<VerifyResult> {
  const sub = await prisma.missionSubmission.findFirst({ where: { id: submissionId, userId }, include: { mission: { include: { requirements: { orderBy: { order: "asc" } } } }, requirements: true, questRun: { include: { quest: true } } } });
  if (!sub) throw new HttpError(404, "Submission not found.");
  if (sub.status === "APPROVED") throw new HttpError(400, "This mission is already approved.");
  if (sub.status === "SUBMITTED" || sub.status === "UNDER_REVIEW") throw new HttpError(400, "This mission is waiting for review.");
  if (sub.questRun && sub.questRun.status !== "ACTIVE") throw new HttpError(400, "This quest is no longer active.");
  if (sub.questRun && questWindowStatus(sub.questRun.quest) !== "LIVE") throw new HttpError(400, "This quest is not currently active.");
  if (sub.checkpointId && sub.questRunId) {
    const prog = await prisma.checkpointProgress.findUnique({ where: { questRunId_checkpointId: { questRunId: sub.questRunId, checkpointId: sub.checkpointId } } });
    if (!prog || prog.status === "LOCKED") throw new HttpError(403, "This checkpoint is locked.");
  }
  const req = sub.mission.requirements.find((r) => r.id === requirementId);
  if (!req) throw new HttpError(404, "Requirement not found.");
  const rs = sub.requirements.find((r) => r.requirementId === requirementId) ?? (await prisma.requirementSubmission.create({ data: { submissionId: sub.id, requirementId } }));
  if (rs.status === "APPROVED") return { ok: true, message: "Already completed.", status: "APPROVED" };
  // Ordered multi-step: previous mandatory steps must be approved or submitted
  if (sub.mission.stepsOrdered) {
    for (const prev of sub.mission.requirements) {
      if (prev.order >= req.order) break;
      if (!prev.isMandatory) continue;
      const prs = sub.requirements.find((r) => r.requirementId === prev.id);
      if (!prs || !["APPROVED", "SUBMITTED"].includes(prs.status)) throw new HttpError(400, `Complete step ${prev.order + 1} first.`);
    }
  }
  const cfg = parseJson<Record<string, unknown>>(req.config, {});
  const maxAttempts = (cfg.maxAttempts as number | undefined) ?? sub.mission.maxAttempts ?? null;
  if (maxAttempts && rs.attempts >= maxAttempts) return { ok: false, message: "Maximum attempts reached for this step.", status: rs.status };
  if (sub.mission.timeLimitSec && Date.now() - sub.startedAt.getTime() > sub.mission.timeLimitSec * 1000) return { ok: false, message: "Time limit exceeded. Retry the mission.", status: rs.status };

  const destination = await effectiveDestination(sub);
  let result: VerifyResult;
  const type = req.type as string;

  if (type === "QR") {
    const token = String(payload.qrToken ?? "").trim();
    const qrc = token ? await prisma.qrCode.findUnique({ where: { token } }) : null;
    let ok = false, reason = "QR code not recognised.";
    if (qrc) {
      if (!qrc.isActive) reason = "This QR code is inactive.";
      else if (qrc.expiresAt && qrc.expiresAt < new Date()) reason = "This QR code has expired.";
      else if (qrc.missionId && qrc.missionId !== sub.missionId) reason = "This QR code belongs to a different mission.";
      else if (!qrc.missionId && destination && qrc.destinationId !== destination.id) reason = "This QR code belongs to a different destination.";
      else if (!qrc.missionId && !destination) reason = "This QR code is not valid for this mission.";
      else {
        const dupe = await prisma.requirementSubmission.findFirst({ where: { submission: { userId, missionId: sub.missionId, questRunId: sub.questRunId }, requirementId, status: "APPROVED" } });
        if (dupe) reason = "You already scanned this code for this mission.";
        else ok = true;
      }
    }
    await prisma.qrScan.create({ data: { qrCodeId: qrc?.id ?? null, rawToken: qrc ? null : token.slice(0, 64), userId, success: ok, reason: ok ? null : reason, lat: geo?.lat, lng: geo?.lng } });
    result = { ok, message: ok ? `QR verified at ${qrc?.label ?? "venue"}.` : reason, status: ok ? "APPROVED" : "PENDING", data: { scannedAt: new Date().toISOString() } };
  } else if (type === "GPS" || type === "EVENT_CHECKIN") {
    if (!geo) result = { ok: false, message: "Location is required. Please allow location access.", status: "PENDING" };
    else if (!destination) result = { ok: false, message: "No destination configured for this mission.", status: "PENDING" };
    else {
      const radius = Number(cfg.radiusM ?? destination.gpsRadiusM ?? 100);
      const dist = haversineMeters(geo.lat, geo.lng, destination.lat, destination.lng);
      const acc = geo.accuracyM ?? 0;
      let ok = dist <= radius + Math.min(acc, 50);
      let msg = ok ? `Checked in ${Math.round(dist)} m from ${destination.name}.` : `You are ${Math.round(dist)} m away. Get within ${radius} m of ${destination.name}.`;
      if (ok && acc > 500) { ok = false; msg = "Location accuracy is too low. Move outdoors and try again."; }
      if (ok && !withinTimeWindow(cfg.timeWindow as { from: string; to: string } | undefined)) { ok = false; const w = cfg.timeWindow as { from: string; to: string }; msg = `This check-in is only available between ${w.from} and ${w.to} WIB.`; }
      if (ok && type === "EVENT_CHECKIN" && cfg.eventId) {
        const ev = await prisma.event.findUnique({ where: { id: String(cfg.eventId) } });
        const now = new Date();
        if (!ev) { ok = false; msg = "Event not found."; }
        else if (now < ev.startDate || now > new Date(ev.endDate.getTime() + 86399000)) { ok = false; msg = `This check-in is only valid during ${ev.title} (${ev.startDate.toDateString()} – ${ev.endDate.toDateString()}).`; }
      }
      result = { ok, message: msg, status: ok ? "APPROVED" : "PENDING", data: { distanceM: Math.round(dist), accuracyM: acc, lat: geo.lat, lng: geo.lng } };
    }
  } else if (type === "QUIZ") {
    const questions = (cfg.questions as Array<{ id: string; correctIndex: number }>) ?? [];
    const answers = (payload.answers as Record<string, number>) ?? {};
    const correct = questions.filter((q) => Number(answers[q.id]) === q.correctIndex).length;
    const score = questions.length ? correct / questions.length : 1;
    const pass = score >= Number(cfg.passScore ?? 1);
    result = { ok: pass, message: pass ? `Correct! ${correct}/${questions.length} right.` : `${correct}/${questions.length} correct. Try again.`, status: pass ? "APPROVED" : "PENDING", data: { correct, total: questions.length } };
  } else if (type === "CODE") {
    const expected = String(cfg.code ?? "");
    const given = String(payload.code ?? "").trim();
    const cs = Boolean(cfg.caseSensitive);
    const expired = cfg.expiresAt ? new Date(String(cfg.expiresAt)) < new Date() : false;
    const ok = !expired && expected.length > 0 && (cs ? given === expected : given.toLowerCase() === expected.toLowerCase());
    result = { ok, message: expired ? "This code has expired." : ok ? "Secret code accepted!" : "That code is not correct.", status: ok ? "APPROVED" : "PENDING" };
  } else if ((MANUAL_VERIFIED as string[]).includes(type)) {
    if (!mediaUrl && type !== "SOCIAL") result = { ok: false, message: "Please upload your proof first.", status: "PENDING" };
    else if (type === "SOCIAL" && !payload.link) result = { ok: false, message: "Please paste the link to your post.", status: "PENDING" };
    else result = { ok: true, message: "Submitted! The PIK Tourism team will review it shortly.", status: "SUBMITTED" };
  } else {
    result = { ok: false, message: "Unsupported requirement type.", status: "PENDING" };
  }

  await prisma.requirementSubmission.update({
    where: { id: rs.id },
    data: {
      attempts: { increment: 1 }, status: result.status, payload: JSON.stringify({ ...payload, ...(result.data ?? {}), submittedAt: new Date().toISOString() }),
      mediaUrl: mediaUrl ?? rs.mediaUrl, verifiedAt: result.status === "APPROVED" ? new Date() : null, rejectionReason: null,
    },
  });
  await prisma.missionSubmission.update({ where: { id: sub.id }, data: { attempts: { increment: 1 }, lat: geo?.lat ?? sub.lat, lng: geo?.lng ?? sub.lng, accuracyM: geo?.accuracyM ?? sub.accuracyM } });
  await recomputeSubmission(sub.id);
  return result;
}

/** Recomputes mission status from its requirements and triggers downstream effects. */
export async function recomputeSubmission(submissionId: string) {
  const sub = await prisma.missionSubmission.findUnique({ where: { id: submissionId }, include: { requirements: true, mission: { include: { requirements: true } } } });
  if (!sub) return;
  const mandatory = sub.mission.requirements.filter((r) => r.isMandatory);
  const statusOf = (rid: string) => sub.requirements.find((r) => r.requirementId === rid)?.status ?? "PENDING";
  const allApproved = mandatory.every((r) => statusOf(r.id) === "APPROVED");
  const anyRejected = mandatory.some((r) => statusOf(r.id) === "REJECTED");
  const allDoneOrPending = mandatory.every((r) => ["APPROVED", "SUBMITTED"].includes(statusOf(r.id)));
  let next = sub.status;
  if (allApproved) next = "APPROVED";
  else if (anyRejected) next = "REJECTED";
  else if (allDoneOrPending && mandatory.some((r) => statusOf(r.id) === "SUBMITTED")) next = "SUBMITTED";
  else next = "IN_PROGRESS";
  if (next !== sub.status) {
    await prisma.missionSubmission.update({ where: { id: sub.id }, data: { status: next, submittedAt: next === "SUBMITTED" || next === "APPROVED" ? sub.submittedAt ?? new Date() : sub.submittedAt, reviewedAt: next === "APPROVED" && !sub.reviewedAt ? new Date() : sub.reviewedAt } });
    if (next === "SUBMITTED" && sub.checkpointId && sub.questRunId) await prisma.checkpointProgress.updateMany({ where: { questRunId: sub.questRunId, checkpointId: sub.checkpointId, status: { in: ["AVAILABLE", "IN_PROGRESS"] } }, data: { status: "SUBMITTED" } });
    if (next === "APPROVED") await onMissionApproved(sub.id);
  }
}

async function onMissionApproved(submissionId: string) {
  const sub = await prisma.missionSubmission.findUnique({ where: { id: submissionId }, include: { mission: true, checkpoint: { include: { destination: { include: { area: true } }, missions: true, quest: true } }, questRun: true } });
  if (!sub || sub.status !== "APPROVED") return;
  const dest = sub.checkpoint?.destination ?? (sub.mission.destinationId ? await prisma.destination.findUnique({ where: { id: sub.mission.destinationId }, include: { area: true } }) : null);
  const cm = sub.checkpoint?.missions.find((m) => m.missionId === sub.missionId);
  const xp = cm?.xpOverride ?? sub.mission.xp;
  // Mission XP (idempotent)
  const res = await awardXp({ userId: sub.userId, amount: xp, kind: "MISSION", refType: "MissionSubmission", refId: sub.id, description: `${sub.mission.name} – mission approved` });
  if (res.awarded) await prisma.missionSubmission.update({ where: { id: sub.id }, data: { xpAwarded: xp, xpAwardedAt: new Date() } });
  // New destination discovery
  if (dest) {
    const nd = await xpRule("NEW_DESTINATION", 20);
    await awardXp({ userId: sub.userId, amount: nd, kind: "NEW_DESTINATION", refType: "Destination", refId: `${sub.userId}:${dest.id}`, description: `New destination discovered: ${dest.name}` });
  }
  await notify(sub.userId, "MISSION_COMPLETED", "MISSION COMPLETED!", `Nice work! ${sub.mission.name} approved${dest ? ` — you've collected the ${dest.name} stamp.` : "."}`, sub.checkpoint ? `/quests/${sub.checkpoint.quest.slug}` : "/quests");
  await touchStreak(sub.userId);

  // Checkpoint completion & unlock logic
  if (sub.checkpoint && sub.questRunId) {
    const mandatoryIds = sub.checkpoint.missions.filter((m) => m.isMandatory).map((m) => m.missionId);
    const approvedCount = mandatoryIds.length
      ? await prisma.missionSubmission.count({ where: { questRunId: sub.questRunId, checkpointId: sub.checkpointId!, status: "APPROVED", missionId: { in: mandatoryIds } } })
      : 1;
    const distinctApproved = mandatoryIds.length
      ? (await prisma.missionSubmission.findMany({ where: { questRunId: sub.questRunId, checkpointId: sub.checkpointId!, status: "APPROVED", missionId: { in: mandatoryIds } }, select: { missionId: true }, distinct: ["missionId"] })).length
      : approvedCount;
    if (distinctApproved >= mandatoryIds.length) {
      const prog = await prisma.checkpointProgress.findUnique({ where: { questRunId_checkpointId: { questRunId: sub.questRunId, checkpointId: sub.checkpointId! } } });
      if (prog && prog.status !== "COMPLETED") {
        await prisma.checkpointProgress.update({ where: { id: prog.id }, data: { status: "COMPLETED", completedAt: new Date(), stampIssuedAt: new Date() } });
        const bonus = await xpRule("CHECKPOINT_BONUS", 25);
        await awardXp({ userId: sub.userId, amount: bonus, kind: "CHECKPOINT", refType: "CheckpointProgress", refId: `${sub.questRunId}:${sub.checkpointId}`, description: `Checkpoint completed: ${dest?.name ?? "checkpoint"}` });
        await unlockNext(sub.questRunId, sub.checkpoint.questId);
        await checkQuestCompletion(sub.questRunId);
      }
    } else {
      await prisma.checkpointProgress.updateMany({ where: { questRunId: sub.questRunId, checkpointId: sub.checkpointId!, status: { in: ["AVAILABLE", "SUBMITTED"] } }, data: { status: "IN_PROGRESS" } });
    }
  }
  await evaluateChallenges(sub.userId, { missionId: sub.missionId, destinationId: dest?.id ?? null, areaSlug: dest?.area.slug });
  await evaluateBadges(sub.userId, { reason: "MISSION" });
}

async function unlockNext(runId: string, questId: string) {
  const quest = await prisma.quest.findUnique({ where: { id: questId }, include: { checkpoints: { orderBy: { order: "asc" } } } });
  if (!quest || quest.completionRule !== "SEQUENTIAL") return;
  const progress = await prisma.checkpointProgress.findMany({ where: { questRunId: runId } });
  for (const cp of quest.checkpoints) {
    const p = progress.find((x) => x.checkpointId === cp.id);
    if (p && p.status === "LOCKED") {
      const run = await prisma.questRun.findUnique({ where: { id: runId } });
      const dest = await prisma.destination.findUnique({ where: { id: cp.destinationId } });
      await prisma.checkpointProgress.update({ where: { id: p.id }, data: { status: "AVAILABLE", unlockedAt: new Date() } });
      if (run) await notify(run.userId, "MISSION_UNLOCKED", "MISSION UNLOCKED!", `Your next challenge at ${dest?.name ?? "the next checkpoint"} is ready.`, `/quests/${quest.slug}`);
      break;
    }
  }
}

async function checkQuestCompletion(runId: string) {
  const run = await prisma.questRun.findUnique({ where: { id: runId }, include: { quest: { include: { checkpoints: true, rewards: { where: { isActive: true, issuance: "QUEST_COMPLETION" } }, badges: true } }, checkpoints: true } });
  if (!run || run.status !== "ACTIVE") return;
  const total = run.quest.checkpoints.length;
  const completed = run.checkpoints.filter((c) => c.status === "COMPLETED").length;
  const needed = run.quest.completionRule === "MINIMUM" ? Math.min(total, run.quest.minCheckpoints ?? total) : total;
  if (completed < needed) return;
  const completionCode = `PIKQ-${randomCode(6)}`;
  const xpTotalEarned = await prisma.xpTransaction.aggregate({ where: { userId: run.userId, refType: "MissionSubmission", refId: { in: (await prisma.missionSubmission.findMany({ where: { questRunId: runId }, select: { id: true } })).map((s) => s.id) } }, _sum: { amount: true } });
  await prisma.questRun.update({ where: { id: runId }, data: { status: "COMPLETED", completedAt: new Date(), completionCode } });
  const questXp = run.quest.completionXp || (await xpRule("QUEST_COMPLETE_DEFAULT", 200));
  await awardXp({ userId: run.userId, amount: questXp, kind: "QUEST", refType: "QuestRun", refId: runId, description: `Quest completed: ${run.quest.name}` });
  if (run.quest.bonusXp) await awardXp({ userId: run.userId, amount: run.quest.bonusXp, kind: "QUEST_BONUS", refType: "QuestRun", refId: runId, description: `Special quest bonus: ${run.quest.name}` });
  const earned = (xpTotalEarned._sum.amount ?? 0) + questXp + (run.quest.bonusXp ?? 0) + completed * (await xpRule("CHECKPOINT_BONUS", 25));
  await prisma.questRun.update({ where: { id: runId }, data: { xpEarned: earned } });
  for (const r of run.quest.rewards) await issueReward(run.userId, r.id, "QUEST_COMPLETION", runId);
  let badgeId: string | null = null;
  for (const b of run.quest.badges) { await grantBadge(run.userId, b.id, { questRunId: runId }); badgeId = b.id; }
  if (badgeId) await prisma.questRun.update({ where: { id: runId }, data: { completionBadgeId: badgeId } });
  await notify(run.userId, "QUEST_COMPLETE", "QUEST COMPLETE!", `You've completed ${run.quest.name}! Claim your reward.`, `/quests/${run.quest.slug}/complete`);
  await evaluateBadges(run.userId, { reason: "QUEST" });
}

// ───────── Manual review ─────────
export async function reviewSubmission(adminId: string, submissionId: string, decision: "APPROVE" | "REJECT", reason?: string) {
  const sub = await prisma.missionSubmission.findUnique({ where: { id: submissionId }, include: { requirements: { include: { requirement: true } }, mission: true, checkpoint: { include: { quest: true, destination: true } } } });
  if (!sub) throw new HttpError(404, "Submission not found.");
  if (!["SUBMITTED", "UNDER_REVIEW"].includes(sub.status)) throw new HttpError(400, `Submission is ${sub.status}, not awaiting review.`);
  if (decision === "REJECT" && !reason?.trim()) throw new HttpError(400, "A rejection reason is required.");
  const pending = sub.requirements.filter((r) => r.status === "SUBMITTED");
  for (const r of pending) {
    await prisma.requirementSubmission.update({ where: { id: r.id }, data: { status: decision === "APPROVE" ? "APPROVED" : "REJECTED", verifiedAt: decision === "APPROVE" ? new Date() : null, rejectionReason: decision === "REJECT" ? reason : null } });
  }
  await prisma.missionSubmission.update({ where: { id: sub.id }, data: { reviewedAt: new Date(), reviewedById: adminId, rejectionReason: decision === "REJECT" ? reason : null, status: decision === "REJECT" ? "REJECTED" : sub.status } });
  if (decision === "REJECT") {
    if (sub.checkpointId && sub.questRunId) await prisma.checkpointProgress.updateMany({ where: { questRunId: sub.questRunId, checkpointId: sub.checkpointId, status: "SUBMITTED" }, data: { status: "IN_PROGRESS" } });
    await notify(sub.userId, "MISSION_REJECTED", "MISSION NOT APPROVED", `${reason} Tap to retry ${sub.mission.name}.`, sub.checkpoint ? `/quests/${sub.checkpoint.quest.slug}/mission/${sub.checkpointId}/${sub.missionId}` : `/missions/${sub.missionId}`);
  } else {
    await recomputeSubmission(sub.id);
  }
  await audit(adminId, decision === "APPROVE" ? "APPROVE_SUBMISSION" : "REJECT_SUBMISSION", "MissionSubmission", sub.id, { mission: sub.mission.name, reason });
  return prisma.missionSubmission.findUnique({ where: { id: sub.id } });
}

/** Visitor retries a rejected mission without losing quest progress. */
export async function retrySubmission(userId: string, submissionId: string) {
  const sub = await prisma.missionSubmission.findFirst({ where: { id: submissionId, userId }, include: { requirements: true } });
  if (!sub) throw new HttpError(404, "Submission not found.");
  if (sub.status !== "REJECTED") throw new HttpError(400, "Only rejected missions can be retried.");
  for (const r of sub.requirements.filter((x) => x.status === "REJECTED")) await prisma.requirementSubmission.update({ where: { id: r.id }, data: { status: "PENDING", mediaUrl: null, rejectionReason: r.rejectionReason } });
  return prisma.missionSubmission.update({ where: { id: sub.id }, data: { status: "IN_PROGRESS", submittedAt: null } });
}

export { AUTO_VERIFIED };
