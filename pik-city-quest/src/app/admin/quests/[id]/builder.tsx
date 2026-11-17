"use client";
import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Check, ChevronLeft, ChevronRight, Eye, Plus, Trash2, X } from "lucide-react";
import { Button, Alert, Pill } from "@/components/ui";
import { postJson } from "@/components/ui/fetcher";
import { useToast } from "@/components/ui/toast";
import { cn, formatDuration } from "@/lib/utils";
import { MISSION_TYPE_META } from "@/lib/constants";

type Dest = { id: string; name: string; area: string; category: string; image: string | null };
type Mis = { id: string; name: string; type: string; xp: number; verification: string; destinationId: string | null; destinationName: string | null; steps: string[] };
type Cp = { id?: string | null; destinationId: string; intro: string; missions: Array<{ missionId: string; isMandatory: boolean; xpOverride: number | null }> };
type Form = { id?: string; name: string; slug: string; tagline: string; description: string; coverImage: string; type: string; difficulty: string; durationMinutes: number; completionRule: string; minCheckpoints: number | null; unlockConditions: Record<string, unknown>; rules: string; completionXp: number; bonusXp: number; startsAt: string; endsAt: string; isFeatured: boolean; sortOrder: number; status: string; rewardIds: string[]; badgeIds: string[]; checkpoints: Cp[] };
const STEPS = ["Basic info", "Select destinations", "Checkpoint sequence", "Add missions", "Unlock rules", "Points & rewards", "Schedule", "Preview & publish"];
const DEFAULT_RULES = "Visit each checkpoint in person. Missions are verified automatically or by the PIK Tourism team. XP is awarded only after verification. Be respectful of venues and other visitors.";

