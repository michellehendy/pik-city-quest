import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TopBar } from "@/components/app/top-bar";
import { NotificationList } from "./list";

export const dynamic = "force-dynamic";
export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const me = (await getCurrentUser())!;
  const items = await prisma.notification.findMany({ where: { userId: me.id }, orderBy: { createdAt: "desc" }, take: 100 });
  return (
    <div>
      <TopBar back="/" title="Notifications" />
      <div className="mx-auto max-w-lg lg:max-w-3xl px-4"><NotificationList initial={items.map((n) => ({ ...n, createdAt: n.createdAt.toISOString() }))} /></div>
    </div>
  );
}
