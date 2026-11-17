import { readFile, stat } from "fs/promises";
import { resolveMedia } from "@/lib/storage";

const MIME: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", heic: "image/heic", mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime" };

export async function GET(_req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const p = resolveMedia(path);
  if (!p) return new Response("Not found", { status: 404 });
  try {
    await stat(p);
    const buf = await readFile(p);
    const ext = p.split(".").pop()?.toLowerCase() ?? "";
    return new Response(new Uint8Array(buf), { headers: { "Content-Type": MIME[ext] ?? "application/octet-stream", "Cache-Control": "private, max-age=86400" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
