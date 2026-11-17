"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
export function Faq({ items }: { items: string[][] }) {
  const [open, setOpen] = useState<number | null>(0);
  return <div className="card divide-y divide-teal-800/5">{items.map(([q, a], i) => <div key={q}><button onClick={() => setOpen(open === i ? null : i)} className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left font-bold text-sm text-ink"><span>{q}</span><ChevronDown className={cn("size-4 shrink-0 transition", open === i && "rotate-180")} /></button>{open === i && <p className="px-4 pb-4 text-sm text-ink-soft">{a}</p>}</div>)}</div>;
}
