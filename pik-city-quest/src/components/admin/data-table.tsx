"use client";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Plus, Search, RefreshCw, Pencil, Archive } from "lucide-react";
import { getJson, postJson } from "@/components/ui/fetcher";
import { Button, Spinner } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { EntityEditor } from "./entity-editor";
import type { FieldDef } from "@/lib/admin/fields";

export type Column<T> = { key: string; label: string; render?: (row: T) => ReactNode; className?: string };
export type Row = Record<string, unknown> & { id: string };

export function DataTable<T extends Row>({ entity, title, columns, fields, filters, rowActions, canCreate = true, canEdit = true, canArchive = true, defaults, description }: { entity: string; title: string; columns: Column<T>[]; fields?: FieldDef[]; filters?: Array<{ key: string; label: string; options: Array<{ value: string; label: string }> }>; rowActions?: (row: T, reload: () => void) => ReactNode; canCreate?: boolean; canEdit?: boolean; canArchive?: boolean; defaults?: Record<string, unknown>; description?: string }) {
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [f, setF] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<T | null | "new">(null);
  const { toast } = useToast();
  const take = 25;
  const load = useCallback(async () => {
    setLoading(true);
    try { const qs = new URLSearchParams({ q, page: String(page), take: String(take), ...Object.fromEntries(Object.entries(f).map(([k, v]) => [`f_${k}`, v])) }); const r = await getJson<{ items: T[]; total: number }>(`/api/admin/${entity}?${qs}`); setItems(r.items); setTotal(r.total); }
    catch (e) { toast((e as Error).message, "error"); } finally { setLoading(false); }
  }, [entity, q, page, f, toast]);
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [load]);
  async function archive(row: T) { if (!confirm(`Archive / deactivate "${String(row.name ?? row.title ?? row.key ?? row.id)}"? History is preserved.`)) return; try { await postJson(`/api/admin/${entity}/${row.id}`, undefined, "DELETE"); toast("Archived", "success"); load(); } catch (e) { toast((e as Error).message, "error"); } }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div><h1 className="text-xl font-black text-slate-900">{title}</h1>{description && <p className="text-xs text-slate-500">{description}</p>}</div>
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" /><input className="input !pl-9 !py-2 !rounded-lg w-56" placeholder="Search…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} /></div>
          {filters?.map((fl) => <select key={fl.key} className="input !py-2 !rounded-lg w-auto" value={f[fl.key] ?? ""} onChange={(e) => { setF({ ...f, [fl.key]: e.target.value }); setPage(1); }}><option value="">{fl.label}: all</option>{fl.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>)}
          <button onClick={load} className="size-9 rounded-lg border border-slate-200 bg-white flex items-center justify-center" aria-label="Reload"><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /></button>
          {canCreate && fields && <Button size="sm" onClick={() => setEditing("new")} className="!rounded-lg"><Plus className="size-4" />New</Button>}
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500"><tr>{columns.map((c) => <th key={c.key} className={`px-3 py-2.5 font-bold ${c.className ?? ""}`}>{c.label}</th>)}<th className="px-3 py-2.5 text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {loading && !items.length && <tr><td colSpan={columns.length + 1} className="p-8 text-center"><Spinner className="mx-auto" /></td></tr>}
              {!loading && !items.length && <tr><td colSpan={columns.length + 1} className="p-8 text-center text-slate-500">No records</td></tr>}
              {items.map((row) => <tr key={row.id} className="hover:bg-slate-50/70">{columns.map((c) => <td key={c.key} className={`px-3 py-2.5 align-middle ${c.className ?? ""}`}>{c.render ? c.render(row) : String(row[c.key] ?? "—")}</td>)}<td className="px-3 py-2.5 text-right whitespace-nowrap"><div className="inline-flex gap-1">{rowActions?.(row, load)}{canEdit && fields && <button onClick={() => setEditing(row)} className="size-8 rounded-lg hover:bg-slate-100 inline-flex items-center justify-center" aria-label="Edit"><Pencil className="size-4" /></button>}{canArchive && <button onClick={() => archive(row)} className="size-8 rounded-lg hover:bg-rose-50 text-rose-600 inline-flex items-center justify-center" aria-label="Archive"><Archive className="size-4" /></button>}</div></td></tr>)}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-3 py-2 text-xs text-slate-500 border-t border-slate-100"><span>{total} records</span><div className="flex gap-1"><button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-2 py-1 rounded border disabled:opacity-40">Prev</button><span className="px-2 py-1">Page {page} / {Math.max(1, Math.ceil(total / take))}</span><button disabled={page * take >= total} onClick={() => setPage((p) => p + 1)} className="px-2 py-1 rounded border disabled:opacity-40">Next</button></div></div>
      </div>
      {fields && editing && <EntityEditor entity={entity} fields={fields} initial={editing === "new" ? (defaults ?? {}) : (editing as Record<string, unknown>)} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}
