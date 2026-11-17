import { api, ok } from "@/lib/api";
import { HttpError, requirePermission } from "@/lib/auth";
import { ENTITIES, modelClient } from "@/lib/admin/entities";
import { audit } from "@/lib/gamification";

function def(entity: string) {
  const d = ENTITIES[entity];
  if (!d) throw new HttpError(404, "Unknown entity");
  return d;
}
function stripRelations(entity: string, data: Record<string, unknown>) {
  const out = { ...data };
  delete out.id; delete out.createdAt; delete out.updatedAt; delete out._count;
  for (const k of Object.keys(out)) if (out[k] && typeof out[k] === "object" && !(out[k] instanceof Date)) delete out[k];
  if (entity === "users") delete out.passwordHash;
  return out;
}

export const GET = api(async (req, ctx: { params: Promise<{ entity: string }> }) => {
  const { entity } = await ctx.params;
  const d = def(entity);
  // Partner / venue admins may read (not edit) destinations and missions – scoped to their own venues below.
  const user = await requirePermission(["destinations", "missions"].includes(entity) ? "venue.view" : d.permission);
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const take = Math.min(200, Number(url.searchParams.get("take") ?? 50));
  const where: Record<string, unknown> = {};
  if (q) where.OR = d.search.map((f) => ({ [f]: { contains: q } }));
  for (const [k, v] of url.searchParams.entries()) if (k.startsWith("f_") && v !== "") where[k.slice(2)] = v === "true" ? true : v === "false" ? false : v;
  if (user.role === "PARTNER_ADMIN" && entity === "destinations") where.partnerId = user.partnerId ?? "__none__";
  if (user.role === "PARTNER_ADMIN" && entity === "rewards") where.partnerId = user.partnerId ?? "__none__";
  if (user.role === "PARTNER_ADMIN" && entity === "missions") where.destination = { partnerId: user.partnerId ?? "__none__" };
  const client = modelClient(d.model);
  const [items, total] = await Promise.all([client.findMany({ where, orderBy: d.orderBy, include: d.include, skip: (page - 1) * take, take }), client.count({ where })]);
  if (entity === "users") for (const u of items) delete u.passwordHash;
  return ok({ items, total, page, take });
});

export const POST = api(async (req, ctx: { params: Promise<{ entity: string }> }) => {
  const { entity } = await ctx.params;
  const d = def(entity);
  const user = await requirePermission(d.permission);
  const raw = stripRelations(entity, await req.json());
  let data = d.schema.parse(raw) as Record<string, unknown>;
  if (d.beforeSave) data = d.beforeSave(data);
  const item = await modelClient(d.model).create({ data });
  await audit(user.id, `CREATE_${entity.toUpperCase()}`, d.label, item.id, { name: item.name ?? item.title ?? item.key });
  return ok({ item }, { status: 201 });
});
