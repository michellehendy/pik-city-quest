import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { listQuests } from "@/lib/queries";
import { prisma } from "@/lib/db";
import { TopBar } from "@/components/app/top-bar";
import { QuestBrowser } from "./quest-browser";
import { RouteIllustration } from "@/components/app/route-illustration";
import { Button } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Quests" };

export default async function QuestsPage() {
  const me = (await getCurrentUser())!;
  const [quests, areas, unread] = await Promise.all([listQuests(me.id), prisma.area.findMany({ orderBy: { sortOrder: "asc" } }), prisma.notification.count({ where: { userId: me.id, isRead: false } })]);
  const featured = quests.find((q) => q.userStatus === "AVAILABLE" && q.isFeatured) ?? quests.find((q) => q.userStatus === "AVAILABLE") ?? quests[0];
  const data = quests.map((q) => ({ id: q.id, slug: q.slug, name: q.name, tagline: q.tagline, description: q.description, coverImage: q.coverImage, type: q.type, difficulty: q.difficulty, durationMinutes: q.durationMinutes, userStatus: q.userStatus, totals: q.totals, areaSlugs: q.areaSlugs, startsAt: q.startsAt?.toISOString() ?? null, endsAt: q.endsAt?.toISOString() ?? null }));
  return (
    <div>
      <TopBar title="Quests" unread={unread} user={me} />
      <div className="mx-auto max-w-lg lg:max-w-5xl px-4 space-y-6">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-900 via-teal-800 to-teal-600 text-white p-5 pb-0 shadow-float">
          <div className="relative z-10 max-w-sm">
            <div className="eyebrow !text-sun-400">PIK Tourism Board</div>
            <h1 className="text-3xl font-black leading-none tracking-tight">PIK CITY QUEST</h1>
            <p className="text-sm text-white/85 mt-2">Discover PIK through a series of fun missions across iconic destinations. Visit each location, complete the challenges, collect your digital stamps, and unlock new experiences along the way.</p>
            {featured && <Button href={`/quests/${featured.slug}`} variant="sun" className="mt-4">START YOUR QUEST</Button>}
          </div>
          <RouteIllustration className="mt-4 -mx-5 w-[calc(100%+2.5rem)]" />
        </section>
        <Suspense><QuestBrowser quests={data} areas={areas.map((a) => ({ slug: a.slug, name: a.name }))} /></Suspense>
      </div>
    </div>
  );
}
