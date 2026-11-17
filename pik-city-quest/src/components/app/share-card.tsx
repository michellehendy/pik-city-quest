"use client";
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Download, Share2, Camera, MessageCircle, Music2 } from "lucide-react";
import { Button } from "@/components/ui";
import { useToast } from "@/components/ui/toast";

export type ShareCardData = {
  template: "quest" | "mission" | "badge" | "seasonal";
  title: string; subtitle: string; userName: string; avatarUrl?: string | null; date: string; stamps: string[]; xp: number; code: string; shareUrl: string; coverUrl?: string | null; badgeEmoji?: string;
};

function loadImage(src: string): Promise<HTMLImageElement | null> {
  // Remote covers are fetched through Next's same-origin image optimizer so the canvas stays exportable (no CORS taint).
  const safe = /^https?:\/\//.test(src) ? `/_next/image?url=${encodeURIComponent(src)}&w=1080&q=85` : src;
  return new Promise((res) => { const img = new window.Image(); img.crossOrigin = "anonymous"; img.onload = () => res(img); img.onerror = () => res(null); img.src = safe; });
}
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number, maxLines = 3) {
  const words = text.split(" "); let line = ""; let lines = 0;
  for (const w of words) { const t = line ? `${line} ${w}` : w; if (ctx.measureText(t).width > maxW && line) { ctx.fillText(line, x, y); y += lh; line = w; if (++lines >= maxLines - 1) { line += "…"; break; } } else line = t; }
  ctx.fillText(line, x, y); return y + lh;
}

export async function renderShareCard(d: ShareCardData, format: "story" | "feed"): Promise<HTMLCanvasElement> {
  const W = 1080, H = format === "story" ? 1920 : 1080;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const ctx = c.getContext("2d")!;
  const theme = d.template === "seasonal" ? ["#5b21b6", "#087088"] : d.template === "badge" ? ["#06323c", "#0a86a0"] : ["#075260", "#12a3b8"];
  const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, theme[0]); g.addColorStop(1, theme[1]); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const cover = d.coverUrl ? await loadImage(d.coverUrl) : null;
  const coverH = format === "story" ? 860 : 440;
  if (cover) { try { const s = Math.max(W / cover.width, coverH / cover.height); ctx.save(); roundRect(ctx, 60, 60, W - 120, coverH, 48); ctx.clip(); ctx.drawImage(cover, 60 + (W - 120 - cover.width * s) / 2, 60 + (coverH - cover.height * s) / 2, cover.width * s, cover.height * s); ctx.restore(); } catch { /* tainted */ } }
  else { ctx.save(); roundRect(ctx, 60, 60, W - 120, coverH, 48); ctx.fillStyle = "rgba(255,255,255,.12)"; ctx.fill(); ctx.restore(); }
  // gradient overlay on cover bottom
  const og = ctx.createLinearGradient(0, 60 + coverH * 0.45, 0, 60 + coverH); og.addColorStop(0, "rgba(6,50,60,0)"); og.addColorStop(1, "rgba(6,50,60,.9)"); ctx.save(); roundRect(ctx, 60, 60, W - 120, coverH, 48); ctx.clip(); ctx.fillStyle = og; ctx.fillRect(60, 60, W - 120, coverH); ctx.restore();
  // badge / emoji
  ctx.font = "bold 150px system-ui, 'Apple Color Emoji','Segoe UI Emoji'"; ctx.textAlign = "center"; ctx.fillText(d.badgeEmoji ?? "🏆", W / 2, 60 + coverH / 2 + 50);
  // titles
  ctx.textAlign = "left"; ctx.fillStyle = "#f8b818"; ctx.font = "900 34px Montserrat, system-ui"; ctx.fillText(d.template === "quest" ? "I COMPLETED THE" : d.template === "mission" ? "MISSION COMPLETE" : d.template === "badge" ? "NEW BADGE UNLOCKED" : "SPECIAL ACHIEVEMENT", 110, 60 + coverH - 150);
  ctx.fillStyle = "#fff"; ctx.font = "900 70px Montserrat, system-ui"; wrap(ctx, d.title.toUpperCase(), 110, 60 + coverH - 70, W - 220, 78, 2);
  let y = 60 + coverH + 90;
  ctx.fillStyle = "#fff"; ctx.font = "800 46px Montserrat, system-ui"; ctx.fillText(d.subtitle, 110, y); y += 70;
  ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.font = "600 32px Montserrat, system-ui"; ctx.fillText(`${d.userName} · ${d.date} · ${d.xp} XP`, 110, y); y += 70;
  // stamps
  if (d.stamps.length) {
    ctx.font = "700 26px Montserrat, system-ui"; let x = 110;
    for (const s of d.stamps.slice(0, 7)) { const tw = ctx.measureText(s).width + 48; if (x + tw > W - 110) { x = 110; y += 66; } roundRect(ctx, x, y - 38, tw, 54, 27); ctx.fillStyle = "rgba(255,255,255,.16)"; ctx.fill(); ctx.strokeStyle = "rgba(255,255,255,.5)"; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = "#fff"; ctx.fillText(`✓ ${s}`, x + 24, y); x += tw + 14; }
    y += 80;
  }
  // QR + brand footer
  const qrSize = 190; const fy = H - 60 - qrSize - 50;
  roundRect(ctx, 60, fy - 30, W - 120, qrSize + 110, 40); ctx.fillStyle = "rgba(255,255,255,.95)"; ctx.fill();
  const qr = await QRCode.toDataURL(d.shareUrl, { margin: 1, width: qrSize, color: { dark: "#06323c", light: "#ffffff" } });
  const qrImg = await loadImage(qr); if (qrImg) ctx.drawImage(qrImg, W - 60 - 40 - qrSize, fy + 10, qrSize, qrSize);
  ctx.fillStyle = "#087088"; ctx.font = "900 40px Montserrat, system-ui"; ctx.fillText("PIK CITY QUEST", 110, fy + 50);
  ctx.fillStyle = "#0f2a33"; ctx.font = "800 26px Montserrat, system-ui"; ctx.fillText("PIK TOURISM BOARD", 110, fy + 92);
  ctx.fillStyle = "#3d5560"; ctx.font = "600 22px Montserrat, system-ui"; ctx.fillText("Scan to view this achievement", 110, fy + 140); ctx.fillText(`Code ${d.code} · piktourism.com/city-quest`, 110, fy + 172);
  return c;
}

