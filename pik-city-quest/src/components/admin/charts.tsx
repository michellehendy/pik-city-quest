"use client";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Legend, PieChart, Pie, Cell } from "recharts";

export const PALETTE = ["#087088", "#f8b818", "#40c0c8", "#8b5cf6", "#ff6b5b", "#10b981", "#0ea5e9", "#d97706"];
const axis = { fontSize: 11, fill: "#64748b" };

export function TrendChart({ data, keys }: { data: Array<Record<string, unknown>>; keys: Array<{ key: string; label: string; color: string }> }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ left: -18, right: 8, top: 8 }}>
        <defs>{keys.map((k) => <linearGradient key={k.key} id={`g-${k.key}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={k.color} stopOpacity={0.35} /><stop offset="1" stopColor={k.color} stopOpacity={0} /></linearGradient>)}</defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="date" tick={axis} tickFormatter={(d: string) => d.slice(5)} minTickGap={24} />
        <YAxis tick={axis} allowDecimals={false} />
        <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {keys.map((k) => <Area key={k.key} type="monotone" dataKey={k.key} name={k.label} stroke={k.color} fill={`url(#g-${k.key})`} strokeWidth={2} />)}
      </AreaChart>
    </ResponsiveContainer>
  );
}
export function BarsChart({ data, x, bars, horizontal, height = 240 }: { data: Array<Record<string, unknown>>; x: string; bars: Array<{ key: string; label: string; color: string }>; horizontal?: boolean; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout={horizontal ? "vertical" : "horizontal"} margin={{ left: horizontal ? 40 : -18, right: 8, top: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={!horizontal} horizontal={horizontal ? false : true} />
        {horizontal ? <><XAxis type="number" tick={axis} allowDecimals={false} /><YAxis type="category" dataKey={x} tick={axis} width={120} /></> : <><XAxis dataKey={x} tick={axis} interval={0} angle={data.length > 6 ? -20 : 0} height={data.length > 6 ? 50 : 30} /><YAxis tick={axis} allowDecimals={false} /></>}
        <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
        {bars.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {bars.map((b) => <Bar key={b.key} dataKey={b.key} name={b.label} fill={b.color} radius={[6, 6, 0, 0]} />)}
      </BarChart>
    </ResponsiveContainer>
  );
}
export function DonutChart({ data, nameKey, valueKey }: { data: Array<Record<string, unknown>>; nameKey: string; valueKey: string }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart><Pie data={data} dataKey={valueKey} nameKey={nameKey} innerRadius={55} outerRadius={90} paddingAngle={2}>{data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}</Pie><Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} /><Legend wrapperStyle={{ fontSize: 12 }} /></PieChart>
    </ResponsiveContainer>
  );
}
export function Funnel({ steps }: { steps: Array<{ label: string; value: number }> }) {
  const max = Math.max(1, ...steps.map((s) => s.value));
  return (
    <div className="space-y-2">
      {steps.map((s, i) => { const prev = i ? steps[i - 1].value : s.value; const conv = prev ? Math.round((s.value / prev) * 100) : 100; return (
        <div key={s.label}>
          <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1"><span>{s.label}</span><span>{s.value.toLocaleString()}{i > 0 && <span className="text-slate-400"> · {conv}%</span>}</span></div>
          <div className="mx-auto h-8 rounded-lg transition-all" style={{ width: `${Math.max(8, (s.value / max) * 100)}%`, background: `linear-gradient(90deg, ${PALETTE[0]}, ${PALETTE[2]})` }} />
          {i < steps.length - 1 && <div className="text-center text-slate-300 leading-none">↓</div>}
        </div>); })}
    </div>
  );
}
