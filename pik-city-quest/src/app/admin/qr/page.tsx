import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { QrAdmin } from "./qr-admin";
export const dynamic = "force-dynamic";
export default async function QrPage() {
  const user = await requirePermission("qr.manage");
  const [destinations, missions] = await Promise.all([prisma.destination.findMany({ where: { isActive: true, ...(user.role === "PARTNER_ADMIN" ? { partnerId: user.partnerId ?? "__none__" } : {}) }, select: { id: true, name: true }, orderBy: { name: "asc" } }), prisma.mission.findMany({ where: { isActive: true, requirements: { some: { type: "QR" } } }, select: { id: true, name: true }, orderBy: { name: "asc" } })]);
  return <QrAdmin destinations={destinations} missions={missions} />;
}
