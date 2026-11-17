import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
(async () => {
  const qrs = await p.qrCode.findMany({ include: { destination: true } });
  const quest = await p.quest.findUnique({ where: { slug: "pik-discovery-quest" }, include: { checkpoints: { orderBy: { order: "asc" }, include: { destination: true, missions: { include: { mission: { include: { requirements: true } } } } } } } });
  const out = { qr: Object.fromEntries(qrs.map((q) => [q.destination?.name ?? q.label, q.token])), questId: quest!.id, checkpoints: quest!.checkpoints.map((c) => ({ id: c.id, dest: c.destination.name, lat: c.destination.lat, lng: c.destination.lng, missions: c.missions.map((m) => ({ id: m.missionId, name: m.mission.name, mandatory: m.isMandatory, reqs: m.mission.requirements.map((r) => ({ id: r.id, type: r.type, config: JSON.parse(r.config) })) })) })) };
  console.log(JSON.stringify(out));
  await p.$disconnect();
})();
