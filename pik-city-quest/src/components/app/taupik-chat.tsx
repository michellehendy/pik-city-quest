"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Send, Sparkles, MapPin, ExternalLink, Trash2 } from "lucide-react";
import { getJson, postJson } from "@/components/ui/fetcher";
import { Pill, Spinner } from "@/components/ui";
import { cn } from "@/lib/utils";

type Card = { slug: string; name: string; area: string; category: string; description: string; image: string | null; websiteUrl: string | null; lat: number; lng: number };
type Msg = { id: string; role: "user" | "assistant"; content: string; cards?: Card[]; mapFocus?: { lat: number; lng: number; label: string } | null; links?: Array<{ label: string; href: string }> };

const SUGGESTIONS = ["Where should I go in PIK?", "Best places for families?", "Where can I find halal restaurants?", "Where can I find a pagoda or place of worship?", "How do I get to Aloha from Pantjoran?", "What events are happening this weekend?", "Which destinations are pet-friendly?", "What can I do in PIK2?", "Recommend a one-day itinerary"];

export function TauPikChat({ compact, context }: { compact?: boolean; context?: Record<string, string> }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [mode, setMode] = useState<"live" | "demo">("demo");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { getJson<{ mode: "live" | "demo"; messages: Msg[] }>("/api/taupik/chat").then((r) => { setMode(r.mode); setMsgs(r.messages); setLoaded(true); }).catch(() => setLoaded(true)); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs, busy]);

  async function send(text: string) {
    const t = text.trim(); if (!t || busy) return;
    setInput(""); setBusy(true);
    setMsgs((m) => [...m, { id: `u${Date.now()}`, role: "user", content: t }]);
    try {
      const r = await postJson<{ reply: string; cards: Card[]; mode: "live" | "demo"; mapFocus?: Msg["mapFocus"]; links?: Msg["links"] }>("/api/taupik/chat", { message: t, context });
      setMode(r.mode);
      setMsgs((m) => [...m, { id: `a${Date.now()}`, role: "assistant", content: r.reply, cards: r.cards, mapFocus: r.mapFocus, links: r.links }]);
    } catch (e) { setMsgs((m) => [...m, { id: `e${Date.now()}`, role: "assistant", content: `Sorry — ${(e as Error).message}` }]); }
    finally { setBusy(false); }
  }
  async function clear() { await fetch("/api/taupik/chat", { method: "DELETE" }); setMsgs([]); }
  const suggestions = context?.questSlug ? ["How do I get to the next checkpoint?", "What's my current mission?", ...SUGGESTIONS.slice(0, 4)] : SUGGESTIONS;

  return (
    <div className={cn("flex flex-col", compact ? "h-[70vh]" : "h-[calc(100vh-7.5rem-var(--nav-h))] lg:h-[calc(100vh-6rem)]")}>
      <div className="flex items-center gap-2 pb-3">
        <div className="size-9 rounded-full bg-gradient-to-br from-teal-700 to-teal-500 text-white flex items-center justify-center"><Sparkles className="size-4" /></div>
        <div className="flex-1"><div className="text-sm font-black text-ink">TauPIK</div><div className="text-[10px] font-semibold text-ink-soft">PIK's AI tourism assistant</div></div>
        <Pill tone={mode === "live" ? "green" : "sun"}>{mode === "live" ? "Live · Claude" : "Demo mode"}</Pill>
        {msgs.length > 0 && <button onClick={clear} className="size-8 rounded-full bg-slate-100 flex items-center justify-center" aria-label="Clear chat"><Trash2 className="size-3.5" /></button>}
      </div>
      {mode === "demo" && <div className="mb-2 rounded-xl bg-sun-100 text-sun-600 text-[11px] font-semibold px-3 py-2">Demo mode: answers are retrieved from the PIK destination database. Set <code>ANTHROPIC_API_KEY</code> to enable the live AI assistant, or point <code>src/lib/taupik.ts</code> at the official TauPIK API.</div>}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {!loaded && <div className="flex justify-center py-6"><Spinner /></div>}
        {loaded && msgs.length === 0 && (
          <div className="rounded-2xl bg-teal-50 p-4">
            <div className="font-extrabold text-ink">Hi! I'm TauPIK 👋</div>
            <p className="text-sm text-ink-soft mt-1">Ask me where to go, what to eat, which events are on, or how to reach your next checkpoint.</p>
          </div>
        )}
        {msgs.map((m) => (
          <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[88%] space-y-2", m.role === "user" ? "items-end" : "")}>
              <div className={cn("rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap leading-relaxed", m.role === "user" ? "bg-teal-800 text-white rounded-br-md" : "bg-white shadow-card text-ink rounded-bl-md")}>{m.content}</div>
              {!!m.cards?.length && (
                <div className="snap-row no-scrollbar">
                  {m.cards.map((c) => (
                    <div key={c.slug} className="card w-[200px] overflow-hidden">
                      <Link href={`/destinations/${c.slug}`} className="block relative h-24">{c.image && <Image src={c.image} alt={c.name} fill sizes="200px" className="object-cover" />}</Link>
                      <div className="p-2.5">
                        <div className="text-xs font-extrabold text-ink line-clamp-1">{c.name}</div>
                        <div className="text-[10px] text-ink-soft">{c.area} · {c.category}</div>
                        <div className="flex gap-2 mt-1.5 text-[10px] font-bold">
                          <Link href={`/map?focus=${c.slug}`} className="text-teal-700 inline-flex items-center gap-0.5"><MapPin className="size-3" />Map</Link>
                          {c.websiteUrl && <a href={c.websiteUrl} target="_blank" rel="noreferrer" className="text-teal-700 inline-flex items-center gap-0.5"><ExternalLink className="size-3" />Website</a>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!!m.links?.length && <div className="flex flex-wrap gap-1.5">{m.links.map((l) => <a key={l.href} href={l.href} target={l.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="pill bg-white shadow-card text-teal-700 normal-case tracking-normal">{l.label} ↗</a>)}</div>}
            </div>
          </div>
        ))}
        {busy && <div className="flex"><div className="bg-white shadow-card rounded-2xl rounded-bl-md px-4 py-3 flex gap-1"><span className="size-1.5 rounded-full bg-teal-600 animate-bounce" /><span className="size-1.5 rounded-full bg-teal-600 animate-bounce [animation-delay:120ms]" /><span className="size-1.5 rounded-full bg-teal-600 animate-bounce [animation-delay:240ms]" /></div></div>}
        <div ref={endRef} />
      </div>
      <div className="pt-2">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">{suggestions.map((s) => <button key={s} onClick={() => send(s)} className="shrink-0 rounded-full bg-white shadow-card px-3 py-1.5 text-[11px] font-bold text-teal-800">{s}</button>)}</div>
        <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex gap-2">
          <input className="input flex-1" placeholder="Ask TauPIK anything about PIK..." value={input} onChange={(e) => setInput(e.target.value)} />
          <button type="submit" className="btn btn-primary !px-4" disabled={busy || !input.trim()} aria-label="Send"><Send className="size-4" /></button>
        </form>
      </div>
    </div>
  );
}
