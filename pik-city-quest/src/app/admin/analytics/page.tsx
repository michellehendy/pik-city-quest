import { prisma } from "@/lib/db";
import { Analytics } from "./analytics";
export const dynamic = "force-dynamic";
export default async function AnalyticsPage() {
  const [quests, areas, dests] = await Promise.all([prisma.quest.findMany({ where: { archivedAt: null }, select: { id: true, name: true }, orderBy: { sortOrder: "asc" } }), prisma.area.findMany({ orderBy: { sortOrder: "asc" } }), prisma.destination.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } })]);
  return <Analytics quests={quests} areas={areas.map((a) => ({ slug: a.slug, name: a.name }))} destinations={dests} />;
}
