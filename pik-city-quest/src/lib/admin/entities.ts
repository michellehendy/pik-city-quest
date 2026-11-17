import { z } from "zod";
import { prisma } from "@/lib/db";
import type { Permission } from "@/lib/constants";
import { slugify } from "@/lib/utils";

const jsonString = z.string().refine((s) => { try { JSON.parse(s); return true; } catch { return false; } }, "Must be valid JSON");
const optStr = z.string().trim().optional().nullable().transform((v) => (v === "" ? null : v ?? null));
const optNum = z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().nullable());
const optDate = z.preprocess((v) => (v === "" || v == null ? null : new Date(String(v))), z.date().nullable());
const bool = z.preprocess((v) => v === true || v === "true" || v === "on", z.boolean());

export type EntityDef = {
  model: string; permission: Permission; schema: z.ZodTypeAny; search: string[]; orderBy: Record<string, "asc" | "desc">; include?: Record<string, unknown>; softDelete?: boolean;
  beforeSave?: (data: Record<string, unknown>) => Record<string, unknown>; label: string;
};

export const ENTITIES: Record<string, EntityDef> = {
  destinations: {
    model: "destination", label: "Destination", permission: "destinations.manage", search: ["name", "address", "category"], orderBy: { name: "asc" }, include: { area: true, _count: { select: { checkpoints: true, missions: true } } },
    schema: z.object({ name: z.string().min(2), slug: optStr, category: z.string(), areaId: z.string(), description: z.string().min(2), longDescription: optStr, address: optStr, lat: z.coerce.number(), lng: z.coerce.number(), gpsRadiusM: z.coerce.number().int().min(10).max(2000).default(100), coverImage: optStr, gallery: jsonString.default("[]"), categories: jsonString.default("[]"), tags: jsonString.default("[]"), openingHours: optStr, phone: optStr, websiteUrl: optStr, gmapUrl: optStr, partnerId: optStr, isActive: bool.default(true), isSample: bool.default(false) }),
    beforeSave: (d) => ({ ...d, slug: d.slug || slugify(String(d.name)) }),
  },
  rewards: {
    model: "reward", label: "Reward", permission: "rewards.manage", search: ["name", "partnerName"], orderBy: { createdAt: "desc" }, include: { quest: { select: { name: true } }, badge: { select: { name: true } }, _count: { select: { userRewards: true } } },
    schema: z.object({ name: z.string().min(2), partnerName: z.string().min(1), partnerId: optStr, type: z.string(), description: z.string().min(2), imageUrl: optStr, terms: optStr, instructions: optStr, issuance: z.string(), questId: optStr, badgeId: optStr, pointsCost: optNum, voucherPrefix: z.string().default("PIK"), validDays: z.coerce.number().int().min(1).default(30), expiresAt: optDate, totalLimit: optNum, perUserLimit: z.coerce.number().int().min(1).default(1), isActive: bool.default(true), isSample: bool.default(false) }),
  },
  badges: {
    model: "badge", label: "Badge", permission: "badges.manage", search: ["name", "description"], orderBy: { sortOrder: "asc" }, include: { _count: { select: { users: true } } },
    schema: z.object({ name: z.string().min(2), slug: optStr, description: z.string().min(2), category: z.string(), rarity: z.string(), xpBonus: z.coerce.number().int().min(0).default(25), icon: z.string().min(1), color: z.string().default("#087088"), imageUrl: optStr, criteria: jsonString.default('{"type":"MANUAL"}'), relatedDestinationId: optStr, relatedQuestId: optStr, relatedEventId: optStr, isActive: bool.default(true), sortOrder: z.coerce.number().int().default(0) }),
    beforeSave: (d) => ({ ...d, slug: d.slug || slugify(String(d.name)) }),
  },
  levels: { model: "level", label: "Level", permission: "levels.manage", search: ["name"], orderBy: { order: "asc" }, schema: z.object({ order: z.coerce.number().int().min(1), name: z.string().min(2), minXp: z.coerce.number().int().min(0), icon: z.string().default("⭐"), color: z.string().default("#087088"), description: optStr }) },
  xpRules: { model: "xpRule", label: "XP rule", permission: "settings.manage", search: ["key", "label"], orderBy: { key: "asc" }, schema: z.object({ key: z.string().min(2).toUpperCase(), label: z.string().min(2), amount: z.coerce.number().int(), description: optStr }) },
  challenges: { model: "challenge", label: "Challenge", permission: "quests.manage", search: ["title"], orderBy: { cadence: "asc" }, include: { destination: { select: { name: true } }, mission: { select: { name: true } }, _count: { select: { users: true } } }, schema: z.object({ title: z.string().min(2), description: z.string().min(2), cadence: z.string(), difficulty: z.string().default("EASY"), xp: z.coerce.number().int().min(0).default(30), missionId: optStr, destinationId: optStr, startsAt: optDate, endsAt: optDate, mysteryReward: bool.default(false), isActive: bool.default(true) }) },
  events: { model: "event", label: "Event", permission: "destinations.manage", search: ["title", "location"], orderBy: { startDate: "desc" }, include: { destination: { select: { name: true } } }, schema: z.object({ title: z.string().min(2), category: z.string().default("Community"), startDate: z.coerce.date(), endDate: z.coerce.date(), startTime: optStr, endTime: optStr, location: optStr, destinationId: optStr, url: optStr, imageUrl: optStr, excerpt: optStr, description: optStr, isActive: bool.default(true) }) },
  partners: { model: "partner", label: "Partner", permission: "rewards.manage", search: ["name"], orderBy: { name: "asc" }, include: { _count: { select: { users: true, destinations: true, rewards: true } } }, schema: z.object({ name: z.string().min(2), contact: optStr, logoUrl: optStr, description: optStr, isActive: bool.default(true) }) },
  transport: { model: "transportRoute", label: "Transport route", permission: "destinations.manage", search: ["operator", "code", "name"], orderBy: { operator: "asc" }, include: { _count: { select: { stops: true } } }, schema: z.object({ operator: z.string().min(1), code: z.string().min(1), category: z.string(), name: z.string().min(2), color: z.string().default("#087088"), imageUrl: optStr, isActive: bool.default(true), notes: optStr, polyline: jsonString.default("[]") }) },
  facilities: { model: "facility", label: "Facility", permission: "destinations.manage", search: ["name", "type"], orderBy: { type: "asc" }, schema: z.object({ name: z.string().min(2), type: z.string(), address: optStr, lat: optNum, lng: optNum, phone: optStr, openingHours: optStr, gmapUrl: optStr }) },
  users: { model: "user", label: "User", permission: "users.manage", search: ["name", "email", "username"], orderBy: { createdAt: "desc" }, include: { partner: { select: { name: true } }, _count: { select: { questRuns: true, badges: true } } }, schema: z.object({ name: z.string().min(2), username: z.string().regex(/^[a-z0-9_.]{3,24}$/), email: z.string().email(), role: z.string(), partnerId: optStr, isActive: bool.default(true) }) },
  areas: { model: "area", label: "Area", permission: "destinations.manage", search: ["name"], orderBy: { sortOrder: "asc" }, schema: z.object({ slug: z.string(), name: z.string(), description: optStr, color: z.string(), centerLat: z.coerce.number(), centerLng: z.coerce.number(), zoom: z.coerce.number().int().default(15), sortOrder: z.coerce.number().int().default(0) }) },
  missions: { model: "mission", label: "Mission", permission: "missions.manage", search: ["name", "description"], orderBy: { createdAt: "desc" }, include: { destination: { select: { name: true } }, requirements: { orderBy: { order: "asc" } }, _count: { select: { checkpoints: true, submissions: true } } }, schema: z.object({}) },
  quests: { model: "quest", label: "Quest", permission: "quests.manage", search: ["name", "description"], orderBy: { sortOrder: "asc" }, include: { _count: { select: { checkpoints: true, runs: true } } }, schema: z.object({}) },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const modelClient = (name: string) => (prisma as any)[name];
