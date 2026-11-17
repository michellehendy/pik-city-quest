"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, Map, Sparkles, User } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Home", icon: Home },
  { href: "/quests", label: "Quests", icon: Compass },
  { href: "/map", label: "Map", icon: Map },
  { href: "/taupik", label: "TauPIK", icon: Sparkles },
  { href: "/profile", label: "Profile", icon: User },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 lg:hidden" aria-label="Main">
      <div className="mx-auto max-w-lg bg-white/95 backdrop-blur border-t border-teal-800/10 shadow-[0_-8px_30px_-12px_rgb(8_112_136/0.25)] rounded-t-3xl px-2 pt-2 pb-[calc(0.5rem+var(--safe-bottom))]">
        <div className="grid grid-cols-5">
          {items.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? path === "/" : path.startsWith(href);
            return (
              <Link key={href} href={href} className={cn("flex flex-col items-center gap-1 py-1.5 rounded-2xl text-[10px] font-bold transition", active ? "text-teal-800" : "text-ink-soft/70")}>
                <span className={cn("flex items-center justify-center size-9 rounded-2xl transition", active && "bg-teal-800 text-white shadow-[0_8px_18px_-8px_rgb(8_112_136/0.8)]")}><Icon className="size-5" strokeWidth={active ? 2.5 : 2} /></span>
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export function SideNav({ name, avatar }: { name: string; avatar?: string | null }) {
  const path = usePathname();
  void avatar;
  return (
    <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 flex-col bg-white border-r border-teal-800/10 p-5">
      <Link href="/" className="flex items-center gap-2 mb-8"><span className="size-10 rounded-2xl bg-teal-800 text-white flex items-center justify-center font-black">PQ</span><div><div className="font-black text-ink leading-none">PIK CITY QUEST</div><div className="text-[10px] font-bold text-teal-700 tracking-widest">PIK TOURISM BOARD</div></div></Link>
      <div className="space-y-1">
        {items.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return <Link key={href} href={href} className={cn("flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-bold transition", active ? "bg-teal-800 text-white" : "text-ink-soft hover:bg-teal-50")}><Icon className="size-5" />{label}</Link>;
        })}
      </div>
      <div className="mt-auto text-[11px] text-ink-soft">Signed in as <b>{name}</b><br /><a className="text-teal-700 font-bold" href="https://piktourism.com" target="_blank" rel="noreferrer">piktourism.com ↗</a></div>
    </aside>
  );
}
