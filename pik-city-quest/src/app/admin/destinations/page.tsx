"use client";
import Image from "next/image";
import { DataTable, type Row } from "@/components/admin/data-table";
import { ENTITY_FIELDS, AREA_OPTIONS } from "@/lib/admin/fields";
import { Pill } from "@/components/ui";
type D = Row & { name: string; category: string; area: { name: string; slug: string }; coverImage: string | null; lat: number; lng: number; gpsRadiusM: number; isActive: boolean; isSample: boolean; _count: { checkpoints: number; missions: number } };
export default function DestinationsAdmin() {
  return <DataTable<D> entity="destinations" title="Location management" description="Centralised destination database (imported from piktourism.com). Destinations are reused across quests and missions." fields={ENTITY_FIELDS.destinations}
    filters={[{ key: "category", label: "Category", options: ["Main Destinations", "Culinary", "Night Life", "Beach & Water", "Activities", "Shopping", "Photo Spot", "Spiritual", "Green Tourism", "Sport", "Paw Proved"].map((c) => ({ value: c, label: c })) }, { key: "isActive", label: "Active", options: [{ value: "true", label: "Active" }, { value: "false", label: "Inactive" }] }]}
    columns={[{ key: "name", label: "Destination", render: (d) => <div className="flex items-center gap-2"><div className="relative size-9 rounded-md overflow-hidden bg-slate-100 shrink-0">{d.coverImage && <Image src={d.coverImage} alt="" fill sizes="36px" className="object-cover" />}</div><div><div className="font-bold">{d.name}</div><div className="text-[11px] text-slate-500">{d.category}</div></div></div> }, { key: "area", label: "Area", render: (d) => <Pill tone="teal">{d.area?.name}</Pill> }, { key: "lat", label: "Coordinates", render: (d) => <span className="font-mono text-xs">{d.lat.toFixed(5)}, {d.lng.toFixed(5)} · r{d.gpsRadiusM}m</span> }, { key: "_count", label: "Quests / missions", render: (d) => `${d._count.checkpoints} / ${d._count.missions}` }, { key: "isActive", label: "Status", render: (d) => <div className="flex gap-1">{d.isActive ? <Pill tone="green">active</Pill> : <Pill tone="gray">inactive</Pill>}{d.isSample && <Pill tone="sun">sample</Pill>}</div> }]}
    defaults={{ gpsRadiusM: 100, isActive: true, gallery: "[]", categories: "[]", tags: "[]", areaId: AREA_OPTIONS[0].value }} />;
}
