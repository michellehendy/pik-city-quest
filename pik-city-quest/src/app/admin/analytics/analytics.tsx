"use client";
import { useState } from "react";
import { Download } from "lucide-react";
import { Spinner } from "@/components/ui";
import { Kpi, Panel } from "@/components/admin/kpi";
import { TrendChart, BarsChart, DonutChart, Funnel, PALETTE } from "@/components/admin/charts";
import { Filters, useStats } from "../dashboard";
import { MISSION_TYPES } from "@/lib/constants";
import { formatDuration } from "@/lib/utils";

export function Analytics({ quests, areas, destinations }: { quests: Array<{ id: string; name: string }>; areas: Array<{ slug: string; name: string }>; destinations: Array<{ id: string; name: string }> }) {
  const [f, setF] = useState<Record<string, string>>({ days: "30", quest: "", area: "", destination: "", missionType: "", segment: "" });
  const s = useStats(f);
  const exportUrl = (type: string) => `/api/admin/export?type=${type}&${new URLSearchParams(f).toString()}`;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3"><div><h1 className="text-xl font-black">City Quest analytics</h1><p className="text-xs text-slate-500">User, quest, mission, destination and reward performance.</p></div>
        <div className="ml-auto flex gap-2 flex-wrap">{[["users", "Users"], ["runs", "Quest runs"], ["submissions", "Submissions"], ["redemptions", "Redemptions"], ["xp", "XP ledger"]].map(([t, l]) => <a key={t} href={exportUrl(t)} className="btn btn-outline min-h-9 px-3 text-xs !rounded-lg"><Download className="size-3.5" />{l} CSV</a>)}</div></div>
      <Filters f={f} setF={setF} quests={quests} extra={<>
        <select className="input !py-2 !rounded-lg w-auto" value={f.area} onChange={(e) => setF({ ...f, area: e.target.value })}><option value="">All areas</option>{areas.map((a) => <option key={a.slug} value={a.slug}>{a.name}</option>)}</select>
        <select className="input !py-2 !rounded-lg w-auto max-w-56" value={f.destination} onChange={(e) => setF({ ...f, destination: e.target.value })}><option value="">All destinations</option>{destinations.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
        <select className="input !py-2 !rounded-lg w-auto" value={f.missionType} onChange={(e) => setF({ ...f, missionType: e.target.value })}><option value="">All mission types</option>{MISSION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select>
        <select className="input !py-2 !rounded-lg w-auto" value={f.segment} onChange={(e) => setF({ ...f, segment: e.target.value })}><option value="">All users</option><option value="new">New users</option><option value="returning">Returning users</option></select>
      </>} />
      {!s ? <div className="p-10 flex justify-center"><Spinner /></div> : (
        <>
          <h2 className="font-black text-slate-700 text-sm uppercase tracking-wide">User performance</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3"><Kpi label="Registrations" value={s.kpis.newUsers} /><Kpi label="Active users (30d)" value={s.kpis.mau} /><Kpi label="Returning users" value={s.kpis.returningUsers} /><Kpi label="Total XP awarded" value={s.kpis.xpAwarded.toLocaleString()} /><Kpi label="Total registered" value={s.kpis.totalUsers} /></div>
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2"><Panel title="Registrations & activity"><TrendChart data={s.series} keys={[{ key: "registrations", label: "Registrations", color: PALETTE[0] }, { key: "missions", label: "Missions approved", color: PALETTE[3] }]} /></Panel></div>
            <Panel title="User level distribution"><BarsChart data={s.levelDist.map((l) => ({ ...l, name: `${l.icon} ${l.name}` }))} x="name" bars={[{ key: "count", label: "Users", color: PALETTE[1] }]} /></Panel>
          </div>
          <h2 className="font-black text-slate-700 text-sm uppercase tracking-wide">Quest performance</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3"><Kpi label="Quest starts" value={s.kpis.questStarts} /><Kpi label="Quest completions" value={s.kpis.completedQuests} /><Kpi label="Completion rate" value={`${Math.round(s.kpis.completionRate * 100)}%`} /><Kpi label="Avg completion time" value={formatDuration(Math.round(s.kpis.avgCompletionMinutes))} /></div>
          <div className="grid lg:grid-cols-2 gap-4">
            <Panel title="User funnel"><Funnel steps={s.funnel} /></Panel>
            <Panel title="Checkpoint drop-off (completions per checkpoint)"><div className="space-y-3">{s.dropoff.map((d) => <div key={d.quest}><div className="text-xs font-bold text-slate-600 mb-1">{d.quest}</div><div className="flex gap-1 items-end h-16">{d.steps.map((v, i) => { const max = Math.max(1, ...d.steps); return <div key={i} className="flex-1 flex flex-col items-center justify-end gap-0.5"><div className="w-full rounded-t bg-teal-600" style={{ height: `${(v / max) * 100}%`, minHeight: 2 }} /><span className="text-[9px] text-slate-500">{i + 1}: {v}</span></div>; })}</div></div>)}{!s.dropoff.length && <div className="text-xs text-slate-500">No quest runs in this period.</div>}</div></Panel>
            <Panel title="Most popular quests"><BarsChart data={s.questPopularity} x="name" bars={[{ key: "starts", label: "Starts", color: PALETTE[2] }, { key: "completions", label: "Completions", color: PALETTE[0] }]} /></Panel>
            <Panel title="Quest starts vs completions over time"><TrendChart data={s.series} keys={[{ key: "questStarts", label: "Starts", color: PALETTE[1] }, { key: "questCompletions", label: "Completions", color: PALETTE[5] }]} /></Panel>
          </div>
          <h2 className="font-black text-slate-700 text-sm uppercase tracking-wide">Mission & destination performance</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3"><Kpi label="Mission completion rate" value={`${Math.round(s.kpis.missionCompletionRate * 100)}%`} /><Kpi label="Mission rejection rate" value={`${Math.round(s.kpis.missionRejectionRate * 100)}%`} /><Kpi label="QR scan volume" value={s.kpis.qrScans} sub={`${s.kpis.qrScanFailures} unsuccessful`} /><Kpi label="GPS check-in volume" value={s.kpis.gpsCheckins} /></div>
          <div className="grid lg:grid-cols-3 gap-4">
            <Panel title="Most visited destinations"><BarsChart data={s.topDestinations} x="name" bars={[{ key: "visits", label: "Completed missions", color: PALETTE[0] }]} horizontal height={300} /></Panel>
            <Panel title="Most difficult missions"><div className="overflow-x-auto"><table className="w-full text-xs"><thead className="text-slate-500 text-left"><tr><th className="py-1">Mission</th><th>Type</th><th>Success</th><th>Avg time</th></tr></thead><tbody>{s.hardestMissions.map((m) => <tr key={m.name} className="border-t border-slate-100"><td className="py-1.5 font-semibold">{m.name}</td><td>{m.type}</td><td>{Math.round(m.successRate * 100)}% ({m.approved}/{m.attempts})</td><td>{m.avgMinutes ? formatDuration(Math.round(m.avgMinutes)) : "—"}</td></tr>)}</tbody></table></div></Panel>
            <Panel title="Missions by type"><DonutChart data={s.missionsByType} nameKey="type" valueKey="count" /></Panel>
          </div>
          <h2 className="font-black text-slate-700 text-sm uppercase tracking-wide">Reward performance</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3"><Kpi label="Rewards issued" value={s.kpis.rewardsIssued} /><Kpi label="Rewards redeemed" value={s.kpis.rewardRedemptions} /><Kpi label="Expired rewards" value={s.kpis.rewardsExpired} /><Kpi label="Redemption rate" value={`${s.kpis.rewardsIssued ? Math.round((s.kpis.rewardRedemptions / s.kpis.rewardsIssued) * 100) : 0}%`} /></div>
          <Panel title="Most popular reward partners"><BarsChart data={s.partnerPerf} x="partner" bars={[{ key: "count", label: "Redemptions", color: PALETTE[1] }]} /></Panel>
        </>
      )}
    </div>
  );
}
