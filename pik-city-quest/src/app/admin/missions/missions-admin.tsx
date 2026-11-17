"use client";
import { useState } from "react";
import Link from "next/link";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { DataTable, type Row } from "@/components/admin/data-table";
import { Button, Pill, Sheet, Alert } from "@/components/ui";
import { getJson, postJson } from "@/components/ui/fetcher";
import { useToast } from "@/components/ui/toast";
import { MISSION_TYPE_META, REQUIREMENT_TYPES } from "@/lib/constants";
import { cn } from "@/lib/utils";

type M = Row & { name: string; type: string; xp: number; difficulty: string; verification: string; isActive: boolean; destination?: { name: string } | null; requirements: Array<{ type: string }>; _count: { checkpoints: number; submissions: number } };
type Req = { id?: string | null; type: string; label: string; isMandatory: boolean; config: Record<string, unknown> };
type Form = { id?: string; name: string; description: string; instructions: string; destinationId: string; difficulty: string; xp: number; verification: string; stepsOrdered: boolean; maxAttempts: number | null; timeLimitSec: number | null; isActive: boolean; isReusable: boolean; requirements: Req[] };
const blank = (): Form => ({ name: "", description: "", instructions: "", destinationId: "", difficulty: "EASY", xp: 50, verification: "AUTO", stepsOrdered: true, maxAttempts: null, timeLimitSec: null, isActive: true, isReusable: true, requirements: [{ type: "QR", label: "Scan the venue QR code", isMandatory: true, config: {} }] });

export function MissionsAdmin({ destinations, events }: { destinations: Array<{ id: string; name: string; gpsRadiusM: number }>; events: Array<{ id: string; title: string }> }) {
  const [editing, setEditing] = useState<Form | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const { toast } = useToast();
  async function open(id?: string) {
    if (!id) return setEditing(blank());
    const r = await getJson<{ mission: Form & { requirements: Array<Req & { label: string | null }> } }>(`/api/admin/mission-builder/${id}`);
    setEditing({ ...r.mission, destinationId: r.mission.destinationId ?? "", requirements: r.mission.requirements.map((q) => ({ ...q, label: q.label ?? "" })) });
  }
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button size="sm" className="!rounded-lg" onClick={() => open()}><Plus className="size-4" />New mission</Button></div>
      <DataTable<M> key={reloadKey} entity="missions" title="Mission management" description="Missions are reusable building blocks. Single-step or multi-step (GPS → QR → quiz → photo…). Photo/video/social steps are reviewed manually; everything else verifies automatically." canCreate={false} canEdit={false}
        filters={[{ key: "type", label: "Type", options: Object.keys(MISSION_TYPE_META).map((t) => ({ value: t, label: MISSION_TYPE_META[t].label })) }, { key: "verification", label: "Verification", options: [{ value: "AUTO", label: "Automatic" }, { value: "MANUAL", label: "Manual" }] }]}
        columns={[{ key: "name", label: "Mission", render: (m) => <div><div className="font-bold">{m.name}</div><div className="text-[11px] text-slate-500">{m.destination?.name ?? "No fixed destination"}</div></div> }, { key: "type", label: "Steps", render: (m) => <div className="flex flex-wrap gap-1">{m.requirements.map((r, i) => <Pill key={i} tone="teal">{r.type}</Pill>)}</div> }, { key: "xp", label: "XP" }, { key: "verification", label: "Verification", render: (m) => <Pill tone={m.verification === "AUTO" ? "green" : "purple"}>{m.verification}</Pill> }, { key: "_count", label: "Used in / attempts", render: (m) => `${m._count.checkpoints} quests / ${m._count.submissions}` }, { key: "isActive", label: "Status", render: (m) => m.isActive ? <Pill tone="green">active</Pill> : <Pill tone="gray">inactive</Pill> }]}
        rowActions={(m) => <><button onClick={() => open(m.id)} className="size-8 rounded-lg hover:bg-slate-100 inline-flex items-center justify-center" aria-label="Edit"><Pencil className="size-4" /></button><Link href={`/missions/${m.id}`} target="_blank" className="size-8 rounded-lg hover:bg-slate-100 inline-flex items-center justify-center" aria-label="Preview as visitor"><Eye className="size-4" /></Link></>} />
      {editing && <MissionEditor form={editing} destinations={destinations} events={events} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); setReloadKey((k) => k + 1); toast("Mission saved", "success"); }} />}
    </div>
  );
}

