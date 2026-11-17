import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { MissionsAdmin } from "./missions-admin";
export const dynamic = "force-dynamic";
export default async function MissionsPage() {
  await requirePermission("venue.view");
  const destinations = await prisma.destination.findMany({ where: { isActive: true }, select: { id: true, name: true, gpsRadiusM: true }, orderBy: { name: "asc" } });
  const events = await prisma.event.findMany({ where: { isActive: true }, select: { id: true, title: true }, orderBy: { startDate: "desc" } });
  return <MissionsAdmin destinations={destinations} events={events} />;
}
