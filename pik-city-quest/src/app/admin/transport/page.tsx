"use client";
import { DataTable, type Row } from "@/components/admin/data-table";
import { ENTITY_FIELDS } from "@/lib/admin/fields";
import { Pill } from "@/components/ui";
type T = Row & { operator: string; code: string; name: string; category: string; color: string; isActive: boolean; _count: { stops: number } };
type F = Row & { name: string; type: string; lat: number | null; openingHours: string | null };
export default function TransportAdmin() {
  return (
    <div className="space-y-8">
      <DataTable<T> entity="transport" title="Transportation routes" description="Official routes from piktourism.com/transportation. Stop coordinates are sample data – edit the polyline / stops to match official maps." fields={ENTITY_FIELDS.transport}
        columns={[{ key: "operator", label: "Route", render: (t) => <div className="flex items-center gap-2"><span className="size-3 rounded-full" style={{ background: t.color }} /><div><div className="font-bold">{t.operator} {t.code}</div><div className="text-[11px] text-slate-500">{t.name}</div></div></div> }, { key: "category", label: "Category", render: (t) => <Pill tone="teal">{t.category}</Pill> }, { key: "_count", label: "Stops", render: (t) => t._count.stops }, { key: "isActive", label: "Status", render: (t) => t.isActive ? <Pill tone="green">active</Pill> : <Pill tone="gray">off</Pill> }]}
        defaults={{ category: "Getting Around", color: "#700055", isActive: true, polyline: "[]" }} />
      <DataTable<F> entity="facilities" title="Public facilities" description="Charging stations, hospitals, money changers, religious sites and other visitor facilities shown on the map." fields={ENTITY_FIELDS.facilities}
        columns={[{ key: "name", label: "Facility", render: (f) => <span className="font-bold">{f.name}</span> }, { key: "type", label: "Type" }, { key: "lat", label: "On map", render: (f) => f.lat ? <Pill tone="green">yes</Pill> : <Pill tone="gray">no coords</Pill> }, { key: "openingHours", label: "Hours" }]} />
    </div>
  );
}
