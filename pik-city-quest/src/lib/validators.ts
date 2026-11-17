import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(60),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9_.]{3,24}$/, "Username: 3–24 letters, numbers, _ or .").optional().or(z.literal("")),
  instagram: z.string().trim().max(40).optional().or(z.literal("")),
  dateOfBirth: z.string().optional().or(z.literal("")),
});
export const loginSchema = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1) });
export const geoSchema = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180), accuracyM: z.number().min(0).optional() }).nullable().optional();
export const profileSchema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9_.]{3,24}$/, "Username: 3–24 letters, numbers, _ or .").optional(),
  instagram: z.string().trim().max(40).nullable().optional(),
  dateOfBirth: z.string().nullable().optional(),
  publicProfile: z.boolean().optional(),
  language: z.enum(["en", "id"]).optional(),
  notifPrefs: z.record(z.string(), z.boolean()).optional(),
  sharePrefs: z.record(z.string(), z.boolean()).optional(),
});
