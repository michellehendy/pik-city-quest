import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TopBar } from "@/components/app/top-bar";
import { BadgeGrid } from "../badge-grid";

export const dynamic = "force-dynamic";
const CAT_LABEL: Record<string, string> = { DESTINATION: "Destination badges", AREA: "Area badges", TRANSPORT: "Transportation badges", EVENT: "Event badges", EXPERIENCE: "Experience badges", QUEST: "Quest completion badges", LEVEL: "Level badges" };

export default async function BadgesPage() {
  const me = (await getCurrentUser())!;
  const [badges, owned] = await Promise.all([prisma.badge.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }] }), prisma.userBadge.findMany({ where: { userId: me.id } })]);
  const ownedMap = Object.fromEntries(owned.map((o) => [o.badgeId, o.earnedAt.toISOString()]));
  const cats = Array.from(new Set(badges.map((b) => b.category)));
  return (
    <div>
      <TopBar back="/profile" title="Badge collection" />
      <div className="mx-auto max-w-lg lg:max-w-4xl px-4 space-y-5">
        {cats.map((c) => <section key={c} className="card p-4"><div className="font-black text-ink mb-1">{CAT_LABEL[c] ?? c}</div><BadgeGrid badges={badges.filter((b) => b.category === c).map((b) => ({ id: b.id, slug: b.slug, name: b.name, icon: b.icon, color: b.color, rarity: b.rarity, category: b.category, description: b.description, earnedAt: ownedMap[b.id] ?? null }))} /></section>)}
      </div>
    </div>
  );
}
