"use client";
import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Check, X, MapPin, Clock, RefreshCw, ExternalLink } from "lucide-react";
import { getJson, postJson } from "@/components/ui/fetcher";
import { Avatar, Button, Pill, Sheet, Spinner, Alert } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { fmtDate, timeAgo } from "@/lib/utils";
import { MISSION_TYPES } from "@/lib/constants";

type Sub = { id: string; status: string; attempts: number; submittedAt: string | null; reviewedAt: string | null; rejectionReason: string | null; lat: number | null; lng: number | null; accuracyM: number | null; user: { id: string; name: string; username: string; avatarUrl: string | null }; mission: { name: string; type: string; xp: number; instructions: string }; checkpoint: { order: number; destination: { name: string; lat: number; lng: number }; quest: { name: string; slug: string } } | null; requirements: Array<{ id: string; status: string; mediaUrl: string | null; payload: string; requirement: { type: string; label: string | null } }>; reviewedBy: { username: string } | null };

export function VerificationQueue({ quests }: { quests: Array<{ id: string; name: string }> }) {
  const [items, setItems] = useState<Sub[]>([]);
  const [loading, setLoading] = useState(true);
  const [f, setF] = useState({ status: "PENDING", q: "", quest: "", type: "", sort: "oldest" });
  const [sel, setSel] = useState<Sub | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const load = useCallback(async () => { setLoading(true); try { const r = await getJson<{ items: Sub[] }>(`/api/admin/verification?${new URLSearchParams(f)}`); setItems(r.items); } catch (e) { toast((e as Error).message, "error"); } finally { setLoading(false); } }, [f, toast]);
  useEffect(() => { const t = setTimeout(load, 150); return () => clearTimeout(t); }, [load]);
  async function decide(id: string, decision: "APPROVE" | "REJECT") {
    if (decision === "REJECT" && !reason.trim()) return toast("A rejection reason is required.", "error");
    setBusy(true);
    try { await postJson(`/api/admin/verification/${id}`, { decision, reason: decision === "REJECT" ? reason : undefined }); toast(decision === "APPROVE" ? "Approved — XP and stamp issued" : "Rejected — visitor can retry", "success"); setSel(null); setReason(""); load(); } catch (e) { toast((e as Error).message, "error"); } finally { setBusy(false); }
  }
  async function bulk(decision: "APPROVE" | "REJECT") {
    const r = decision === "REJECT" ? prompt("Rejection reason for all selected:") : undefined;
    if (decision === "REJECT" && !r) return;
    setBusy(true);
    try { const res = await postJson<{ results: Array<{ ok: boolean }> }>("/api/admin/verification/bulk", { ids: picked, decision, reason: r }); toast(`${res.results.filter((x) => x.ok).length} processed`, "success"); setPicked([]); load(); } catch (e) { toast((e as Error).message, "error"); } finally { setBusy(false); }
  }
  const mediaOf = (s: Sub) => s.requirements.filter((r) => r.mediaUrl);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3"><div><h1 className="text-xl font-black">Mission verification</h1><p className="text-xs text-slate-500">Photo, video and social submissions waiting for manual review. Approval issues XP, stamps, badges and unlocks the next checkpoint.</p></div>
        <div className="ml-auto flex flex-wrap gap-2">
          <input className="input !py-2 !rounded-lg w-48" placeholder="Search user, mission, place" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} />
          <select className="input !py-2 !rounded-lg w-auto" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option value="PENDING">Pending review</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option><option value="ALL">History (all manual)</option></select>
          <select className="input !py-2 !rounded-lg w-auto" value={f.quest} onChange={(e) => setF({ ...f, quest: e.target.value })}><option value="">All quests</option>{quests.map((q) => <option key={q.id} value={q.id}>{q.name}</option>)}</select>
          <select className="input !py-2 !rounded-lg w-auto" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}><option value="">All types</option>{MISSION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select>
          <select className="input !py-2 !rounded-lg w-auto" value={f.sort} onChange={(e) => setF({ ...f, sort: e.target.value })}><option value="oldest">Oldest first</option><option value="newest">Newest first</option></select>
          <button onClick={load} className="size-9 rounded-lg border bg-white flex items-center justify-center"><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /></button>
        </div></div>
      {picked.length > 0 && <div className="rounded-lg bg-teal-50 border border-teal-200 p-2 flex items-center gap-2 text-sm"><b>{picked.length} selected</b><Button size="sm" onClick={() => bulk("APPROVE")} loading={busy}><Check className="size-4" />Approve all</Button><Button size="sm" variant="danger" onClick={() => bulk("REJECT")} loading={busy}><X className="size-4" />Reject all</Button><button className="ml-auto text-xs" onClick={() => setPicked([])}>Clear</button></div>}
      {loading && !items.length ? <div className="p-10 flex justify-center"><Spinner /></div> : !items.length ? <div className="rounded-xl bg-white border border-slate-200 p-10 text-center text-slate-500">Nothing to review 🎉</div> : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {items.map((s) => { const media = mediaOf(s)[0]; const isVideo = media?.mediaUrl?.match(/\.(mp4|mov|webm)$/i); return (
            <div key={s.id} className="rounded-xl bg-white border border-slate-200 overflow-hidden">
              <button onClick={() => setSel(s)} className="relative block w-full h-44 bg-slate-100">{media?.mediaUrl ? (isVideo ? <video src={media.mediaUrl} className="w-full h-full object-cover" muted /> : <Image src={media.mediaUrl} alt="" fill sizes="400px" className="object-cover" unoptimized />) : <div className="h-full flex items-center justify-center text-slate-400 text-sm">No media</div>}<div className="absolute top-2 left-2 flex gap-1"><Pill tone={s.status === "APPROVED" ? "green" : s.status === "REJECTED" ? "red" : "sun"}>{s.status}</Pill><Pill tone="white">{s.mission.type}</Pill></div>{["SUBMITTED", "UNDER_REVIEW"].includes(s.status) && <label className="absolute top-2 right-2 bg-white rounded-md p-1" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={picked.includes(s.id)} onChange={(e) => setPicked(e.target.checked ? [...picked, s.id] : picked.filter((x) => x !== s.id))} /></label>}</button>
              <div className="p-3 space-y-1.5">
                <div className="flex items-center gap-2"><Avatar src={s.user.avatarUrl} name={s.user.name} size={28} /><div className="min-w-0"><div className="text-sm font-bold truncate">{s.user.name} <span className="text-slate-500 font-medium">@{s.user.username}</span></div><div className="text-[10px] text-slate-400 font-mono">{s.user.id}</div></div></div>
                <div className="text-sm font-bold">{s.mission.name}</div>
                <div className="text-xs text-slate-500 flex items-center gap-1"><MapPin className="size-3" />{s.checkpoint ? `${s.checkpoint.destination.name} · ${s.checkpoint.quest.name}` : "Standalone challenge"}</div>
                <div className="text-xs text-slate-500 flex items-center gap-1"><Clock className="size-3" />{s.submittedAt ? `${fmtDate(s.submittedAt, "d MMM HH:mm")} (${timeAgo(s.submittedAt)})` : "—"} · attempt {s.attempts}</div>
                {["SUBMITTED", "UNDER_REVIEW"].includes(s.status) ? <div className="flex gap-2 pt-1"><Button size="sm" full onClick={() => { setSel(s); }}>Review</Button></div> : <div className="text-[11px] text-slate-500">{s.status === "REJECTED" ? `Reason: ${s.rejectionReason}` : `Reviewed ${fmtDate(s.reviewedAt)}`}{s.reviewedBy ? ` by @${s.reviewedBy.username}` : ""}</div>}
              </div>
            </div>); })}
        </div>
      )}
      <Sheet open={!!sel} onClose={() => setSel(null)} title="Review submission" wide>
        {sel && (
          <div className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">{mediaOf(sel).map((m) => <div key={m.id} className="rounded-xl overflow-hidden bg-black">{m.mediaUrl!.match(/\.(mp4|mov|webm)$/i) ? <video src={m.mediaUrl!} controls className="w-full max-h-96" /> : <a href={m.mediaUrl!} target="_blank" rel="noreferrer"><img src={m.mediaUrl!} alt="" className="w-full max-h-96 object-contain" /></a>}</div>)}{!mediaOf(sel).length && <div className="text-sm text-slate-500">No media attached.</div>}</div>
            {sel.requirements.filter((r) => r.requirement.type === "SOCIAL").map((r) => { const p = JSON.parse(r.payload || "{}"); return p.link ? <a key={r.id} href={p.link} target="_blank" rel="noreferrer" className="btn btn-outline min-h-9 text-xs"><ExternalLink className="size-4" />Open social post</a> : null; })}
            <div className="grid sm:grid-cols-2 gap-2 text-sm">
              <div className="rounded-lg bg-slate-50 p-3"><div className="eyebrow">Explorer</div><div className="font-bold">{sel.user.name} (@{sel.user.username})</div><div className="text-[11px] font-mono text-slate-500">{sel.user.id}</div></div>
              <div className="rounded-lg bg-slate-50 p-3"><div className="eyebrow">Quest · checkpoint</div><div className="font-bold">{sel.checkpoint?.quest.name ?? "—"}</div><div className="text-xs text-slate-600">{sel.checkpoint ? `#${sel.checkpoint.order + 1} ${sel.checkpoint.destination.name}` : "Standalone"}</div></div>
              <div className="rounded-lg bg-slate-50 p-3 sm:col-span-2"><div className="eyebrow">Mission</div><div className="font-bold">{sel.mission.name} · +{sel.mission.xp} XP</div><div className="text-xs text-slate-600">{sel.mission.instructions}</div></div>
              <div className="rounded-lg bg-slate-50 p-3"><div className="eyebrow">Submitted</div><div>{fmtDate(sel.submittedAt, "d MMM yyyy HH:mm:ss")}</div><div className="text-xs text-slate-500">Attempt {sel.attempts}</div></div>
              <div className="rounded-lg bg-slate-50 p-3"><div className="eyebrow">GPS data</div>{sel.lat ? <><div className="font-mono text-xs">{sel.lat.toFixed(5)}, {sel.lng?.toFixed(5)} ±{Math.round(sel.accuracyM ?? 0)} m</div>{sel.checkpoint && <a className="text-xs text-teal-700 font-bold" href={`https://www.google.com/maps?q=${sel.lat},${sel.lng}`} target="_blank" rel="noreferrer">Open in Google Maps ↗</a>}</> : <div className="text-xs text-slate-500">No location recorded</div>}</div>
            </div>
            {["SUBMITTED", "UNDER_REVIEW"].includes(sel.status) ? (
              <>
                <div><label className="label">Rejection reason (required to reject)</label><textarea className="input min-h-16" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Your photo doesn't clearly show the required location. Please try again." /><div className="flex flex-wrap gap-1 mt-1">{["Photo doesn't clearly show the required location.", "Please include the landmark in the frame.", "Image is too dark or blurry.", "This looks like a screenshot or stock photo."].map((r) => <button key={r} onClick={() => setReason(r)} className="pill bg-slate-100 text-slate-600 normal-case tracking-normal">{r}</button>)}</div></div>
                <div className="flex gap-2"><Button full variant="danger" loading={busy} onClick={() => decide(sel.id, "REJECT")}><X className="size-4" />REJECT</Button><Button full loading={busy} onClick={() => decide(sel.id, "APPROVE")}><Check className="size-4" />APPROVE</Button></div>
              </>
            ) : <Alert tone="info">Already {sel.status.toLowerCase()}{sel.rejectionReason ? `: ${sel.rejectionReason}` : ""}.</Alert>}
          </div>
        )}
      </Sheet>
    </div>
  );
}
