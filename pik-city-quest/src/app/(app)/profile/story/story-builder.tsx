"use client";
import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Film, Play, Trash2, Share2, Download } from "lucide-react";
import { Button, EmptyState, Pill } from "@/components/ui";
import { postJson } from "@/components/ui/fetcher";
import { useToast } from "@/components/ui/toast";
import { cn, fmtDate } from "@/lib/utils";

type Memory = { id: string; type: string; url: string; caption: string; destination: string; date: string };
type Story = { id: string; title: string; items: Memory[]; createdAt: string };

function loadImg(src: string) { const safe = /^https?:\/\//.test(src) ? `/_next/image?url=${encodeURIComponent(src)}&w=1080&q=85` : src; return new Promise<HTMLImageElement | null>((res) => { const i = new window.Image(); i.crossOrigin = "anonymous"; i.onload = () => res(i); i.onerror = () => res(null); i.src = safe; }); }

/** Renders a short recap video (WebM) from the selected memories using canvas + MediaRecorder. */
async function renderRecap(items: Memory[], userName: string, onProgress: (p: number) => void): Promise<Blob | null> {
  if (typeof MediaRecorder === "undefined") return null;
  const W = 720, H = 1280; const c = document.createElement("canvas"); c.width = W; c.height = H; const ctx = c.getContext("2d")!;
  const stream = c.captureStream(30); const rec = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm" });
  const chunks: Blob[] = []; rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const imgs = await Promise.all(items.map((m) => (m.url ? loadImg(m.url) : Promise.resolve(null))));
  rec.start(200);
  const per = 1800; const start = performance.now();
  await new Promise<void>((resolve) => {
    function frame(now: number) {
      const t = now - start; const idx = Math.min(items.length, Math.floor(t / per));
      if (idx >= items.length + 1) return resolve();
      const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, "#075260"); g.addColorStop(1, "#12a3b8"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      if (idx < items.length) {
        const m = items[idx]; const img = imgs[idx]; const local = (t - idx * per) / per; const zoom = 1 + local * 0.08;
        if (img) { const s = Math.max(W / img.width, (H * 0.68) / img.height) * zoom; ctx.save(); ctx.globalAlpha = Math.min(1, local * 4); ctx.drawImage(img, (W - img.width * s) / 2, 120 + (H * 0.68 - img.height * s) / 2, img.width * s, img.height * s); ctx.restore(); }
        else { ctx.font = "bold 220px system-ui,'Apple Color Emoji'"; ctx.textAlign = "center"; ctx.fillText(m.caption.split(" ")[0], W / 2, H / 2); }
        const og = ctx.createLinearGradient(0, H * 0.55, 0, H); og.addColorStop(0, "rgba(6,50,60,0)"); og.addColorStop(1, "rgba(6,50,60,.95)"); ctx.fillStyle = og; ctx.fillRect(0, 0, W, H);
        ctx.textAlign = "left"; ctx.fillStyle = "#f8b818"; ctx.font = "900 28px Montserrat, system-ui"; ctx.fillText(m.destination.toUpperCase(), 60, H - 260);
        ctx.fillStyle = "#fff"; ctx.font = "900 52px Montserrat, system-ui"; ctx.fillText(m.caption.slice(0, 26), 60, H - 195);
        ctx.fillStyle = "rgba(255,255,255,.8)"; ctx.font = "600 26px Montserrat, system-ui"; ctx.fillText(fmtDate(m.date), 60, H - 150);
      } else { ctx.textAlign = "center"; ctx.fillStyle = "#fff"; ctx.font = "900 64px Montserrat, system-ui"; ctx.fillText("MY PIK STORY", W / 2, H / 2 - 40); ctx.font = "700 34px Montserrat, system-ui"; ctx.fillText(userName, W / 2, H / 2 + 30); }
      ctx.textAlign = "center"; ctx.fillStyle = "#fff"; ctx.font = "900 30px Montserrat, system-ui"; ctx.fillText("PIK CITY QUEST · PIK TOURISM BOARD", W / 2, H - 60);
      onProgress(Math.min(1, t / ((items.length + 1) * per)));
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });
  await new Promise<void>((r) => { rec.onstop = () => r(); rec.stop(); });
  return new Blob(chunks, { type: "video/webm" });
}

export function StoryBuilder({ memories, stories, userName }: { memories: Memory[]; stories: Story[]; userName: string }) {
  const [picked, setPicked] = useState<Memory[]>([]);
  const [title, setTitle] = useState("My PIK Story");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [video, setVideo] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const toggle = (m: Memory) => setPicked((p) => (p.find((x) => x.id === m.id) ? p.filter((x) => x.id !== m.id) : [...p, m]));
  const move = (i: number, d: number) => setPicked((p) => { const n = [...p]; const j = i + d; if (j < 0 || j >= n.length) return p; [n[i], n[j]] = [n[j], n[i]]; return n; });
  async function makeVideo() { setBusy(true); setVideo(null); try { const b = await renderRecap(picked, userName, setProgress); if (!b) { toast("Video recording isn't supported in this browser — use the shareable story instead.", "error"); return; } setVideo(URL.createObjectURL(b)); } finally { setBusy(false); } }
  async function save() { setBusy(true); try { await postJson("/api/stories", { title, items: picked }); toast("Story saved to your journal", "success"); setPicked([]); router.refresh(); } catch (e) { toast((e as Error).message, "error"); } finally { setBusy(false); } }
  async function share(s: Story) { const text = `${s.title} — ${s.items.length} memories from PIK 🧭 #PIKCityQuest`; try { if (navigator.share) await navigator.share({ title: s.title, text }); else { await navigator.clipboard.writeText(text); toast("Copied!", "success"); } } catch { /* cancelled */ } }
  if (!memories.length) return <EmptyState icon="📖" title="Your story starts with a first mission" body="Photos, stamps, badges and quest completions are collected here into a personal PIK travel journal." action={<Button href="/quests">Find a quest</Button>} />;
  return (
    <div className="space-y-5">
      <section>
        <div className="section-title px-1 mb-1">Your memories</div><p className="text-xs text-ink-soft px-1 mb-3">Tap to select photos, stamps and achievements, then arrange them into a recap.</p>
        <div className="grid grid-cols-3 gap-2">
          {memories.map((m) => { const idx = picked.findIndex((x) => x.id === m.id); return (
            <button key={m.id} onClick={() => toggle(m)} className={cn("relative aspect-square rounded-2xl overflow-hidden bg-teal-50 text-left", idx >= 0 && "ring-4 ring-sun-500")}>
              {m.url ? (m.type === "video" ? <video src={m.url} className="w-full h-full object-cover" muted /> : <Image src={m.url} alt="" fill sizes="33vw" className="object-cover" />) : <div className="w-full h-full flex items-center justify-center text-4xl">{m.caption.split(" ")[0]}</div>}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/80 to-transparent p-1.5 text-white"><div className="text-[10px] font-bold line-clamp-1">{m.caption}</div><div className="text-[9px] text-white/80 line-clamp-1">{m.destination} · {fmtDate(m.date)}</div></div>
              {m.type === "video" && <Play className="absolute top-1.5 right-1.5 size-4 text-white" />}
              {idx >= 0 && <span className="absolute top-1.5 left-1.5 size-6 rounded-full bg-sun-500 text-ink text-xs font-black flex items-center justify-center">{idx + 1}</span>}
            </button>); })}
        </div>
      </section>
      {picked.length > 0 && (
        <section className="card p-4 space-y-3">
          <input className="input font-bold" value={title} onChange={(e) => setTitle(e.target.value)} />
          <div className="space-y-1.5">{picked.map((m, i) => <div key={m.id} className="flex items-center gap-2 rounded-xl bg-slate-50 px-2 py-1.5 text-xs"><span className="w-5 font-black text-ink-soft">{i + 1}</span><span className="flex-1 font-bold truncate">{m.caption} <span className="text-ink-soft font-medium">· {m.destination}</span></span><button onClick={() => move(i, -1)} className="size-7 rounded-full bg-white flex items-center justify-center"><ArrowUp className="size-3" /></button><button onClick={() => move(i, 1)} className="size-7 rounded-full bg-white flex items-center justify-center"><ArrowDown className="size-3" /></button></div>)}</div>
          {busy && progress > 0 && <div className="h-2 rounded-full bg-teal-100 overflow-hidden"><div className="h-full bg-teal-600" style={{ width: `${progress * 100}%` }} /></div>}
          {video && <div className="space-y-2"><video ref={videoRef} src={video} controls className="w-full rounded-2xl bg-black max-h-80" /><a href={video} download={`pik-story-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.webm`} className="btn btn-ghost w-full"><Download className="size-4" />Download recap video</a></div>}
          <div className="grid grid-cols-2 gap-2"><Button onClick={makeVideo} loading={busy} variant="sun"><Film className="size-4" />Create recap video</Button><Button onClick={save} loading={busy}>Save story</Button></div>
        </section>
      )}
      {!!stories.length && (
        <section><div className="section-title px-1 mb-2">Saved stories</div><div className="space-y-2">{stories.map((s) => <div key={s.id} className="card p-3 flex items-center gap-3"><div className="flex -space-x-2">{s.items.slice(0, 3).map((m, i) => <div key={i} className="relative size-10 rounded-full overflow-hidden border-2 border-white bg-teal-100 flex items-center justify-center text-sm">{m.url ? <Image src={m.url} alt="" fill sizes="40px" className="object-cover" /> : m.caption.split(" ")[0]}</div>)}</div><div className="flex-1 min-w-0"><div className="font-extrabold text-sm text-ink truncate">{s.title}</div><div className="text-[11px] text-ink-soft">{s.items.length} memories · {fmtDate(s.createdAt)}</div></div><Pill tone="gray">journal</Pill><button onClick={() => share(s)} className="size-8 rounded-full bg-teal-50 text-teal-800 flex items-center justify-center" aria-label="Share"><Share2 className="size-4" /></button><button onClick={async () => { await fetch("/api/stories", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: s.id }) }); router.refresh(); }} className="size-8 rounded-full bg-rose-50 text-rose-700 flex items-center justify-center" aria-label="Delete"><Trash2 className="size-4" /></button></div>)}</div></section>
      )}
    </div>
  );
}
