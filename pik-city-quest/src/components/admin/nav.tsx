"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Compass, MapPin, Target, ShieldCheck, QrCode, Gift, Award, BarChart3, Users, ScanLine, ScrollText, Settings2, CalendarDays, Bus, Flame, Menu, X, LogOut, ExternalLink } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export const ADMIN_NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, perm: "admin.access" },
  { href: "/admin/quests", label: "Quests", icon: Compass, perm: "quests.manage" },
  { href: "/admin/destinations", label: "Destinations", icon: MapPin, perm: "venue.view" },
  { href: "/admin/missions", label: "Missions", icon: Target, perm: "venue.view" },
  { href: "/admin/verification", label: "Verification", icon: ShieldCheck, perm: "verification.review" },
  { href: "/admin/qr", label: "QR Codes", icon: QrCode, perm: "qr.manage" },
  { href: "/admin/rewards", label: "Rewards", icon: Gift, perm: "rewards.manage" },
  { href: "/admin/redeem", label: "Redeem scanner", icon: ScanLine, perm: "redemption.verify" },
  { href: "/admin/badges", label: "Badges & Levels", icon: Award, perm: "badges.manage" },
  { href: "/admin/challenges", label: "Challenges", icon: Flame, perm: "quests.manage" },
  { href: "/admin/events", label: "Events", icon: CalendarDays, perm: "destinations.manage" },
  { href: "/admin/transport", label: "Transport & facilities", icon: Bus, perm: "destinations.manage" },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3, perm: "analytics.view" },
  { href: "/admin/users", label: "Users & roles", icon: Users, perm: "users.manage" },
  { href: "/admin/audit", label: "Audit log", icon: ScrollText, perm: "audit.view" },
  { href: "/admin/settings", label: "XP rules & settings", icon: Settings2, perm: "settings.manage" },
];

export function AdminNav({ allowed, name, role }: { allowed: string[]; name: string; role: string }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const items = ADMIN_NAV.filter((i) => allowed.includes(i.perm));
  const nav = (
    <nav className="space-y-0.5">
      {items.map(({ href, label, icon: Icon }) => { const active = href === "/admin" ? path === "/admin" : path.startsWith(href); return <Link key={href} href={href} onClick={() => setOpen(false)} className={cn("flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold transition", active ? "bg-teal-700 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white")}><Icon className="size-4" />{label}</Link>; })}
    </nav>
  );
  return (
    <>
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-60 flex-col bg-slate-900 text-white p-4">
        <div className="flex items-center gap-2 px-2 mb-6"><span className="size-9 rounded-lg bg-teal-600 flex items-center justify-center font-black">PQ</span><div><div className="font-black leading-none">CITY QUEST</div><div className="text-[10px] font-bold tracking-widest text-teal-300">ADMIN CONSOLE</div></div></div>
        {nav}
        <div className="mt-auto pt-4 border-t border-slate-800 text-xs text-slate-400"><div className="font-bold text-slate-200">{name}</div><div>{role.replace("_", " ")}</div><div className="flex gap-3 mt-2"><Link href="/" className="inline-flex items-center gap-1 text-teal-300"><ExternalLink className="size-3" />Visitor app</Link><button onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); location.href = "/login"; }} className="inline-flex items-center gap-1"><LogOut className="size-3" />Log out</button></div></div>
      </aside>
      <header className="lg:hidden sticky top-0 z-40 bg-slate-900 text-white flex items-center gap-3 px-4 h-14"><button onClick={() => setOpen(true)} aria-label="Menu"><Menu className="size-5" /></button><div className="font-black">CITY QUEST ADMIN</div></header>
      {open && <div className="lg:hidden fixed inset-0 z-50 flex"><div className="w-64 bg-slate-900 text-white p-4 overflow-y-auto"><div className="flex justify-between items-center mb-4"><span className="font-black">Menu</span><button onClick={() => setOpen(false)}><X className="size-5" /></button></div>{nav}</div><div className="flex-1 bg-black/50" onClick={() => setOpen(false)} /></div>}
    </>
  );
}
