import Image from "next/image";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { expireRewards } from "@/lib/gamification";
import { TopBar } from "@/components/app/top-bar";
import { EmptyState, Pill, Button } from "@/components/ui";
import { fmtDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function RewardsPage() {
  const me = (await getCurrentUser())!;
  await expireRewards(me.id);
  const items = await prisma.userReward.findMany({ where: { userId: me.id }, include: { reward: true }, orderBy: [{ status: "asc" }, { issuedAt: "desc" }] });
  return (
    <div>
      <TopBar back="/profile" title="My Rewards" />
      <div className="mx-auto max-w-lg lg:max-w-3xl px-4 space-y-3">
        {!items.length && <EmptyState icon="🎁" title="No rewards yet" body="Complete quests and collect badges to unlock exclusive rewards from PIK partners." action={<Button href="/profile/exchange" variant="ghost">Exchange points</Button>} />}
        {items.map((ur) => (
          <Link key={ur.id} href={`/profile/rewards/${ur.id}`} className={`card p-3 flex gap-3 ${ur.status !== "AVAILABLE" ? "opacity-70" : ""}`}>
            <div className="relative size-20 rounded-xl overflow-hidden bg-slate-100 shrink-0">{ur.reward.imageUrl && <Image src={ur.reward.imageUrl} alt="" fill sizes="80px" className="object-cover" />}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2"><div className="font-extrabold text-sm text-ink leading-tight">{ur.reward.name}</div><Pill tone={ur.status === "AVAILABLE" ? "green" : ur.status === "REDEEMED" ? "gray" : "red"}>{ur.status}</Pill></div>
              <div className="text-[11px] text-ink-soft">{ur.reward.partnerName}</div>
              <p className="text-xs text-ink-soft line-clamp-2 mt-1">{ur.reward.description}</p>
              <div className="text-[11px] font-bold mt-1 text-ink-soft">Code {ur.voucherCode} · {ur.status === "REDEEMED" ? `redeemed ${fmtDate(ur.redeemedAt)}` : `valid until ${fmtDate(ur.expiresAt)}`}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
