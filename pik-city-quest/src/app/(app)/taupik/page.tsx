import { TopBar } from "@/components/app/top-bar";
import { TauPikChat } from "@/components/app/taupik-chat";
import { getCurrentUser } from "@/lib/auth";
import { getActiveRuns } from "@/lib/queries";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "TauPIK" };

export default async function TauPikPage() {
  const me = (await getCurrentUser())!;
  const [runs, unread] = await Promise.all([getActiveRuns(me.id), prisma.notification.count({ where: { userId: me.id, isRead: false } })]);
  const ctx = runs[0] ? { questSlug: runs[0].quest.slug } : undefined;
  return (
    <div>
      <TopBar title="TauPIK" unread={unread} user={me} />
      <div className="mx-auto max-w-lg lg:max-w-3xl px-4"><TauPikChat context={ctx} /></div>
    </div>
  );
}