export function QuestBuilder({ initial, destinations, missions, rewards, badges, quests }: { initial: Form | null; destinations: Dest[]; missions: Mis[]; rewards: Array<{ id: string; name: string; partnerName: string; questId: string | null }>; badges: Array<{ id: string; name: string; icon: string; relatedQuestId: string | null }>; quests: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [f, setF] = useState<Form>(initial ?? { name: "", slug: "", tagline: "", description: "", coverImage: "", type: "REGULAR", difficulty: "EASY", durationMinutes: 120, completionRule: "SEQUENTIAL", minCheckpoints: null, unlockConditions: {}, rules: DEFAULT_RULES, completionXp: 200, bonusXp: 0, startsAt: "", endsAt: "", isFeatured: false, sortOrder: 0, status: "DRAFT", rewardIds: [], badgeIds: [], checkpoints: [] });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const dest = (id: string) => destinations.find((d) => d.id === id);
  const set = (k: keyof Form, v: unknown) => setF({ ...f, [k]: v });
  const totals = useMemo(() => { const missionXp = f.checkpoints.reduce((s, c) => s + c.missions.reduce((t, m) => t + (m.xpOverride ?? missions.find((x) => x.id === m.missionId)?.xp ?? 0), 0), 0); return { missionXp, total: missionXp + f.completionXp + f.bonusXp + f.checkpoints.length * 25 }; }, [f, missions]);
  const valid = [f.name.length > 1 && f.description.length > 1, f.checkpoints.length > 0, true, f.checkpoints.every((c) => c.missions.length > 0), true, true, true, true];

  async function save(status?: string) {
    setBusy(true); setErr(null);
    try {
      const payload = { ...f, status: status ?? f.status, startsAt: f.startsAt || null, endsAt: f.endsAt || null, coverImage: f.coverImage || dest(f.checkpoints[0]?.destinationId)?.image || null, slug: f.slug || null };
      const r = f.id ? await postJson<{ quest: { id: string; slug: string } }>(`/api/admin/quest-builder/${f.id}`, payload, "PUT") : await postJson<{ quest: { id: string; slug: string } }>("/api/admin/quest-builder", payload);
      toast(status === "PUBLISHED" ? "Quest published — it's live for visitors" : "Quest saved", "success");
      if (!f.id) router.replace(`/admin/quests/${r.quest.id}`); else router.refresh();
      setF({ ...f, id: r.quest.id, slug: r.quest.slug, status: status ?? f.status });
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  const toggleDest = (id: string) => setF({ ...f, checkpoints: f.checkpoints.some((c) => c.destinationId === id) ? f.checkpoints.filter((c) => c.destinationId !== id) : [...f.checkpoints, { destinationId: id, intro: "", missions: missions.filter((m) => m.destinationId === id).slice(0, 1).map((m) => ({ missionId: m.id, isMandatory: true, xpOverride: null })) }] });
  const moveCp = (i: number, d: number) => { const n = [...f.checkpoints]; const j = i + d; if (j < 0 || j >= n.length) return; [n[i], n[j]] = [n[j], n[i]]; set("checkpoints", n); };
  const updCp = (i: number, patch: Partial<Cp>) => set("checkpoints", f.checkpoints.map((c, k) => (k === i ? { ...c, ...patch } : c)));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap"><Link href="/admin/quests" className="btn btn-ghost min-h-9 px-3 text-xs !rounded-lg"><ChevronLeft className="size-4" />Quests</Link><h1 className="text-xl font-black">{f.id ? `Edit: ${f.name}` : "Create quest"}</h1><Pill tone={f.status === "PUBLISHED" ? "green" : "sun"}>{f.status}</Pill>{f.id && <a href={`/quests/${f.slug}`} target="_blank" className="btn btn-outline min-h-9 px-3 text-xs !rounded-lg ml-auto"><Eye className="size-4" />Preview visitor page</a>}</div>
      <div className="flex gap-1 overflow-x-auto no-scrollbar">{STEPS.map((s, i) => <button key={s} onClick={() => setStep(i)} className={cn("shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold border", step === i ? "bg-teal-700 text-white border-teal-700" : valid[i] && i < step ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-white text-slate-600 border-slate-200")}><span className="size-5 rounded-full bg-black/10 flex items-center justify-center text-[10px]">{valid[i] && i < step ? <Check className="size-3" /> : i + 1}</span>{s}</button>)}</div>
      <div className="rounded-xl bg-white border border-slate-200 p-5 min-h-[420px]">
        {step === 0 && <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2"><label className="label">Quest name *</label><input className="input" value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. PIK Sunset Explorer" /></div>
          <div><label className="label">Slug (URL)</label><input className="input" value={f.slug} onChange={(e) => set("slug", e.target.value)} placeholder="auto from name" /></div>
          <div><label className="label">Tagline</label><input className="input" value={f.tagline} onChange={(e) => set("tagline", e.target.value)} /></div>
          <div className="sm:col-span-2"><label className="label">Description *</label><textarea className="input min-h-24" value={f.description} onChange={(e) => set("description", e.target.value)} /></div>
          <div className="sm:col-span-2"><label className="label">Cover image URL (defaults to first checkpoint's photo)</label><div className="flex gap-2"><input className="input" value={f.coverImage} onChange={(e) => set("coverImage", e.target.value)} /><label className="btn btn-ghost min-h-9 px-3 text-xs cursor-pointer shrink-0">Upload<input type="file" accept="image/*" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; const fd = new FormData(); fd.append("file", file); const r = await fetch("/api/upload", { method: "POST", body: fd }); const d = await r.json(); if (r.ok) set("coverImage", d.url); }} /></label></div></div>
          <div><label className="label">Quest type</label><select className="input" value={f.type} onChange={(e) => set("type", e.target.value)}><option value="REGULAR">REGULAR — long-term / discovery</option><option value="SPECIAL">SPECIAL — seasonal / event / promo</option></select></div>
          <div><label className="label">Difficulty</label><select className="input" value={f.difficulty} onChange={(e) => set("difficulty", e.target.value)}>{["EASY", "MEDIUM", "HARD", "EXPERT"].map((d) => <option key={d}>{d}</option>)}</select></div>
          <div><label className="label">Estimated duration (minutes)</label><input className="input" type="number" value={f.durationMinutes} onChange={(e) => set("durationMinutes", Number(e.target.value))} /></div>
          <div><label className="label">Sort order / featured</label><div className="flex gap-2 items-center"><input className="input w-24" type="number" value={f.sortOrder} onChange={(e) => set("sortOrder", Number(e.target.value))} /><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.isFeatured} onChange={(e) => set("isFeatured", e.target.checked)} />Featured on home</label></div></div>
        </div>}
        {step === 1 && <div className="space-y-3">
          <div className="flex items-center gap-3"><input className="input max-w-sm" placeholder="Search destinations…" value={search} onChange={(e) => setSearch(e.target.value)} /><span className="text-xs text-slate-500">{f.checkpoints.length} selected · tap to add in route order</span></div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 max-h-[520px] overflow-y-auto pr-1">{destinations.filter((d) => !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.area.toLowerCase().includes(search.toLowerCase())).map((d) => { const idx = f.checkpoints.findIndex((c) => c.destinationId === d.id); return <button key={d.id} onClick={() => toggleDest(d.id)} className={cn("flex items-center gap-2 rounded-lg border p-2 text-left", idx >= 0 ? "border-teal-600 bg-teal-50" : "border-slate-200 hover:bg-slate-50")}><div className="relative size-10 rounded-md overflow-hidden bg-slate-100 shrink-0">{d.image && <Image src={d.image} alt="" fill sizes="40px" className="object-cover" />}</div><div className="min-w-0 flex-1"><div className="text-xs font-bold truncate">{d.name}</div><div className="text-[10px] text-slate-500">{d.area} · {d.category}</div></div>{idx >= 0 && <span className="size-6 rounded-full bg-teal-700 text-white text-[10px] font-black flex items-center justify-center">{idx + 1}</span>}</button>; })}</div>
        </div>}
        {step === 2 && <div className="space-y-2">{f.checkpoints.map((c, i) => { const d = dest(c.destinationId)!; return <div key={c.destinationId} className="flex items-center gap-3 rounded-lg border border-slate-200 p-2"><span className={cn("size-8 rounded-full flex items-center justify-center text-xs font-black text-white", i === 0 ? "bg-sun-500 !text-ink" : i === f.checkpoints.length - 1 ? "bg-coral" : "bg-teal-700")}>{i === 0 ? "S" : i === f.checkpoints.length - 1 ? "F" : i + 1}</span><div className="relative size-10 rounded-md overflow-hidden bg-slate-100">{d.image && <Image src={d.image} alt="" fill sizes="40px" className="object-cover" />}</div><div className="flex-1 min-w-0"><div className="text-sm font-bold">{d.name} <span className="text-[10px] font-semibold text-slate-500">{i === 0 ? "· Starting point" : i === f.checkpoints.length - 1 ? "· Final destination" : ""}</span></div><input className="input !py-1 !text-xs mt-1" placeholder="Optional intro shown on the checkpoint card" value={c.intro} onChange={(e) => updCp(i, { intro: e.target.value })} /></div><button onClick={() => moveCp(i, -1)} className="size-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"><ArrowUp className="size-4" /></button><button onClick={() => moveCp(i, 1)} className="size-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"><ArrowDown className="size-4" /></button><button onClick={() => toggleDest(c.destinationId)} className="size-8 rounded-lg hover:bg-rose-50 text-rose-600 flex items-center justify-center"><Trash2 className="size-4" /></button></div>; })}{!f.checkpoints.length && <Alert tone="warn">Select destinations in step 2 first.</Alert>}</div>}
        {step === 3 && <div className="space-y-4">
          <div className="text-xs text-slate-500">Assign one or more missions per checkpoint. Missions are reusable across quests — create new ones in <Link href="/admin/missions" className="font-bold text-teal-700">Mission management</Link>. Missions at the same destination are suggested first.</div>
          {f.checkpoints.map((c, i) => { const d = dest(c.destinationId)!; const pool = missions.filter((m) => !c.missions.some((x) => x.missionId === m.id)).sort((a, b) => Number(b.destinationId === c.destinationId) - Number(a.destinationId === c.destinationId)); return (
            <div key={c.destinationId} className="rounded-lg border border-slate-200 p-3">
              <div className="font-bold text-sm mb-2">{i + 1}. {d.name}</div>
              <div className="space-y-1.5">{c.missions.map((m, j) => { const mi = missions.find((x) => x.id === m.missionId); if (!mi) return null; return <div key={m.missionId} className="flex items-center gap-2 rounded-md bg-slate-50 px-2 py-1.5 text-xs"><span className="font-bold">{mi.name}</span><Pill tone="teal">{MISSION_TYPE_META[mi.type]?.label}</Pill><span className="text-slate-500">{mi.steps.join(" → ")} · {mi.verification}</span><span className="ml-auto flex items-center gap-2"><label className="flex items-center gap-1"><input type="checkbox" checked={m.isMandatory} onChange={(e) => updCp(i, { missions: c.missions.map((x, k) => (k === j ? { ...x, isMandatory: e.target.checked } : x)) })} />mandatory</label><input className="input !py-0.5 !px-2 !text-xs w-20" type="number" placeholder={`${mi.xp} XP`} value={m.xpOverride ?? ""} onChange={(e) => updCp(i, { missions: c.missions.map((x, k) => (k === j ? { ...x, xpOverride: e.target.value === "" ? null : Number(e.target.value) } : x)) })} /><button onClick={() => updCp(i, { missions: c.missions.filter((_, k) => k !== j) })} className="text-rose-600"><X className="size-4" /></button></span></div>; })}</div>
              <select className="input !py-1.5 !text-xs mt-2" value="" onChange={(e) => e.target.value && updCp(i, { missions: [...c.missions, { missionId: e.target.value, isMandatory: true, xpOverride: null }] })}><option value="">+ Add mission…</option>{pool.map((m) => <option key={m.id} value={m.id}>{m.destinationId === c.destinationId ? "★ " : ""}{m.name} ({MISSION_TYPE_META[m.type]?.label}, {m.xp} XP{m.destinationName ? `, ${m.destinationName}` : ""})</option>)}</select>
            </div>); })}
        </div>}
        {step === 4 && <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2"><label className="label">Completion rule</label><div className="grid sm:grid-cols-2 gap-2">{[["SEQUENTIAL", "Sequential — checkpoints unlock one after another"], ["OPEN", "Open route — any order"], ["MINIMUM", "Minimum — complete N of the checkpoints"], ["CUSTOM", "Custom — advanced unlock conditions"]].map(([v, l]) => <button key={v} onClick={() => set("completionRule", v)} className={cn("rounded-lg border p-3 text-left text-sm", f.completionRule === v ? "border-teal-600 bg-teal-50" : "border-slate-200")}><b>{v}</b><div className="text-xs text-slate-500">{l.split("— ")[1]}</div></button>)}</div></div>
          {f.completionRule === "MINIMUM" && <div><label className="label">Minimum checkpoints to complete</label><input className="input" type="number" min={1} max={f.checkpoints.length} value={f.minCheckpoints ?? ""} onChange={(e) => set("minCheckpoints", Number(e.target.value))} /></div>}
          <div><label className="label">Requires completed quest</label><select className="input" value={String(f.unlockConditions.requiresQuestId ?? "")} onChange={(e) => set("unlockConditions", { ...f.unlockConditions, requiresQuestId: e.target.value || null })}><option value="">None</option>{quests.filter((q) => q.id !== f.id).map((q) => <option key={q.id} value={q.id}>{q.name}</option>)}</select></div>
          <div><label className="label">Requires badge</label><select className="input" value={String(f.unlockConditions.requiresBadgeId ?? "")} onChange={(e) => set("unlockConditions", { ...f.unlockConditions, requiresBadgeId: e.target.value || null })}><option value="">None</option>{badges.map((b) => <option key={b.id} value={b.id}>{b.icon} {b.name}</option>)}</select></div>
          <div><label className="label">Requires explorer level (1–5)</label><input className="input" type="number" min={1} max={5} value={String(f.unlockConditions.requiresLevel ?? "")} onChange={(e) => set("unlockConditions", { ...f.unlockConditions, requiresLevel: e.target.value ? Number(e.target.value) : null })} /></div>
          <div className="sm:col-span-2"><label className="label">Rules shown before starting</label><textarea className="input min-h-24" value={f.rules} onChange={(e) => set("rules", e.target.value)} /></div>
        </div>}
        {step === 5 && <div className="grid sm:grid-cols-2 gap-4">
          <div><label className="label">Quest completion XP</label><input className="input" type="number" value={f.completionXp} onChange={(e) => set("completionXp", Number(e.target.value))} /></div>
          <div><label className="label">Bonus XP (special quests)</label><input className="input" type="number" value={f.bonusXp} onChange={(e) => set("bonusXp", Number(e.target.value))} /></div>
          <div className="sm:col-span-2 rounded-lg bg-slate-50 p-3 text-sm">Mission XP: <b>{totals.missionXp}</b> · Checkpoint bonuses: <b>{f.checkpoints.length} × 25</b> · Completion: <b>{f.completionXp}</b>{f.bonusXp ? <> · Bonus: <b>{f.bonusXp}</b></> : null} → <b className="text-teal-700">{totals.total} XP total</b></div>
          <div><label className="label">Rewards issued on completion</label><div className="space-y-1 max-h-56 overflow-y-auto">{rewards.map((r) => <label key={r.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.rewardIds.includes(r.id)} onChange={(e) => set("rewardIds", e.target.checked ? [...f.rewardIds, r.id] : f.rewardIds.filter((x) => x !== r.id))} />{r.name} <span className="text-xs text-slate-500">· {r.partnerName}{r.questId && r.questId !== f.id ? " (assigned to another quest)" : ""}</span></label>)}</div></div>
          <div><label className="label">Completion badge(s)</label><div className="space-y-1 max-h-56 overflow-y-auto">{badges.map((b) => <label key={b.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.badgeIds.includes(b.id)} onChange={(e) => set("badgeIds", e.target.checked ? [...f.badgeIds, b.id] : f.badgeIds.filter((x) => x !== b.id))} />{b.icon} {b.name}{b.relatedQuestId && b.relatedQuestId !== f.id ? <span className="text-xs text-slate-500"> (linked to another quest)</span> : null}</label>)}</div></div>
        </div>}
        {step === 6 && <div className="grid sm:grid-cols-2 gap-4">
          <div><label className="label">Starts at (leave empty = immediately)</label><input className="input" type="datetime-local" value={f.startsAt} onChange={(e) => set("startsAt", e.target.value)} /></div>
          <div><label className="label">Ends at (leave empty = no end)</label><input className="input" type="datetime-local" value={f.endsAt} onChange={(e) => set("endsAt", e.target.value)} /></div>
          <div className="sm:col-span-2 text-xs text-slate-500">A published quest with a future start date shows as UPCOMING in the visitor app and opens automatically at the start time; it closes automatically at the end time.</div>
        </div>}
        {step === 7 && <div className="space-y-4">
          <div className="grid sm:grid-cols-[200px_1fr] gap-4"><div className="relative h-36 rounded-lg overflow-hidden bg-slate-100">{(f.coverImage || dest(f.checkpoints[0]?.destinationId)?.image) && <Image src={f.coverImage || dest(f.checkpoints[0]?.destinationId)!.image!} alt="" fill sizes="200px" className="object-cover" />}</div><div><div className="text-lg font-black">{f.name || "Untitled quest"}</div><div className="text-sm text-slate-600">{f.tagline}</div><div className="flex flex-wrap gap-1.5 mt-2"><Pill tone={f.type === "SPECIAL" ? "sun" : "teal"}>{f.type}</Pill><Pill tone="gray">{f.difficulty}</Pill><Pill tone="gray">{formatDuration(f.durationMinutes)}</Pill><Pill tone="gray">{f.completionRule}</Pill><Pill tone="green">{totals.total} XP</Pill></div><p className="text-xs text-slate-600 mt-2">{f.description}</p></div></div>
          <ol className="space-y-1 text-sm">{f.checkpoints.map((c, i) => <li key={c.destinationId} className="flex gap-2"><span className="font-black text-teal-700 w-5">{i + 1}.</span><span className="font-semibold">{dest(c.destinationId)?.name}</span><span className="text-slate-500">— {c.missions.map((m) => missions.find((x) => x.id === m.missionId)?.name).join(", ") || "no missions"}</span></li>)}</ol>
          <div className="text-xs text-slate-500">Rewards: {f.rewardIds.length} · Badges: {f.badgeIds.length} · Schedule: {f.startsAt || "now"} → {f.endsAt || "open"}</div>
          {!valid.every(Boolean) && <Alert tone="warn">Complete the required steps (name, description, destinations and at least one mission per checkpoint) before publishing.</Alert>}
        </div>}
      </div>
      {err && <Alert tone="error">{err}</Alert>}
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}><ChevronLeft className="size-4" />Back</Button>
        {step < STEPS.length - 1 && <Button variant="outline" onClick={() => setStep((s) => s + 1)}>Next<ChevronRight className="size-4" /></Button>}
        <span className="flex-1" />
        <Button variant="ghost" loading={busy} onClick={() => save()}>Save draft</Button>
        <Button variant="sun" loading={busy} disabled={!valid.every(Boolean)} onClick={() => save("PUBLISHED")}><Plus className="size-4" />{f.status === "PUBLISHED" ? "Save & keep published" : "Publish quest"}</Button>
      </div>
    </div>
  );
}
