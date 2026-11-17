"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import confetti from "canvas-confetti";
import { CheckCircle2, Clock, Lock, RotateCcw, Share2, ArrowRight, Hourglass, XCircle } from "lucide-react";
import { Button, Alert, Pill } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { getJson, postJson } from "@/components/ui/fetcher";
import { QrScanner } from "./qr-scanner";
import { GpsCheckin, getPosition, type Geo } from "./gps-checkin";
import { Quiz, type QuizQuestion } from "./quiz";
import { MediaUpload } from "./media-upload";
import { MISSION_TYPE_META } from "@/lib/constants";
import { cn } from "@/lib/utils";

export type SafeRequirement = { id: string; order: number; type: string; label: string | null; isMandatory: boolean; config: { questions?: QuizQuestion[]; timerSec?: number | null; maxAttempts?: number | null; prompt?: string; maxSizeMB?: number; radiusM?: number; timeWindow?: { from: string; to: string }; platform?: string; hashtag?: string } };
export type RunnerProps = {
  mission: { id: string; name: string; description: string; instructions: string; type: string; xp: number; difficulty: string; verification: string; stepsOrdered: boolean; maxAttempts: number | null; timeLimitSec: number | null; requirements: SafeRequirement[] };
  destination: { name: string; lat: number; lng: number; gpsRadiusM: number; slug: string } | null;
  checkpointId: string | null; runId: string | null; questId: string | null; questSlug: string | null;
  initial: { id: string; status: string; rejectionReason: string | null; requirements: Array<{ requirementId: string; status: string; attempts: number; rejectionReason: string | null }> } | null;
};
type SubState = NonNullable<RunnerProps["initial"]>;

