import { z } from "zod";
import { api, ok, rateLimit } from "@/lib/api";
import { HttpError, requireUser } from "@/lib/auth";
import { askTauPik, taupikMode } from "@/lib/taupik";
import { prisma } from "@/lib/db";
import { parseJson } from "@/lib/utils";

export const POST = api(async (req) => {
  const user = await requireUser();
  if (!rateLimit(`${user.id}:taupik`, 30)) throw new HttpError(429, "TauPIK needs a short breather — try again in a minute.");
  const { message } = z.object({ message: z.string().trim().min(1).max(1000) }).parse(await req.json());
  const out = await askTauPik(user.id, message);
  return ok(out);
});

export const GET = api(async () => {
  const user = await requireUser();
  const rows = await prisma.chatMessage.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" }, take: 60 });
  const slugs = Array.from(new Set(rows.flatMap((r) => parseJson<{ cards?: string[] }>(r.meta, {}).cards ?? [])));
  const dests = slugs.length ? await prisma.destination.findMany({ where: { slug: { in: slugs } }, include: { area: true } }) : [];
  const cardMap = Object.fromEntries(dests.map((d) => [d.slug, { slug: d.slug, name: d.name, area: d.area.name, category: d.category, description: d.description, image: d.coverImage, websiteUrl: d.websiteUrl, lat: d.lat, lng: d.lng, openingHours: d.openingHours }]));
  return ok({ mode: taupikMode(), messages: rows.map((r) => { const meta = parseJson<{ cards?: string[]; mapFocus?: unknown; links?: unknown }>(r.meta, {}); return { id: r.id, role: r.role, content: r.content, cards: (meta.cards ?? []).map((s) => cardMap[s]).filter(Boolean), mapFocus: meta.mapFocus ?? null, links: meta.links ?? [] }; }) });
});

export const DELETE = api(async () => {
  const user = await requireUser();
  await prisma.chatMessage.deleteMany({ where: { userId: user.id } });
  return ok({ ok: true });
});
