"use client";
import { DataTable, type Row } from "@/components/admin/data-table";
import { ENTITY_FIELDS } from "@/lib/admin/fields";
import { Pill } from "@/components/ui";
import { RARITY_COLORS } from "@/lib/constants";
import { postJson } from "@/components/ui/fetcher";
import { useToast } from "@/components/ui/toast";
type B = Row & { name: string; icon: string; color: string; category: string; rarity: string; xpBonus: number; criteria: string; isActive: boolean; _count: { users: number } };
type L = Row & { order: number; name: string; minXp: number; icon: string; color: string };
export default function BadgesAdmin() {
  const { toast } = useToast();
  return (
    <div className="space-y-8">
      <DataTable<B> entity="badges" title="Badge management" description="Create badges and define unlock conditions. Badges are evaluated automatically after every approved mission, quest completion and level-up." fields={ENTITY_FIELDS.badges}
        filters={[{ key: "category", label: "Category", options: ["DESTINATION", "AREA", "TRANSPORT", "EVENT", "EXPERIENCE", "QUEST", "LEVEL"].map((v) => ({ value: v, label: v })) }]}
        columns={[{ key: "name", label: "Badge", render: (b) => <div className="flex items-center gap-2"><span className="size-9 rounded-full flex items-center justify-center text-lg border-2" style={{ background: `${b.color}33`, borderColor: RARITY_COLORS[b.rarity] }}>{b.icon}</span><div><div className="font-bold">{b.name}</div><div className="text-[11px] text-slate-500">{b.category}</div></div></div> }, { key: "rarity", label: "Rarity", render: (b) => <span className="pill text-white" style={{ background: RARITY_COLORS[b.rarity] }}>{b.rarity}</span> }, { key: "criteria", label: "Criteria", render: (b) => <code className="text-[10px] text-slate-600 line-clamp-2 max-w-xs">{b.criteria}</code> }, { key: "xpBonus", label: "XP" }, { key: "_count", label: "Holders", render: (b) => b._count.users }, { key: "isActive", label: "Status", render: (b) => b.isActive ? <Pill tone="green">active</Pill> : <Pill tone="gray">inactive</Pill> }]}
        rowActions={(b) => <button onClick={async () => { const u = prompt("Grant this badge manually to username:"); if (!u) return; try { await postJson(`/api/admin/badges/${b.id}/grant`, { username: u }); toast("Badge granted", "success"); } catch (e) { toast((e as Error).message, "error"); } }} className="text-[11px] font-bold text-teal-700 px-2">Grant</button>}
        defaults={{ icon: "🏅", color: "#087088", rarity: "COMMON", category: "EXPERIENCE", xpBonus: 25, isActive: true, criteria: '{"type":"MANUAL"}' }} />
      <DataTable<L> entity="levels" title="Explorer levels" description="XP thresholds are configurable; the five levels drive the visitor's progression bar." fields={ENTITY_FIELDS.levels} canArchive={false}
        columns={[{ key: "order", label: "#" }, { key: "name", label: "Level", render: (l) => <span className="font-bold">{l.icon} {l.name}</span> }, { key: "minXp", label: "XP required" }, { key: "color", label: "Color", render: (l) => <span className="inline-flex items-center gap-1"><span className="size-4 rounded" style={{ background: l.color }} />{l.color}</span> }]} />
    </div>
  );
}