export function MissionRunner(p: RunnerProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [sub, setSub] = useState<SubState | null>(p.initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error" | "info"; text: string } | null>(null);
  const [geo, setGeo] = useState<Geo | null>(null);
  const [next, setNext] = useState<{ checkpointId: string; missionId: string; destination: string; mission: string } | null | undefined>(undefined);
  const [questDone, setQuestDone] = useState(false);

  const ensureSubmission = useCallback(async () => {
    if (sub) return sub;
    const r = await postJson<{ submission: SubState }>("/api/missions/submission", { missionId: p.mission.id, checkpointId: p.checkpointId, runId: p.runId });
    setSub(r.submission); return r.submission;
  }, [sub, p.mission.id, p.checkpointId, p.runId]);

  useEffect(() => { if (!sub) ensureSubmission().catch((e) => setMsg({ tone: "error", text: e.message })); }, [sub, ensureSubmission]);

  const refreshProgress = useCallback(async () => {
    if (!p.questId) return;
    const r = await getJson<{ status: string; next: RunnerProps extends never ? never : { checkpointId: string; missionId: string; destination: string; mission: string } | null }>(`/api/quests/${p.questId}/progress`);
    if (r.status === "COMPLETED") setQuestDone(true); else setNext(r.next);
  }, [p.questId]);

  async function verify(reqId: string, payload: Record<string, unknown>, g?: Geo | null, mediaUrl?: string | null) {
    setBusy(true); setMsg(null);
    try {
      const s = await ensureSubmission();
      let useGeo = g ?? geo;
      if (!useGeo && ["PHOTO", "VIDEO"].includes(p.mission.requirements.find((r) => r.id === reqId)?.type ?? "")) { try { useGeo = await getPosition(); } catch { /* optional */ } }
      const r = await postJson<{ ok: boolean; message: string; status: string }>(`/api/missions/submission/${s.id}/requirement/${reqId}`, { payload, geo: useGeo ?? null, mediaUrl: mediaUrl ?? null });
      setMsg({ tone: r.ok ? "success" : "error", text: r.message });
      const fresh = await postJson<{ submission: SubState }>("/api/missions/submission", { missionId: p.mission.id, checkpointId: p.checkpointId, runId: p.runId });
      setSub(fresh.submission);
      if (fresh.submission.status === "APPROVED") { confetti({ particleCount: 140, spread: 80, origin: { y: 0.7 }, colors: ["#087088", "#40c0c8", "#f8b818", "#ffffff"] }); toast(`Mission approved! +${p.mission.xp} XP`, "success"); await refreshProgress(); router.refresh(); }
      else if (r.ok) toast(r.message, "success");
    } catch (e) { setMsg({ tone: "error", text: (e as Error).message }); } finally { setBusy(false); }
  }
  async function retry() {
    if (!sub) return; setBusy(true);
    try { const r = await postJson<{ submission: SubState }>(`/api/missions/submission/${sub.id}/retry`); setSub({ ...r.submission, requirements: sub.requirements.map((x) => ({ ...x, status: x.status === "REJECTED" ? "PENDING" : x.status })) }); setMsg(null); } catch (e) { setMsg({ tone: "error", text: (e as Error).message }); } finally { setBusy(false); }
  }

  const statusOf = (rid: string) => sub?.requirements.find((r) => r.requirementId === rid)?.status ?? "PENDING";
  const attemptsOf = (rid: string) => sub?.requirements.find((r) => r.requirementId === rid)?.attempts ?? 0;
  const firstOpenIdx = p.mission.requirements.findIndex((r) => !["APPROVED", "SUBMITTED"].includes(statusOf(r.id)));
  const overall = sub?.status ?? "NOT_STARTED";

  if (overall === "APPROVED") {
    return (
      <div className="card p-6 text-center space-y-3">
        <div className="mx-auto size-24 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center animate-pop"><CheckCircle2 className="size-12" /></div>
        <div className="eyebrow">Mission completed</div>
        <h2 className="text-2xl font-black text-ink">{p.mission.name}</h2>
        <div className="flex justify-center gap-2"><Pill tone="sun">+{p.mission.xp} XP</Pill>{p.destination && <Pill tone="teal">{p.destination.name} stamp</Pill>}</div>
        {questDone ? <Button href={`/quests/${p.questSlug}/complete`} variant="sun" full size="lg">🎉 Quest complete — claim your reward</Button>
          : next ? <Button href={`/quests/${p.questSlug}/mission/${next.checkpointId}/${next.missionId}`} full size="lg">Next: {next.mission} @ {next.destination} <ArrowRight className="size-4" /></Button>
          : next === null && p.questSlug ? <Button href={`/quests/${p.questSlug}`} full>Back to quest</Button>
          : <Button href={p.questSlug ? `/quests/${p.questSlug}` : "/quests"} variant="ghost" full>Back to quest</Button>}
        <ShareMission mission={p.mission.name} destination={p.destination?.name} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {overall === "REJECTED" && (
        <div className="card p-5 border-2 border-rose-200 space-y-2">
          <div className="flex items-center gap-2 text-rose-700 font-black"><XCircle className="size-5" />MISSION NOT APPROVED</div>
          <p className="text-sm text-ink-soft">{sub?.rejectionReason || "Your submission didn't meet the requirements. Please try again."}</p>
          <Button onClick={retry} loading={busy} variant="danger" full><RotateCcw className="size-4" />RETRY MISSION</Button>
        </div>
      )}
      {(overall === "SUBMITTED" || overall === "UNDER_REVIEW") && (
        <div className="card p-5 border-2 border-sun-300 flex items-start gap-3">
          <Hourglass className="size-6 text-sun-600 shrink-0 mt-0.5" />
          <div><div className="font-black text-ink">Submitted · waiting for verification</div><p className="text-sm text-ink-soft">The PIK Tourism team reviews photo and video missions. You'll get a notification when it's approved — feel free to continue to other checkpoints that are already unlocked.</p></div>
        </div>
      )}
      {msg && <Alert tone={msg.tone === "info" ? "info" : msg.tone}>{msg.text}</Alert>}
      {p.mission.requirements.map((req, i) => {
        const st = statusOf(req.id);
        const locked = p.mission.stepsOrdered && i > firstOpenIdx && firstOpenIdx !== -1 && st === "PENDING";
        const open = i === firstOpenIdx && !["SUBMITTED", "UNDER_REVIEW"].includes(overall) && overall !== "REJECTED";
        const meta = MISSION_TYPE_META[req.type];
        const maxA = req.config.maxAttempts ?? p.mission.maxAttempts ?? null;
        return (
          <div key={req.id} className={cn("card p-4 transition", locked && "opacity-60")}>
            <div className="flex items-center gap-3">
              <div className={cn("size-9 rounded-full flex items-center justify-center text-sm font-black", st === "APPROVED" ? "bg-emerald-100 text-emerald-700" : st === "SUBMITTED" ? "bg-sun-100 text-sun-600" : st === "REJECTED" ? "bg-rose-100 text-rose-700" : "bg-teal-50 text-teal-800")}>{st === "APPROVED" ? <CheckCircle2 className="size-5" /> : st === "SUBMITTED" ? <Clock className="size-4" /> : locked ? <Lock className="size-4" /> : i + 1}</div>
              <div className="flex-1 min-w-0"><div className="font-extrabold text-sm text-ink">{p.mission.requirements.length > 1 ? `Step ${i + 1}: ` : ""}{req.label ?? meta?.label}</div><div className="text-[11px] text-ink-soft">{meta?.hint}{!req.isMandatory && " · optional"}{maxA ? ` · ${attemptsOf(req.id)}/${maxA} attempts` : ""}</div></div>
              <Pill tone={st === "APPROVED" ? "green" : st === "SUBMITTED" ? "sun" : st === "REJECTED" ? "red" : "gray"}>{st === "PENDING" ? (locked ? "locked" : "to do") : st.toLowerCase()}</Pill>
            </div>
            {open && !locked && (
              <div className="mt-4">
                {req.type === "QR" && <QrScanner busy={busy} onToken={(t) => verify(req.id, { qrToken: t })} />}
                {(req.type === "GPS" || req.type === "EVENT_CHECKIN") && p.destination && <GpsCheckin target={p.destination} radiusM={req.config.radiusM ?? p.destination.gpsRadiusM} busy={busy} onCheckin={(g) => { setGeo(g); verify(req.id, {}, g); }} />}
                {req.type === "QUIZ" && <Quiz questions={req.config.questions ?? []} timerSec={req.config.timerSec} busy={busy} onSubmit={(answers) => verify(req.id, { answers })} />}
                {req.type === "CODE" && <CodeEntry busy={busy} onSubmit={(code) => verify(req.id, { code })} />}
                {(req.type === "PHOTO" || req.type === "FIND_OBJECT") && <MediaUpload kind="photo" prompt={req.config.prompt} maxSizeMB={req.config.maxSizeMB} busy={busy} geo={geo} onUploaded={(url) => verify(req.id, { note: "photo" }, null, url)} />}
                {req.type === "VIDEO" && <MediaUpload kind="video" prompt={req.config.prompt} maxSizeMB={req.config.maxSizeMB} busy={busy} geo={geo} onUploaded={(url) => verify(req.id, { note: "video" }, null, url)} />}
                {req.type === "SOCIAL" && <SocialEntry hashtag={req.config.hashtag} busy={busy} onSubmit={(link) => verify(req.id, { link })} />}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CodeEntry({ onSubmit, busy }: { onSubmit: (c: string) => void; busy?: boolean }) {
  const [v, setV] = useState("");
  return <form onSubmit={(e) => { e.preventDefault(); onSubmit(v); }} className="flex gap-2"><input className="input uppercase tracking-widest font-black" placeholder="SECRET CODE" value={v} onChange={(e) => setV(e.target.value)} autoCapitalize="characters" /><Button type="submit" loading={busy} disabled={!v.trim()}>Unlock</Button></form>;
}
function SocialEntry({ onSubmit, busy, hashtag }: { onSubmit: (l: string) => void; busy?: boolean; hashtag?: string }) {
  const [v, setV] = useState("");
  return <div className="space-y-2"><p className="text-sm text-ink-soft">Post your photo{hashtag ? ` with ${hashtag}` : ""} and paste the link below. The PIK Tourism team will verify it.</p><form onSubmit={(e) => { e.preventDefault(); onSubmit(v); }} className="flex gap-2"><input className="input" placeholder="https://instagram.com/p/…" value={v} onChange={(e) => setV(e.target.value)} /><Button type="submit" loading={busy} disabled={!v.trim()}>Submit</Button></form></div>;
}
function ShareMission({ mission, destination }: { mission: string; destination?: string }) {
  const text = `I just completed "${mission}"${destination ? ` at ${destination}` : ""} on PIK CITY QUEST! 🧭 #PIKCityQuest #PIKTourism`;
  async function share() { try { if (navigator.share) await navigator.share({ title: "PIK CITY QUEST", text, url: location.origin }); else { await navigator.clipboard.writeText(text); } } catch { /* cancelled */ } }
  return <div className="flex justify-center gap-2 pt-1"><Button variant="ghost" size="sm" onClick={share}><Share2 className="size-4" />Share</Button><Link href="/profile/badges" className="btn btn-ghost min-h-9 px-3.5 py-2 text-xs">View badges</Link></div>;
}
