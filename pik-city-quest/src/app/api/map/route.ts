import { api, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getActiveRuns } from "@/lib/queries";
import { parseJson } from "@/lib/utils";

export const GET = api(async () => {
  const user = await requireUser();
  const [areas, dests, routes, facilities, runs] = await Promise.all([
    prisma.area.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.destination.findMany({ where: { isActive: true }, include: { area: true, checkpoints: { where: { quest: { status: "PUBLISHED", archivedAt: null } }, include: { quest: { select: { id: true, slug: true, name: true } }, missions: { include: { mission: { select: { xp: true } } } } } }, missions: { where: { isActive: true }, select: { id: true, name: true, xp: true, type: true } } } }),
    prisma.transportRoute.findMany({ where: { isActive: true }, include: { stops: { orderBy: { order: "asc" } } } }),
    prisma.facility.findMany({ where: { lat: { not: null } } }),
    getActiveRuns(user.id),
  ]);
  const run = runs[0];
  const statusByDest: Record<string, string> = {};
  const activeQuestStops: Array<{ lat: number; lng: number; order: number; isStart: boolean; isEnd: boolean; name: string; status: string; checkpointId: string; missionId: string | null }> = [];
  if (run) {
    for (const cp of run.quest.checkpoints) {
      const st = run.checkpoints.find((c) => c.checkpointId === cp.id)?.status ?? "LOCKED";
      statusByDest[cp.destinationId] = st;
      activeQuestStops.push({ lat: cp.destination.lat, lng: cp.destination.lng, order: cp.order, isStart: cp.isStart, isEnd: cp.isEnd, name: cp.destination.name, status: st, checkpointId: cp.id, missionId: cp.missions[0]?.missionId ?? null });
    }
  }
  return ok({
    areas: areas.map((a) => ({ slug: a.slug, name: a.name, color: a.color, lat: a.centerLat, lng: a.centerLng, zoom: a.zoom })),
    destinations: dests.map((d) => ({ id: d.id, slug: d.slug, name: d.name, description: d.description, category: d.category, tags: parseJson<string[]>(d.tags, []), area: d.area.slug, areaName: d.area.name, lat: d.lat, lng: d.lng, image: d.coverImage, address: d.address, openingHours: d.openingHours, websiteUrl: d.websiteUrl, quests: Array.from(new Map(d.checkpoints.map((c) => [c.quest.id, { slug: c.quest.slug, name: c.quest.name }])).values()), missionCount: d.checkpoints.reduce((s, c) => s + c.missions.length, 0) + d.missions.length, xp: d.checkpoints.reduce((s, c) => s + c.missions.reduce((t, m) => t + (m.xpOverride ?? m.mission.xp), 0), 0) + d.missions.reduce((s, m) => s + m.xp, 0), questStatus: statusByDest[d.id] ?? null, standaloneMissions: d.missions })),
    routes: routes.map((r) => ({ id: r.id, operator: r.operator, code: r.code, name: r.name, category: r.category, color: r.color, notes: r.notes, polyline: parseJson<number[][]>(r.polyline, []), stops: r.stops.map((s) => ({ name: s.name, lat: s.lat, lng: s.lng })) })),
    facilities: facilities.map((f) => ({ id: f.id, name: f.name, type: f.type, lat: f.lat!, lng: f.lng!, address: f.address, openingHours: f.openingHours })),
    activeQuest: run ? { slug: run.quest.slug, name: run.quest.name, stops: activeQuestStops } : null,
  });
});