export function ShareCard({ data }: { data: ShareCardData }) {
  const [format, setFormat] = useState<"story" | "feed">("story");
  const [url, setUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { toast } = useToast();
  useEffect(() => { let alive = true; renderShareCard(data, format).then((c) => { if (!alive) return; canvasRef.current = c; setUrl(c.toDataURL("image/png")); }); return () => { alive = false; }; }, [data, format]);
  async function blob() { return new Promise<Blob>((res) => canvasRef.current!.toBlob((b) => res(b!), "image/png")); }
  async function share() {
    try {
      const b = await blob(); const file = new File([b], `pik-city-quest-${data.code}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: "PIK CITY QUEST", text: `${data.title} — ${data.subtitle}` }); return; }
      if (navigator.share) { await navigator.share({ title: "PIK CITY QUEST", text: `${data.title} — ${data.subtitle}`, url: data.shareUrl }); return; }
      download(); toast("Image downloaded — share it from your gallery.", "info");
    } catch { /* cancelled */ }
  }
  function download() { if (!url) return; const a = document.createElement("a"); a.href = url; a.download = `pik-city-quest-${data.code}-${format}.png`; a.click(); }
  const wa = `https://wa.me/?text=${encodeURIComponent(`${data.title} — ${data.subtitle} 🧭 ${data.shareUrl}`)}`;
  return (
    <div className="space-y-3">
      <div className="flex justify-center gap-2">{(["story", "feed"] as const).map((f) => <button key={f} onClick={() => setFormat(f)} className={`pill ${format === f ? "bg-teal-800 text-white" : "bg-teal-100 text-teal-800"}`}>{f === "story" ? "Instagram Story 9:16" : "Feed / WhatsApp 1:1"}</button>)}</div>
      <div className="mx-auto rounded-2xl overflow-hidden shadow-float bg-ink" style={{ maxWidth: format === "story" ? 260 : 360 }}>{url ? <img src={url} alt="Achievement card" className="w-full" /> : <div className="skeleton" style={{ height: format === "story" ? 462 : 360 }} />}</div>
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={share} variant="sun"><Share2 className="size-4" />Share</Button>
        <Button onClick={download} variant="ghost"><Download className="size-4" />Download</Button>
        <a className="btn btn-ghost" href={wa} target="_blank" rel="noreferrer"><MessageCircle className="size-4" />WhatsApp</a>
        <Button onClick={() => { download(); toast("Saved! Open Instagram / TikTok and post from your gallery.", "info"); }} variant="ghost"><Camera className="size-4" /><Music2 className="size-4" />IG / TikTok</Button>
      </div>
    </div>
  );
}
