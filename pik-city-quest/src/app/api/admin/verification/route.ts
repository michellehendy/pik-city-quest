import { api, ok } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
export const GET = api(async (req) => {
  const user = await requirePermission("verification.review");
  const url = new URL(req.url);
  const status = url.searchParams.get("status") || "PENDING";
  const q = url.searchParams.get("q")?.trim();
  const questId = url.searchParams.get("quest") || undefined;
  const type = url.searchParams.get("type") || undefined;
  const sort = url.searchParams.get("sort") || "oldest";
  const where = {
    ...(status === "PENDING" ? { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } : status === "ALL" ? { status: { in: ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED"] }, mission: { verification: "MANUAL" } } : { status }),
    ...(questId ? { questRun: { questId } } : {}), ...(type ? { mission: { type } } : {}),
    ...(q ? { OR: [{ user: { username: { contains: q } } }, { user: { name: { contains: q } } }, { mission: { name: { contains: q } } }, { checkpoint: { destination: { name: { contains: q } } } }] } : {}),
    ...(user.role === "PARTNER_ADMIN" ? { checkpoint: { destination: { partnerId: user.partnerId ?? "__none__" } } } : {}),
  };
  const items = await prisma.missionSubmission.findMany({ where, include: { user: { select: { id: true, name: true, username: true, avatarUrl: true } }, mission: { select: { name: true, type: true, xp: true, instructions: true } }, checkpoint: { select: { order: true, destination: { select: { name: true, lat: true, lng: true } }, quest: { select: { name: true, slug: true } } } }, requirements: { include: { requirement: { select: { type: true, label: true } } } }, reviewedBy: { select: { username: true } } }, orderBy: sort === "newest" ? { submittedAt: "desc" } : { submittedAt: "asc" }, take: 200 });
  return ok({ items });
});
