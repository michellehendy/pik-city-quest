import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { HttpError } from "./auth";

type Handler<T> = (req: Request, ctx: T) => Promise<Response>;

/** Wraps a route handler with uniform error handling. */
export function api<T>(handler: Handler<T>): Handler<T> {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (e) {
      if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
      if (e instanceof ZodError) return NextResponse.json({ error: e.issues.map((i) => i.message).join(", "), issues: e.issues }, { status: 400 });
      console.error(e);
      const msg = e instanceof Error ? e.message : "Something went wrong";
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  };
}

export const ok = (data: unknown, init?: ResponseInit) => NextResponse.json(data, init);

// Very small in-memory rate limiter (per process). Replace with Redis in multi-instance deployments.
const buckets = new Map<string, { count: number; reset: number }>();
export function rateLimit(key: string, limit = 30, windowMs = 60_000) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  b.count += 1;
  return b.count <= limit;
}
export function clientKey(req: Request, suffix: string) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
  return `${ip}:${suffix}`;
}
