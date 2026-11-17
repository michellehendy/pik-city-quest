"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Unlock, CheckCircle2, Trophy, Award, Gift, Star, XCircle, Info } from "lucide-react";
import { EmptyState } from "@/components/ui";
import { postJson } from "@/components/ui/fetcher";
import { timeAgo, cn } from "@/lib/utils";

type N = { id: string; type: string; title: string; body: string; link: string | null; isRead: boolean; createdAt: string };
const ICON: Record<string, React.ReactNode> = { MISSION_UNLOCKED: <Unlock className="size-4" />, MISSION_COMPLETED: <CheckCircle2 className="size-4" />, QUEST_COMPLETE: <Trophy className="size-4" />, BADGE: <Award className="size-4" />, REWARD: <Gift className="size-4" />, SPECIAL_QUEST: <Star className="size-4" />, MISSION_REJECTED: <XCircle className="size-4" />, LEVEL_UP: <Star className="size-4" /> };

export function NotificationList({ initial }: { initial: N[] }) {
  const [items, setItems] = useState(initial);
  const router = useRouter();
  useEffect(() => { const unread = initial.filter((n) => !n.isRead).map((n) => n.id); if (unread.length) postJson("/api/notifications/read", { ids: unread }).then(() => router.refresh()).catch(() => {}); }, [initial, router]);
  if (!items.length) return <EmptyState icon={<Bell />} title="No notifications yet" body="Mission unlocks, badges and rewards will show up here." />;
  return (
    <div className="space-y-2">
      <button onClick={async () => { await postJson("/api/notifications/read", { all: true }); setItems((s) => s.map((n) => ({ ...n, isRead: true }))); router.refresh(); }} className="text-xs font-bold text-teal-700 px-1">Mark all as read</button>
      {items.map((n) => {
        const inner = (
          <div className={cn("card p-3.5 flex gap-3", !n.isRead && "border-l-4 border-l-sun-500")}>
            <div className={cn("size-9 rounded-full flex items-center justify-center shrink-0", n.type === "MISSION_REJECTED" ? "bg-rose-100 text-rose-700" : "bg-teal-50 text-teal-800")}>{ICON[n.type] ?? <Info className="size-4" />}</div>
            <div className="min-w-0 flex-1"><div className="font-black text-xs text-ink tracking-wide">{n.title}</div><div className="text-sm text-ink-soft">{n.body}</div><div className="text-[10px] text-ink-soft/70 mt-1" suppressHydrationWarning>{timeAgo(n.createdAt)}</div></div>
          </div>
        );
        return n.link ? <Link key={n.id} href={n.link}>{inner}</Link> : <div key={n.id}>{inner}</div>;
      })}
    </div>
  );
}
