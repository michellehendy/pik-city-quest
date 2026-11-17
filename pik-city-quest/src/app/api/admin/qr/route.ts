import { z } from "zod";
import { api, ok } from "@/lib/api";
import { HttpError, requirePermission, randomToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/gamification";
export const GET = api(async () => {
  const user = await requirePermission("qr.manage");
  const items = await prisma.qrCode.findMany({ where: user.role === "PARTNER_ADMIN" ? { destination: { partnerId: user.partnerId ?? "__none__" } } : {}, include: { destination: { select: { name: true } }, mission: { select: { name: true } }, _count: { select: { scans: true } } }, orderBy: { createdAt: "desc" } });
  const stats = await prisma.qrScan.groupBy({ by: ["qrCodeId", "success"], _count: true });
  return ok({ items: items.map((i) => ({ ...i, successScans: stats.find((s) => s.qrCodeId === i.id && s.success)?._count ?? 0, failedScans: stats.find((s) => s.qrCodeId === i.id && !s.success)?._count ?? 0 })) });
});
export const POST = api(async (req) => {
  const user = await requirePermission("qr.manage");
  const body = z.object({ label: z.string().min(2), kind: z.enum(["CHECKPOINT", "DESTINATION", "MISSION"]), destinationId: z.string().nullable().optional(), missionId: z.string().nullable().optional(), expiresAt: z.string().nullable().optional() }).parse(await req.json());
  if (!body.destinationId && !body.missionId) throw new HttpError(400, "Assign the QR code to a destination or a mission.");
  if (user.role === "PARTNER_ADMIN" && body.destinationId) { const d = await prisma.destination.findUnique({ where: { id: body.destinationId } }); if (d?.partnerId !== user.partnerId) throw new HttpError(403, "Not your venue."); }
  const qr = await prisma.qrCode.create({ data: { token: randomToken(18), label: body.label, kind: body.kind, destinationId: body.destinationId || null, missionId: body.missionId || null, expiresAt: body.expiresAt ? new Date(body.expiresAt) : null } });
  await audit(user.id, "CREATE_QR", "QrCode", qr.id, { label: qr.label });
  return ok({ qr }, { status: 201 });
});
