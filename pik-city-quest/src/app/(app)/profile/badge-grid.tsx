"use client";
import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Lock } from "lucide-react";
import { RARITY_COLORS } from "@/lib/constants";
import { cn, fmtDate } from "@/lib/utils";

export type BadgeItem = { id: string; slug: string; name: string; icon: string; color: string; rarity: string; category: string; description: string; earnedAt: string | null };

export function BadgeTile({ b, size = "md" }: { b: BadgeItem; size?: "sm" | "md" | "lg" }) {
  const owned = !!b.earnedAt;
  const dim = size === "lg" ? "size-28 text-5xl" : size === "sm" ? "size-14 text-2xl" : "size-20 text-3xl";
  return (
    <Link href={`/profile/badges/${b.slug}`} className="flex flex-col items-center text-center gap-1.5 group">
      <div className={cn("relative rounded-full flex items-center justify-center border-4 transition group-hover:scale-105", dim)} style={{ background: owned ? `radial-gradient(circle at 30% 30%, ${b.color}ee, ${b.color}99)` : "#eef2f4", borderColor: owned ? RARITY_COLORS[b.rarity] : "#e2e8f0", filter: owned ? undefined : "grayscale(1)", boxShadow: owned ? `0 10px 24px -10px ${b.color}` : undefined }}>
        <span className={cn(!owned && "opacity-40")}>{b.icon}</span>
        {!owned && <span className="absolute -bottom-1 -right-1 size-6 rounded-full bg-white shadow-card flex items-center justify-center"><Lock className="size-3 text-ink-soft" /></span>}
      </div>
      <div className="text-[11px] font-bold leading-tight text-ink line-clamp-2 max-w-[90px]">{b.name}</div>
      <div className="text-[9px] font-black uppercase tracking-wider" style={{ color: RARITY_COLORS[b.rarity] }}>{owned ? fmtDate(b.earnedAt) : b.rarity}</div>
    </Link>
  );
}

export function BadgeGrid({ badges, collapsible }: { badges: BadgeItem[]; collapsible?: boolean }) {
  const [open, setOpen] = useState(false);
  const owned = badges.filter((b) => b.earnedAt);
  const locked = badges.filter((b) => !b.earnedAt);
  const sorted = [...owned, ...locked];
  const shown = collapsible && !open ? sorted.slice(0, 8) : sorted;
  return (
    <div>
      <div className="text-[11px] font-semibold text-ink-soft mb-3">{owned.length} of {badges.length} collected</div>
      <div className="grid grid-cols-4 gap-3">{shown.map((b) => <BadgeTile key={b.id} b={b} />)}</div>
      {collapsible && sorted.length > 8 && <button onClick={() => setOpen((s) => !s)} className="mt-3 w-full btn btn-ghost min-h-9 text-xs">{open ? "Show less" : `See more (${sorted.length - 8})`}<ChevronDown className={cn("size-4 transition", open && "rotate-180")} /></button>}
    </div>
  );
}