function MissionEditor({ form, destinations, events, onClose, onSaved }: { form: Form; destinations: Array<{ id: string; name: string; gpsRadiusM: number }>; events: Array<{ id: string; title: string }>; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<Form>(form);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof Form, v: unknown) => setF({ ...f, [k]: v });
  const updReq = (i: number, patch: Partial<Req>) => set("requirements", f.requirements.map((r, k) => (k === i ? { ...r, ...patch } : r)));
  const updCfg = (i: number, patch: Record<string, unknown>) => updReq(i, { config: { ...f.requirements[i].config, ...patch } });
  async function save() {
    setBusy(true); setErr(null);
    try { const payload = { ...f, destinationId: f.destinationId || null, requirements: f.requirements.map((r) => ({ ...r, label: r.label || null })) }; if (f.id) await postJson(`/api/admin/mission-builder/${f.id}`, payload, "PUT"); else await postJson("/api/admin/mission-builder", payload); onSaved(); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  return (
    <Sheet open onClose={onClose} title={f.id ? "Edit mission" : "New mission"} wide>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2"><label className="label">Mission name *</label><input className="input" value={f.name} onChange={(e) => set("name", e.target.value)} /></div>
        <div className="sm:col-span-2"><label className="label">Description *</label><input className="input" value={f.description} onChange={(e) => set("description", e.target.value)} /></div>
        <div className="sm:col-span-2"><label className="label">Instructions shown to visitors *</label><textarea className="input min-h-20" value={f.instructions} onChange={(e) => set("instructions", e.target.value)} /></div>
        <div><label className="label">Destination</label><select className="input" value={f.destinationId} onChange={(e) => set("destinationId", e.target.value)}><option value="">— uses the checkpoint's destination —</option>{destinations.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
        <div><label className="label">Difficulty</label><select className="input" value={f.difficulty} onChange={(e) => set("difficulty", e.target.value)}>{["EASY", "MEDIUM", "HARD", "EXPERT"].map((d) => <option key={d}>{d}</option>)}</select></div>
        <div><label className="label">XP points</label><input className="input" type="number" value={f.xp} onChange={(e) => set("xp", Number(e.target.value))} /></div>
        <div><label className="label">Max attempts (blank = unlimited)</label><input className="input" type="number" value={f.maxAttempts ?? ""} onChange={(e) => set("maxAttempts", e.target.value ? Number(e.target.value) : null)} /></div>
        <div><label className="label">Time limit (seconds, blank = none)</label><input className="input" type="number" value={f.timeLimitSec ?? ""} onChange={(e) => set("timeLimitSec", e.target.value ? Number(e.target.value) : null)} /></div>
        <div className="flex flex-wrap gap-4 items-end pb-2 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={f.stepsOrdered} onChange={(e) => set("stepsOrdered", e.target.checked)} />Steps in order</label><label className="flex items-center gap-2"><input type="checkbox" checked={f.isActive} onChange={(e) => set("isActive", e.target.checked)} />Active</label><label className="flex items-center gap-2"><input type="checkbox" checked={f.isReusable} onChange={(e) => set("isReusable", e.target.checked)} />Reusable</label></div>
      </div>
      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between"><div className="font-extrabold text-sm">Requirements / steps</div><button onClick={() => set("requirements", [...f.requirements, { type: "GPS", label: "", isMandatory: true, config: {} }])} className="btn btn-ghost min-h-8 px-3 text-xs"><Plus className="size-3.5" />Add step</button></div>
        {f.requirements.map((r, i) => (
          <div key={i} className="rounded-xl border border-slate-200 p-3 space-y-2">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="size-6 rounded-full bg-teal-700 text-white text-xs font-black flex items-center justify-center">{i + 1}</span>
              <select className="input !py-1.5 w-auto" value={r.type} onChange={(e) => updReq(i, { type: e.target.value, config: {} })}>{REQUIREMENT_TYPES.map((t) => <option key={t} value={t}>{MISSION_TYPE_META[t]?.label ?? t}</option>)}</select>
              <input className="input !py-1.5 flex-1 min-w-40" placeholder="Step label" value={r.label} onChange={(e) => updReq(i, { label: e.target.value })} />
              <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={r.isMandatory} onChange={(e) => updReq(i, { isMandatory: e.target.checked })} />mandatory</label>
              <span className={cn("pill", ["PHOTO", "VIDEO", "SOCIAL", "FIND_OBJECT"].includes(r.type) ? "bg-violet-100 text-violet-700" : "bg-emerald-100 text-emerald-700")}>{["PHOTO", "VIDEO", "SOCIAL", "FIND_OBJECT"].includes(r.type) ? "manual review" : "auto-verified"}</span>
              {f.requirements.length > 1 && <button onClick={() => set("requirements", f.requirements.filter((_, k) => k !== i))} className="text-rose-600"><Trash2 className="size-4" /></button>}
            </div>
            {r.type === "GPS" && <div className="grid sm:grid-cols-3 gap-2"><div><label className="label">Radius (m)</label><input className="input !py-1.5" type="number" value={String(r.config.radiusM ?? "")} placeholder="destination default" onChange={(e) => updCfg(i, { radiusM: e.target.value ? Number(e.target.value) : undefined })} /></div><div><label className="label">Time window from (HH:MM)</label><input className="input !py-1.5" value={String((r.config.timeWindow as { from?: string })?.from ?? "")} onChange={(e) => updCfg(i, { timeWindow: e.target.value ? { from: e.target.value, to: (r.config.timeWindow as { to?: string })?.to ?? "23:59" } : undefined })} /></div><div><label className="label">to (HH:MM)</label><input className="input !py-1.5" value={String((r.config.timeWindow as { to?: string })?.to ?? "")} onChange={(e) => updCfg(i, { timeWindow: { from: (r.config.timeWindow as { from?: string })?.from ?? "00:00", to: e.target.value } })} /></div></div>}
            {r.type === "EVENT_CHECKIN" && <div className="grid sm:grid-cols-2 gap-2"><div><label className="label">Event</label><select className="input !py-1.5" value={String(r.config.eventId ?? "")} onChange={(e) => updCfg(i, { eventId: e.target.value })}><option value="">Select event…</option>{events.map((ev) => <option key={ev.id} value={ev.id}>{ev.title}</option>)}</select></div><div><label className="label">Radius (m)</label><input className="input !py-1.5" type="number" value={String(r.config.radiusM ?? "")} onChange={(e) => updCfg(i, { radiusM: Number(e.target.value) })} /></div></div>}
            {r.type === "QR" && <div className="text-xs text-slate-500">Uses the checkpoint destination's QR code, or a QR code assigned specifically to this mission (manage in QR Codes).</div>}
            {r.type === "CODE" && <div className="grid sm:grid-cols-3 gap-2"><div><label className="label">Secret code</label><input className="input !py-1.5 font-mono" value={String(r.config.code ?? "")} onChange={(e) => updCfg(i, { code: e.target.value })} /></div><div><label className="label">Max attempts</label><input className="input !py-1.5" type="number" value={String(r.config.maxAttempts ?? "")} onChange={(e) => updCfg(i, { maxAttempts: e.target.value ? Number(e.target.value) : undefined })} /></div><div><label className="label">Expires</label><input className="input !py-1.5" type="datetime-local" value={String(r.config.expiresAt ?? "")} onChange={(e) => updCfg(i, { expiresAt: e.target.value || null })} /></div><label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={Boolean(r.config.caseSensitive)} onChange={(e) => updCfg(i, { caseSensitive: e.target.checked })} />case sensitive</label></div>}
            {(r.type === "PHOTO" || r.type === "VIDEO" || r.type === "FIND_OBJECT") && <div className="grid sm:grid-cols-[1fr_120px_120px] gap-2"><div><label className="label">Prompt shown to visitor</label><input className="input !py-1.5" value={String(r.config.prompt ?? "")} onChange={(e) => updCfg(i, { prompt: e.target.value })} /></div><div><label className="label">Max size MB</label><input className="input !py-1.5" type="number" value={String(r.config.maxSizeMB ?? (r.type === "VIDEO" ? 40 : 10))} onChange={(e) => updCfg(i, { maxSizeMB: Number(e.target.value) })} /></div>{r.type === "VIDEO" && <div><label className="label">Max seconds</label><input className="input !py-1.5" type="number" value={String(r.config.maxDurationSec ?? 20)} onChange={(e) => updCfg(i, { maxDurationSec: Number(e.target.value) })} /></div>}</div>}
            {r.type === "SOCIAL" && <div className="grid sm:grid-cols-2 gap-2"><div><label className="label">Platform</label><input className="input !py-1.5" value={String(r.config.platform ?? "Instagram")} onChange={(e) => updCfg(i, { platform: e.target.value })} /></div><div><label className="label">Hashtag</label><input className="input !py-1.5" value={String(r.config.hashtag ?? "#PIKCityQuest")} onChange={(e) => updCfg(i, { hashtag: e.target.value })} /></div></div>}
            {r.type === "QUIZ" && <QuizEditor cfg={r.config} onChange={(c) => updReq(i, { config: c })} />}
          </div>
        ))}
      </div>
      {err && <div className="mt-3"><Alert tone="error">{err}</Alert></div>}
      <div className="flex justify-end gap-2 mt-4"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={save} loading={busy}>{f.id ? "Save mission" : "Create mission"}</Button></div>
    </Sheet>
  );
}

type QQ = { id: string; text: string; options: string[]; correctIndex: number; type?: string };
function QuizEditor({ cfg, onChange }: { cfg: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  const qs = (cfg.questions as QQ[]) ?? [];
  const setQs = (q: QQ[]) => onChange({ ...cfg, questions: q });
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2"><div><label className="label">Pass score (0–1)</label><input className="input !py-1.5" type="number" step="0.1" min="0" max="1" value={String(cfg.passScore ?? 1)} onChange={(e) => onChange({ ...cfg, passScore: Number(e.target.value) })} /></div><div><label className="label">Max attempts</label><input className="input !py-1.5" type="number" value={String(cfg.maxAttempts ?? 3)} onChange={(e) => onChange({ ...cfg, maxAttempts: Number(e.target.value) })} /></div><div><label className="label">Timer (sec)</label><input className="input !py-1.5" type="number" value={String(cfg.timerSec ?? "")} onChange={(e) => onChange({ ...cfg, timerSec: e.target.value ? Number(e.target.value) : null })} /></div></div>
      {qs.map((q, i) => (
        <div key={q.id} className="rounded-lg bg-slate-50 p-2 space-y-1.5">
          <div className="flex gap-2"><input className="input !py-1.5 flex-1" placeholder="Question" value={q.text} onChange={(e) => setQs(qs.map((x, k) => (k === i ? { ...x, text: e.target.value } : x)))} /><select className="input !py-1.5 w-auto" value={q.type ?? "multiple"} onChange={(e) => setQs(qs.map((x, k) => (k === i ? { ...x, type: e.target.value, options: e.target.value === "truefalse" ? ["True", "False"] : x.options } : x)))}><option value="multiple">Multiple choice</option><option value="truefalse">True / false</option></select><button onClick={() => setQs(qs.filter((_, k) => k !== i))} className="text-rose-600"><Trash2 className="size-4" /></button></div>
          {q.options.map((o, oi) => <div key={oi} className="flex items-center gap-2"><input type="radio" name={`c-${q.id}`} checked={q.correctIndex === oi} onChange={() => setQs(qs.map((x, k) => (k === i ? { ...x, correctIndex: oi } : x)))} title="Correct answer" /><input className="input !py-1 !text-xs flex-1" value={o} onChange={(e) => setQs(qs.map((x, k) => (k === i ? { ...x, options: x.options.map((y, yi) => (yi === oi ? e.target.value : y)) } : x)))} />{q.type !== "truefalse" && q.options.length > 2 && <button onClick={() => setQs(qs.map((x, k) => (k === i ? { ...x, options: x.options.filter((_, yi) => yi !== oi), correctIndex: Math.min(x.correctIndex, x.options.length - 2) } : x)))} className="text-slate-400"><Trash2 className="size-3.5" /></button>}</div>)}
          {q.type !== "truefalse" && <button onClick={() => setQs(qs.map((x, k) => (k === i ? { ...x, options: [...x.options, ""] } : x)))} className="text-xs font-bold text-teal-700">+ option</button>}
        </div>
      ))}
      <button onClick={() => setQs([...qs, { id: `q${Date.now()}`, text: "", options: ["", "", "", ""], correctIndex: 0, type: "multiple" }])} className="btn btn-ghost min-h-8 px-3 text-xs"><Plus className="size-3.5" />Add question</button>
    </div>
  );
}
