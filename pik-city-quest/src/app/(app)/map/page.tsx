import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TopBar } from "@/components/app/top-bar";
import { QuestMap } from "./quest-map";

export const dynamic = "force-dynamic";
export const metadata = { title: "Map" };

export default async function MapPage() {
  const me = (await getCurrentUser())!;
  const unread = await prisma.notification.count({ where: { userId: me.id, isRead: false } });
  return (
    <div className="flex flex-col h-[calc(100dvh-var(--nav-h)-var(--safe-bottom))] lg:h-screen">
      <TopBar title="Quest Map" unread={unread} user={me} />
      <div className="flex-1 min-h-0 relative"><Suspense><QuestMap /></Suspense></div>
    </div>
  );
}
