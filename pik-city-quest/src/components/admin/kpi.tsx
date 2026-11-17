export function Kpi({ label, value, sub, tone = "slate" }: { label: string; value: string | number; sub?: string; tone?: "slate" | "teal" | "sun" | "rose" | "green" }) {
  const t = { slate: "border-slate-200", teal: "border-teal-600", sun: "border-sun-500", rose: "border-rose-500", green: "border-emerald-500" }[tone];
  return <div className={`rounded-xl bg-white border border-slate-200 border-l-4 ${t} p-4`}><div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</div><div className="text-2xl font-black text-slate-900 mt-0.5">{value}</div>{sub && <div className="text-[11px] text-slate-500 mt-0.5">{sub}</div>}</div>;
}
export function Panel({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return <section className="rounded-xl bg-white border border-slate-200 p-4"><div className="flex items-center justify-between mb-3"><h3 className="font-extrabold text-slate-900">{title}</h3>{action}</div>{children}</section>;
}
