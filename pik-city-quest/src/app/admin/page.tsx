import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { Dashboard } from "./dashboard";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const me = (await getCurrentUser())!;
  const quests = await prisma.quest.findMany({ where: { archivedAt: null }, select: { id: true, name: true }, orderBy: { sortOrder: "asc" } });
  const pending = await prisma.missionSubmission.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } });
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3"><div><h1 className="text-xl font-black">Dashboard overview</h1><p className="text-xs text-slate-500">All numbers reflect recorded activity in the platform.</p></div>
        {pending > 0 && hasPermission(me.role, "verification.review") && <Link href="/admin/verification" className="ml-auto rounded-lg bg-sun-100 text-sun-600 px-3 py-2 text-xs font-bold">⏳ {pending} submission{pending === 1 ? "" : "s"} awaiting review →</Link>}</div>
      <Dashboard quests={quests} />
    </div>
  );
}
