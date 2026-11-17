"use client";
import { DataTable, type Row } from "@/components/admin/data-table";
import { ENTITY_FIELDS } from "@/lib/admin/fields";
import { Pill } from "@/components/ui";
import { fmtDate } from "@/lib/utils";
type U = Row & { name: string; username: string; email: string; role: string; xpTotal: number; isActive: boolean; createdAt: string; lastLoginAt: string | null; partner?: { name: string } | null; _count: { questRuns: number; badges: number } };
export default function UsersAdmin() {
  return <DataTable<U> entity="users" title="Users & admin roles" description="Role-based access: SUPER_ADMIN, QUEST_MANAGER, VERIFICATION_ADMIN, PARTNER_ADMIN (scoped to a partner's venues and rewards), VISITOR. Permissions are enforced on every API route." fields={ENTITY_FIELDS.users}
    filters={[{ key: "role", label: "Role", options: ["VISITOR", "SUPER_ADMIN", "QUEST_MANAGER", "VERIFICATION_ADMIN", "PARTNER_ADMIN"].map((v) => ({ value: v, label: v })) }]}
    columns={[{ key: "name", label: "User", render: (u) => <div><div className="font-bold">{u.name}</div><div className="text-[11px] text-slate-500">@{u.username} · {u.email}</div></div> }, { key: "role", label: "Role", render: (u) => <div><Pill tone={u.role === "VISITOR" ? "gray" : "purple"}>{u.role}</Pill>{u.partner && <div className="text-[11px] text-slate-500">{u.partner.name}</div>}</div> }, { key: "xpTotal", label: "XP" }, { key: "_count", label: "Quests / badges", render: (u) => `${u._count.questRuns} / ${u._count.badges}` }, { key: "createdAt", label: "Joined", render: (u) => fmtDate(u.createdAt) }, { key: "isActive", label: "Status", render: (u) => u.isActive ? <Pill tone="green">active</Pill> : <Pill tone="red">deactivated</Pill> }]}
    canCreate={false} />;
}
