"use client";
import { DataTable, type Row } from "@/components/admin/data-table";
import { ENTITY_FIELDS } from "@/lib/admin/fields";
import { Pill } from "@/components/ui";
import { fmtDate } from "@/lib/utils";
type C = Row & { title: string; cadence: string; xp: number; difficulty: string; isActive: boolean; mysteryReward: boolean; startsAt: string | null; endsAt: string | null; destination?: { name: string } | null; mission?: { name: string } | null; _count: { users: number } };
export default function ChallengesAdmin() {
  return <DataTable<C> entity="challenges" title="Daily, weekly & limited-time challenges" description="Challenges complete automatically when a matching mission is approved (specific mission, specific destination, or any mission). No redevelopment needed for new challenges." fields={ENTITY_FIELDS.challenges}
    columns={[{ key: "title", label: "Challenge", render: (c) => <div><div className="font-bold">{c.title}</div><div className="text-[11px] text-slate-500">{c.mission?.name ?? c.destination?.name ?? "Any mission"}</div></div> }, { key: "cadence", label: "Cadence", render: (c) => <Pill tone="purple">{c.cadence}</Pill> }, { key: "xp", label: "XP" }, { key: "startsAt", label: "Window", render: (c) => c.startsAt || c.endsAt ? `${fmtDate(c.startsAt)} – ${fmtDate(c.endsAt)}` : "Always" }, { key: "_count", label: "Completions", render: (c) => c._count.users }, { key: "isActive", label: "Status", render: (c) => <div className="flex gap-1">{c.isActive ? <Pill tone="green">active</Pill> : <Pill tone="gray">off</Pill>}{c.mysteryReward && <Pill tone="sun">mystery</Pill>}</div> }]}
    defaults={{ cadence: "DAILY", difficulty: "EASY", xp: 30, isActive: true }} />;
}
