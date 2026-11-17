"use client";
import { useEffect, useState } from "react";
import { DataTable, type Row } from "@/components/admin/data-table";
import { ENTITY_FIELDS } from "@/lib/admin/fields";
import { Pill } from "@/components/ui";
import { getJson } from "@/components/ui/fetcher";
import { fmtDate } from "@/lib/utils";
type R = Row & { name: string; partnerName: string; type: string; issuance: string; pointsCost: number | null; isActive: boolean; isSample: boolean; expiresAt: string | null; totalLimit: number | null; _count: { userRewards: number }; quest?: { name: string } | null; badge?: { name: string } | null };
type Red = { id: string; createdAt: string; location: string | null; redeemedBy: { username: string }; userReward: { voucherCode: string; user: { username: string }; reward: { name: string; partnerName: string } } };
export default function RewardsAdmin() {
  const [hist, setHist] = useState<Red[]>([]);
  useEffect(() => { getJson<{ items: Red[] }>("/api/admin/redemptions").then((r) => setHist(r.items)).catch(() => {}); }, []);
  return (
    <div className="space-y-8">
      <DataTable<R> entity="rewards" title="Reward management" description="Configure vouchers, merchandise, tickets and partner perks. Rewards can be issued on quest completion, badge unlock, points exchange or campaigns." fields={ENTITY_FIELDS.rewards}
        filters={[{ key: "issuance", label: "Issuance", options: ["QUEST_COMPLETION", "BADGE", "POINTS", "CAMPAIGN", "TOURIST_EXCLUSIVE"].map((v) => ({ value: v, label: v })) }, { key: "isActive", label: "Active", options: [{ value: "true", label: "Active" }, { value: "false", label: "Inactive" }] }]}
        columns={[{ key: "name", label: "Reward", render: (r) => <div><div className="font-bold">{r.name}</div><div className="text-[11px] text-slate-500">{r.partnerName} · {r.type}</div></div> }, { key: "issuance", label: "Issued via", render: (r) => <div className="text-xs"><Pill tone="teal">{r.issuance}</Pill><div className="text-slate-500 mt-0.5">{r.quest?.name ?? r.badge?.name ?? (r.pointsCost != null ? `${r.pointsCost} pts` : "")}</div></div> }, { key: "_count", label: "Issued", render: (r) => `${r._count.userRewards}${r.totalLimit ? ` / ${r.totalLimit}` : ""}` }, { key: "expiresAt", label: "Expiry", render: (r) => r.expiresAt ? fmtDate(r.expiresAt) : "—" }, { key: "isActive", label: "Status", render: (r) => <div className="flex gap-1">{r.isActive ? <Pill tone="green">active</Pill> : <Pill tone="gray">inactive</Pill>}{r.isSample && <Pill tone="sun">sample</Pill>}</div> }]}
        defaults={{ type: "DISCOUNT", issuance: "QUEST_COMPLETION", voucherPrefix: "PIK", validDays: 30, perUserLimit: 1, isActive: true }} />
      <section className="rounded-xl bg-white border border-slate-200 p-4"><h2 className="font-extrabold mb-3">Redemption history</h2><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-[11px] uppercase text-slate-500"><tr><th className="py-2">When</th><th>Reward</th><th>Explorer</th><th>Voucher</th><th>Redeemed by</th><th>Location</th></tr></thead><tbody className="divide-y divide-slate-100">{hist.map((h) => <tr key={h.id}><td className="py-2">{fmtDate(h.createdAt, "d MMM yyyy HH:mm")}</td><td>{h.userReward.reward.name}<div className="text-[11px] text-slate-500">{h.userReward.reward.partnerName}</div></td><td>@{h.userReward.user.username}</td><td className="font-mono text-xs">{h.userReward.voucherCode}</td><td>@{h.redeemedBy.username}</td><td>{h.location ?? "—"}</td></tr>)}{!hist.length && <tr><td colSpan={6} className="py-6 text-center text-slate-500">No redemptions yet</td></tr>}</tbody></table></div></section>
    </div>
  );
}
