import Link from "next/link";
import { Bell, ChevronLeft } from "lucide-react";
import { Avatar } from "@/components/ui";

export function TopBar({ title, back, unread, user, transparent }: { title?: string; back?: string; unread?: number; user?: { name: string; avatarUrl: string | null }; transparent?: boolean }) {
  return (
    <header className={`sticky top-0 z-40 ${transparent ? "" : "bg-[var(--background)]/90 backdrop-blur border-b border-teal-800/5"}`}>
      <div className="mx-auto max-w-lg lg:max-w-5xl flex items-center gap-3 px-4 h-14">
        {back ? <Link href={back} className="size-9 rounded-full bg-white shadow-card flex items-center justify-center" aria-label="Back"><ChevronLeft className="size-5" /></Link> : user ? <Link href="/profile"><Avatar src={user.avatarUrl} name={user.name} size={36} /></Link> : null}
        <div className="flex-1 font-extrabold text-ink truncate">{title}</div>
        <Link href="/notifications" className="relative size-9 rounded-full bg-white shadow-card flex items-center justify-center" aria-label="Notifications">
          <Bell className="size-5 text-ink" />
          {!!unread && <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-coral text-white text-[10px] font-black flex items-center justify-center">{unread > 9 ? "9+" : unread}</span>}
        </Link>
      </div>
    </header>
  );
}
