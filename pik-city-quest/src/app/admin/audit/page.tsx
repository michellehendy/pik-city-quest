import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { fmtDate } from "@/lib/utils";
export const dynamic = "force-dynamic";
export default async function AuditPage() {
  await requirePermission("audit.view");
  const logs = await prisma.auditLog.findMany({ include: { actor: { select: { username: true, role: true } } }, orderBy: { createdAt: "desc" }, take: 300 });
  return (
    <div className="space-y-4"><div><h1 className="text-xl font-black">Audit log</h1><p className="text-xs text-slate-500">Administrative actions, verifications, redemptions and account events.</p></div>
      <div className="rounded-xl bg-white border border-slate-200 overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 text-left text-[11px] uppercase text-slate-500"><tr><th className="px-3 py-2">When</th><th className="px-3 py-2">Actor</th><th className="px-3 py-2">Action</th><th className="px-3 py-2">Entity</th><th className="px-3 py-2">Details</th></tr></thead><tbody className="divide-y divide-slate-100">{logs.map((l) => <tr key={l.id}><td className="px-3 py-2 whitespace-nowrap">{fmtDate(l.createdAt, "d MMM yyyy HH:mm:ss")}</td><td className="px-3 py-2">{l.actor ? `@${l.actor.username}` : "system"}<div className="text-[11px] text-slate-500">{l.actor?.role}</div></td><td className="px-3 py-2 font-mono text-xs">{l.action}</td><td className="px-3 py-2">{l.entity}<div className="text-[10px] text-slate-400 font-mono">{l.entityId}</div></td><td className="px-3 py-2 text-xs text-slate-600 font-mono max-w-md truncate">{l.meta}</td></tr>)}</tbody></table></div>
    </div>
  );
}
