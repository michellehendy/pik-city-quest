import QRCode from "qrcode";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";

/** Printable QR (PNG or SVG). Encodes a public URL carrying only the random token – never internal ids. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  await requirePermission("qr.manage");
  const { id } = await ctx.params;
  const qr = await prisma.qrCode.findUnique({ where: { id } });
  if (!qr) return new Response("Not found", { status: 404 });
  const url = new URL(req.url);
  const base = process.env.APP_URL || url.origin;
  const target = `${base}/qr/${qr.token}`;
  const format = url.searchParams.get("format") === "svg" ? "svg" : "png";
  if (format === "svg") return new Response(await QRCode.toString(target, { type: "svg", margin: 2, width: 600, color: { dark: "#06323c" } }), { headers: { "Content-Type": "image/svg+xml", "Content-Disposition": `inline; filename="qr-${qr.label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.svg"` } });
  const buf = await QRCode.toBuffer(target, { margin: 2, width: 1024, color: { dark: "#06323c" } });
  return new Response(new Uint8Array(buf), { headers: { "Content-Type": "image/png", "Content-Disposition": `inline; filename="qr-${qr.label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.png"` } });
}
