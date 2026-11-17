"use client";
import { useEffect, useState } from "react";
import { getJson } from "@/components/ui/fetcher";
import { Spinner } from "@/components/ui";
import { Kpi, Panel } from "@/components/admin/kpi";
import { TrendChart, BarsChart, DonutChart, PALETTE } from "@/components/admin/charts";
import { formatDuration } from "@/lib/utils";

export type Stats = { kpis: Record<string, number>; series: Array<Record<string, unknown>>; topDestinations: Array<{ name: string; visits: number }>; hardestMissions: Array<{ name: string; type: string; approved: number; rejected: number; attempts: number; successRate: number; avgMinutes: number }>; missionsByType: Array<{ type: string; count: number }>; funnel: Array<{ label: string; value: number }>; dropoff: Array<{ quest: string; steps: number[] }>; questPopularity: Array<{ name: string; starts: number; completions: number }>; levelDist: Array<{ name: string; icon: string; count: number }>; partnerPerf: Array<{ partner: string; count: number }> };

export function useStats(params: Record<string, string>) {
  const [data, setData] = useState<Stats | null>(null);
  const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v))).toString();
  useEffect(() => { setData(null); getJson<Stats>(`/api/admin/stats?${qs}`).then(setData).catch(console.error); }, [qs]);
  return data;
}

export function Filters({ f, setF, quests, extra }: { f: Record<string, string>; setF: (f: Record<string, string>) => void; quests: Array<{ id: string; name: string }>; extra?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap gap-2">
      <select className="input !py-2 !rounded-lg w-auto" value={f.days} onChange={(e) => setF({ ...f, days: e.target.value })}>{[["7", "Last 7 days"], ["30", "Last 30 days"], ["90", "Last 90 days"], ["365", "Last 12 months"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
      <select className="input !py-2 !rounded-lg w-auto" value={f.quest} onChange={(e) => setF({ ...f, quest: e.target.value })}><option value="">All quests</option>{quests.map((q) => <option key={q.id} value={q.id}>{q.name}</option>)}</select>
      {extra}
    </div>
  );
}

export function Dashboard({ quests }: { quests: Array<{ id: string; name: string }> }) {
  const [f, setF] = useState<Record<string, string>>({ days: "30", quest: "" });
  const s = useStats(f);
  return (
    <div className="space-y-5">
      <Filters f={f} setF={setF} quests={quests} />
      {!s ? <div className="p-10 flex justify-center"><Spinner /></div> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
            <Kpi label="Registered users" value={s.kpis.totalUsers} sub={`+${s.kpis.newUsers} in period`} tone="teal" />
            <Kpi label="Daily / monthly active" value={`${s.kpis.dau} / ${s.kpis.mau}`} />
            <Kpi label="Active quests" value={s.kpis.activeQuests} />
            <Kpi label="Quest starts" value={s.kpis.questStarts} />
            <Kpi label="Completed quests" value={s.kpis.completedQuests} sub={`${Math.round(s.kpis.completionRate * 100)}% completion rate`} tone="green" />
            <Kpi label="Missions completed" value={s.kpis.missionsCompleted} />
            <Kpi label="Pending verifications" value={s.kpis.pendingVerifications} tone={s.kpis.pendingVerifications ? "sun" : "slate"} />
            <Kpi label="Avg quest completion" value={formatDuration(Math.round(s.kpis.avgCompletionMinutes))} />
            <Kpi label="Reward redemptions" value={s.kpis.rewardRedemptions} sub={`${s.kpis.rewardsIssued} issued · ${s.kpis.rewardsExpired} expired`} />
            <Kpi label="Mission rejection rate" value={`${Math.round(s.kpis.missionRejectionRate * 100)}%`} tone={s.kpis.missionRejectionRate > 0.2 ? "rose" : "slate"} />
            <Kpi label="QR scans" value={s.kpis.qrScans} sub={`${s.kpis.qrScanFailures} failed`} />
            <Kpi label="GPS check-ins" value={s.kpis.gpsCheckins} />
          </div>
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2"><Panel title="Activity trend"><TrendChart data={s.series} keys={[{ key: "registrations", label: "Registrations", color: PALETTE[0] }, { key: "questStarts", label: "Quest starts", color: PALETTE[1] }, { key: "questCompletions", label: "Quest completions", color: PALETTE[5] }, { key: "missions", label: "Missions approved", color: PALETTE[3] }]} /></Panel></div>
            <Panel title="Missions by type"><DonutChart data={s.missionsByType} nameKey="type" valueKey="count" /></Panel>
            <Panel title="Most visited checkpoints"><BarsChart data={s.topDestinations.slice(0, 8)} x="name" bars={[{ key: "visits", label: "Approved missions", color: PALETTE[0] }]} horizontal /></Panel>
            <Panel title="Most difficult missions (lowest success)"><div className="space-y-2">{s.hardestMissions.slice(0, 6).map((m) => <div key={m.name} className="text-xs"><div className="flex justify-between font-semibold"><span className="truncate">{m.name}</span><span>{Math.round(m.successRate * 100)}% · {m.attempts} attempts</span></div><div className="h-1.5 rounded bg-slate-100 mt-1"><div className="h-full rounded bg-rose-400" style={{ width: `${m.successRate * 100}%` }} /></div></div>)}{!s.hardestMissions.length && <div className="text-xs text-slate-500">No mission activity in this period.</div>}</div></Panel>
            <Panel title="Most popular quests"><BarsChart data={s.questPopularity.slice(0, 6)} x="name" bars={[{ key: "starts", label: "Starts", color: PALETTE[2] }, { key: "completions", label: "Completions", color: PALETTE[0] }]} /></Panel>
          </div>
        </>
      )}
    </div>
  );
}
