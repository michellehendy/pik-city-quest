"use client";
import { useEffect, useState } from "react";
import { Sheet, Button, Alert } from "@/components/ui";
import { getJson, postJson } from "@/components/ui/fetcher";
import { useToast } from "@/components/ui/toast";
import type { FieldDef } from "@/lib/admin/fields";

const relCache: Record<string, Array<{ value: string; label: string }>> = {};
async function loadRelation(rel: string) {
  if (relCache[rel]) return relCache[rel];
  const r = await getJson<{ items: Array<Record<string, unknown>> }>(`/api/admin/${rel}?take=200`);
  relCache[rel] = r.items.map((i) => ({ value: String(i.id), label: String(i.name ?? i.title ?? i.key ?? i.id) }));
  return relCache[rel];
}
function toInput(v: unknown, type: FieldDef["type"]) {
  if (v == null) return type === "checkbox" ? false : "";
  if (type === "datetime" && (v instanceof Date || typeof v === "string")) { const d = new Date(v as string); return isNaN(d.getTime()) ? "" : new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }
  if (type === "date" && (v instanceof Date || typeof v === "string")) { const d = new Date(v as string); return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10); }
  if (type === "json" && typeof v !== "string") return JSON.stringify(v, null, 2);
  return v as string | boolean;
}

export function EntityEditor({ entity, fields, initial, onClose, onSaved, title }: { entity: string; fields: FieldDef[]; initial: Record<string, unknown>; onClose: () => void; onSaved: (item: Record<string, unknown>) => void; title?: string }) {
  const isNew = !initial.id;
  const [form, setForm] = useState<Record<string, unknown>>(() => Object.fromEntries(fields.map((f) => [f.name, toInput(initial[f.name], f.type)])));
  const [rels, setRels] = useState<Record<string, Array<{ value: string; label: string }>>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const { toast } = useToast();
  useEffect(() => { fields.filter((f) => f.relation).forEach((f) => loadRelation(f.relation!).then((o) => setRels((r) => ({ ...r, [f.relation!]: o })))); }, [fields]);
  async function save() {
    setBusy(true); setErr(null);
    try {
      const payload: Record<string, unknown> = {};
      for (const f of fields) { const v = form[f.name]; if (f.type === "number") payload[f.name] = v === "" ? null : Number(v); else if (f.type === "checkbox") payload[f.name] = Boolean(v); else payload[f.name] = v === "" ? null : v; }
      const r = isNew ? await postJson<{ item: Record<string, unknown> }>(`/api/admin/${entity}`, payload) : await postJson<{ item: Record<string, unknown> }>(`/api/admin/${entity}/${initial.id}`, payload, "PATCH");
      delete relCache[entity]; toast("Saved", "success"); onSaved(r.item);
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  return (
    <Sheet open onClose={onClose} title={title ?? `${isNew ? "New" : "Edit"} ${entity.replace(/s$/, "")}`} wide>
      <div className="grid grid-cols-6 gap-3">
        {fields.map((f) => {
          const span = f.width === "third" ? "col-span-6 sm:col-span-2" : f.width === "half" ? "col-span-6 sm:col-span-3" : "col-span-6";
          const v = form[f.name];
          const set = (val: unknown) => setForm({ ...form, [f.name]: val });
          return (
            <div key={f.name} className={span}>
              <label className="label">{f.label}{f.required && " *"}</label>
              {f.type === "textarea" || f.type === "json" ? <textarea className={`input min-h-24 ${f.type === "json" ? "font-mono text-xs" : ""}`} value={String(v ?? "")} onChange={(e) => set(e.target.value)} />
                : f.type === "checkbox" ? <label className="flex items-center gap-2 text-sm py-2"><input type="checkbox" checked={Boolean(v)} onChange={(e) => set(e.target.checked)} className="size-4" />{f.label}</label>
                : f.type === "select" ? <select className="input" value={String(v ?? "")} onChange={(e) => set(e.target.value)}><option value="">—</option>{f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
                : f.type === "relation" ? <select className="input" value={String(v ?? "")} onChange={(e) => set(e.target.value)}><option value="">—</option>{(rels[f.relation!] ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
                : f.type === "image" ? <div className="flex gap-2 items-center"><input className="input" value={String(v ?? "")} onChange={(e) => set(e.target.value)} placeholder="https://…" /><label className="btn btn-ghost min-h-9 px-3 text-xs cursor-pointer shrink-0">Upload<input type="file" accept="image/*" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; const fd = new FormData(); fd.append("file", file); fd.append("kind", "photo"); const r = await fetch("/api/upload", { method: "POST", body: fd }); const d = await r.json(); if (r.ok) set(d.url); else toast(d.error, "error"); }} /></label></div>
                : <input className="input" type={f.type === "number" ? "number" : f.type === "datetime" ? "datetime-local" : f.type === "date" ? "date" : f.type === "color" ? "color" : "text"} step={f.step ?? (f.type === "number" ? "any" : undefined)} value={String(v ?? "")} onChange={(e) => set(e.target.value)} />}
              {f.help && <div className="text-[11px] text-slate-500 mt-1">{f.help}</div>}
            </div>
          );
        })}
      </div>
      {err && <div className="mt-3"><Alert tone="error">{err}</Alert></div>}
      <div className="flex justify-end gap-2 mt-4"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={save} loading={busy}>{isNew ? "Create" : "Save changes"}</Button></div>
    </Sheet>
  );
}
