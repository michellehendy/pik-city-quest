import { api, ok } from "@/lib/api";
import { HttpError, requirePermission } from "@/lib/auth";
import { ENTITIES, modelClient } from "@/lib/admin/entities";
import { audit } from "@/lib/gamification";

type Ctx = { params: Promise<{ entity: string; id: string }> };
function def(entity: string) { const d = ENTITIES[entity]; if (!d) throw new HttpError(404, "Unknown entity"); return d; }

export const GET = api(async (_req, ctx: Ctx) => {
  const { entity, id } = await ctx.params; const d = def(entity);
  await requirePermission(d.permission);
  const item = await modelClient(d.model).findUnique({ where: { id }, include: d.include });
  if (!item) throw new HttpError(404, "Not found");
  if (entity === "users") delete item.passwordHash;
  return ok({ item });
});

export const PATCH = api(async (req, ctx: Ctx) => {
  const { entity, id } = await ctx.params; const d = def(entity);
  const user = await requirePermission(d.permission);
  const body = await req.json();
  const client = modelClient(d.model);
  const existing = await client.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "Not found");
  if (user.role === "PARTNER_ADMIN" && existing.partnerId && existing.partnerId !== user.partnerId) throw new HttpError(403, "Not your venue.");
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) if (!["id", "createdAt", "updatedAt", "_count", "passwordHash"].includes(k) && !(v && typeof v === "object" && !(v instanceof Date))) clean[k] = v;
  const merged = { ...existing, ...clean };
  for (const k of ["id", "createdAt", "updatedAt", "passwordHash", "externalId", "xpTotal", "pointsBalance", "streakDays", "lastActiveDate", "emailVerifiedAt", "lastLoginAt", "googleId", "avatarUrl", "dateOfBirth", "instagram", "notifPrefs", "sharePrefs", "language", "publicProfile", "createdById", "archivedAt"]) delete merged[k];
  let data = (d.schema.safeParse(merged).success ? d.schema.parse(merged) : clean) as Record<string, unknown>;
  if (d.beforeSave) data = d.beforeSave(data);
  if (entity === "users" && user.id === id && data.role !== user.role) throw new HttpError(400, "You cannot change your own role.");
  const item = await client.update({ where: { id }, data });
  await audit(user.id, `UPDATE_${entity.toUpperCase()}`, d.label, id, { changed: Object.keys(clean) });
  return ok({ item });
});

export const DELETE = api(async (_req, ctx: Ctx) => {
  const { entity, id } = await ctx.params; const d = def(entity);
  const user = await requirePermission(d.permission);
  const client = modelClient(d.model);
  // Soft-delete where history matters (quests, destinations, users, rewards) – history is never erased.
  if (["quests"].includes(entity)) await client.update({ where: { id }, data: { archivedAt: new Date(), status: "ARCHIVED" } });
  else if (["destinations", "rewards", "badges", "users", "missions", "challenges", "events", "partners", "transport"].includes(entity)) await client.update({ where: { id }, data: { isActive: false } });
  else await client.delete({ where: { id } });
  await audit(user.id, `ARCHIVE_${entity.toUpperCase()}`, d.label, id);
  return ok({ ok: true });
});
