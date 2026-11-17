"use client";
import { DataTable, type Row } from "@/components/admin/data-table";
import { ENTITY_FIELDS } from "@/lib/admin/fields";
import { Pill } from "@/components/ui";
import { fmtDate } from "@/lib/utils";
type E = Row & { title: string; category: string; startDate: string; endDate: string; location: string | null; isActive: boolean; destination?: { name: string } | null };
export default function EventsAdmin() {
  return <DataTable<E> entity="events" title="Events" description="Events imported from piktourism.com/event. Link an event to a destination to enable EVENT_CHECKIN missions and event badges." fields={ENTITY_FIELDS.events}
    columns={[{ key: "title", label: "Event", render: (e) => <div><div className="font-bold">{e.title}</div><div className="text-[11px] text-slate-500">{e.category}</div></div> }, { key: "startDate", label: "Dates", render: (e) => `${fmtDate(e.startDate)} – ${fmtDate(e.endDate)}` }, { key: "location", label: "Location", render: (e) => e.destination?.name ?? e.location ?? "—" }, { key: "isActive", label: "Status", render: (e) => e.isActive ? <Pill tone="green">active</Pill> : <Pill tone="gray">off</Pill> }]}
    defaults={{ category: "Community", isActive: true }} />;
}
