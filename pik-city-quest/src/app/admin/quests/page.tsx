"use client";
import Link from "next/link";
import Image from "next/image";
import { Copy, Eye, Pencil, Rocket, Archive } from "lucide-react";
import { DataTable, type Row } from "@/components/admin/data-table";
import { Button, Pill } from "@/components/ui";
import { postJson } from "@/components/ui/fetcher";
import { useToast } from "@/components/ui/toast";
import { fmtDate, formatDuration } from "@/lib/utils";
type Q = Row & { name: string; slug: string; type: string; status: string; difficulty: string; durationMinutes: number; coverImage: string | null; completionRule: string; startsAt: string | null; endsAt: string | null; isFeatured: boolean; _count: { checkpoints: number; runs: number } };
export default function QuestsAdmin() {
  const { toast } = useToast();
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button href="/admin/quests/new" size="sm" className="!rounded-lg"><Rocket className="size-4" />Create quest</Button></div>
      <DataTable<Q> entity="quests" title="Quest management" description="Create, duplicate, schedule, publish and archive quests. Published quests appear in the visitor app instantly." canCreate={false} canEdit={false} canArchive={false}
        filters={[{ key: "status", label: "Status", options: ["DRAFT", "PUBLISHED", "ARCHIVED"].map((v) => ({ value: v, label: v })) }, { key: "type", label: "Type", options: ["SPECIAL", "REGULAR"].map((v) => ({ value: v, label: v })) }]}
        columns={[{ key: "name", label: "Quest", render: (q) => <div className="flex items-center gap-2"><div className="relative size-10 rounded-md overflow-hidden bg-slate-100 shrink-0">{q.coverImage && <Image src={q.coverImage} alt="" fill sizes="40px" className="object-cover" />}</div><div><div className="font-bold">{q.name}{q.isFeatured && " ★"}</div><div className="text-[11px] text-slate-500">/{q.slug}</div></div></div> }, { key: "status", label: "Status", render: (q) => <Pill tone={q.status === "PUBLISHED" ? "green" : q.status === "DRAFT" ? "sun" : "gray"}>{q.status}</Pill> }, { key: "type", label: "Type / rule", render: (q) => <div className="text-xs"><Pill tone={q.type === "SPECIAL" ? "sun" : "teal"}>{q.type}</Pill><div className="text-slate-500 mt-0.5">{q.completionRule} · {q.difficulty} · {formatDuration(q.durationMinutes)}</div></div> }, { key: "_count", label: "Checkpoints / runs", render: (q) => `${q._count.checkpoints} / ${q._count.runs}` }, { key: "startsAt", label: "Schedule", render: (q) => q.startsAt || q.endsAt ? `${fmtDate(q.startsAt)} – ${fmtDate(q.endsAt)}` : "Always on" }]}
        rowActions={(q, reload) => (
          <>
            <Link href={`/admin/quests/${q.id}`} className="size-8 rounded-lg hover:bg-slate-100 inline-flex items-center justify-center" aria-label="Edit"><Pencil className="size-4" /></Link>
            <Link href={`/quests/${q.slug}`} target="_blank" className="size-8 rounded-lg hover:bg-slate-100 inline-flex items-center justify-center" aria-label="Preview"><Eye className="size-4" /></Link>
            <button onClick={async () => { await postJson(`/api/admin/quest-builder/${q.id}/duplicate`); toast("Duplicated as draft", "success"); reload(); }} className="size-8 rounded-lg hover:bg-slate-100 inline-flex items-center justify-center" aria-label="Duplicate"><Copy className="size-4" /></button>
            {q.status !== "PUBLISHED" ? <button onClick={async () => { try { await postJson(`/api/admin/quest-builder/${q.id}/publish`, { status: "PUBLISHED" }); toast("Published", "success"); reload(); } catch (e) { toast((e as Error).message, "error"); } }} className="text-[11px] font-bold text-emerald-700 px-2">Publish</button>
              : <button onClick={async () => { await postJson(`/api/admin/quest-builder/${q.id}/publish`, { status: "DRAFT" }); toast("Unpublished", "success"); reload(); }} className="text-[11px] font-bold text-slate-600 px-2">Unpublish</button>}
            {q.status !== "ARCHIVED" && <button onClick={async () => { if (!confirm("Archive this quest? Visitor history is kept.")) return; await postJson(`/api/admin/quest-builder/${q.id}/publish`, { status: "ARCHIVED" }); reload(); }} className="size-8 rounded-lg hover:bg-rose-50 text-rose-600 inline-flex items-center justify-center" aria-label="Archive"><Archive className="size-4" /></button>}
          </>
        )} />
    </div>
  );
}
