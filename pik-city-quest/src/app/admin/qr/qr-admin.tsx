"use client";
import { useCallback, useEffect, useState } from "react";
import { Download, Plus, RefreshCw, Power } from "lucide-react";
import { getJson, postJson } from "@/components/ui/fetcher";
import { Button, Pill, Sheet, Spinner } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { fmtDate } from "@/lib/utils";
type Qr = { id: string; token: string; label: string; kind: string; isActive: boolean; expiresAt: string | null; rotatedAt: string | null; createdAt: string; destination: { name: string } | null; mission: { name: string } | null; successScans: number; failedScans: number };
export function QrAdmin({ destinations, missions }: { destinations: Array<{ id: string; name: string }>; missions: Array<{ id: string; name: string }> }) {
  const [items, setItems] = useState<Qr[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ label: "", kind: "CHECKPOINT", destinationId: "", missionId: "", expiresAt: "" });
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const load = useCallback(async () => { setLoading(true); try { setItems((await getJson<{ items: Qr[] }>("/api/admin/qr")).items); } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);
  async function create() { setBusy(true); try { await postJson("/api/admin/qr", { ...f, destinationId: f.destinationId || null, missionId: f.missionId || null, expiresAt: f.expiresAt || null }); toast("QR code generated", "success"); setOpen(false); load(); } catch (e) { toast((e as Error).message, "error"); } finally { setBusy(false); } }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3"><div><h1 className="text-xl font-black">QR code management</h1><p className="text-xs text-slate-500">Secure random tokens, validated server-side. Download, print and place at the venue. Regenerate to invalidate a leaked code without losing scan history.</p></div><Button size="sm" className="ml-auto !rounded-lg" onClick={() => setOpen(true)}><Plus className="size-4" />Generate QR</Button></div>
      {loading ? <div className="p-10 flex justify-center"><Spinner /></div> : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {items.map((q) => (
            <div key={q.id} className="rounded-xl bg-white border border-slate-200 p-3 flex gap-3">
              <img src={`/api/admin/qr/${q.id}/image?format=svg`} alt="" className={`size-28 rounded-lg border ${q.isActive ? "" : "opacity-30"}`} />
              <div className="flex-1 min-w-0 space-y-1">
                <div className="font-bold text-sm leading-tight">{q.label}</div>
                <div className="text-[11px] text-slate-500">{q.kind} · {q.destination?.name ?? q.mission?.name ?? "unassigned"}</div>
                <div className="flex flex-wrap gap-1"><Pill tone={q.isActive ? "green" : "gray"}>{q.isActive ? "active" : "inactive"}</Pill><Pill tone="teal">{q.successScans} scans</Pill>{q.failedScans > 0 && <Pill tone="red">{q.failedScans} failed</Pill>}</div>
                <div className="text-[10px] text-slate-400 font-mono truncate">…{q.token.slice(-8)} · {q.rotatedAt ? `rotated ${fmtDate(q.rotatedAt)}` : `created ${fmtDate(q.createdAt)}`}{q.expiresAt ? ` · expires ${fmtDate(q.expiresAt)}` : ""}</div>
                <div className="flex flex-wrap gap-1 pt-1">
                  <a href={`/api/admin/qr/${q.id}/image`} download className="btn btn-ghost min-h-7 px-2 text-[11px]"><Download className="size-3.5" />PNG</a>
                  <a href={`/api/admin/qr/${q.id}/image?format=svg`} download className="btn btn-ghost min-h-7 px-2 text-[11px]"><Download className="size-3.5" />SVG</a>
                  <button onClick={async () => { if (!confirm("Regenerate token? Printed copies of the old code stop working.")) return; await postJson(`/api/admin/qr/${q.id}/rotate`); toast("Token rotated", "success"); load(); }} className="btn btn-ghost min-h-7 px-2 text-[11px]"><RefreshCw className="size-3.5" />Regenerate</button>
                  <button onClick={async () => { await postJson(`/api/admin/qr/${q.id}`, { isActive: !q.isActive }, "PATCH"); load(); }} className="btn btn-ghost min-h-7 px-2 text-[11px]"><Power className="size-3.5" />{q.isActive ? "Deactivate" : "Activate"}</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <Sheet open={open} onClose={() => setOpen(false)} title="Generate QR code">
        <div className="space-y-3">
          <div><label className="label">Label</label><input className="input" value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} placeholder="e.g. Aloha – entrance sign" /></div>
          <div><label className="label">Kind</label><select className="input" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}><option value="CHECKPOINT">Checkpoint (valid for any QR mission at this destination)</option><option value="DESTINATION">Destination</option><option value="MISSION">Specific mission only</option></select></div>
          <div><label className="label">Destination</label><select className="input" value={f.destinationId} onChange={(e) => setF({ ...f, destinationId: e.target.value })}><option value="">—</option>{destinations.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
          <div><label className="label">Mission (for MISSION kind)</label><select className="input" value={f.missionId} onChange={(e) => setF({ ...f, missionId: e.target.value })}><option value="">—</option>{missions.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
          <div><label className="label">Expiry (optional)</label><input className="input" type="datetime-local" value={f.expiresAt} onChange={(e) => setF({ ...f, expiresAt: e.target.value })} /></div>
          <Button full loading={busy} onClick={create} disabled={!f.label || (!f.destinationId && !f.missionId)}>Generate</Button>
        </div>
      </Sheet>
    </div>
  );
}
