import Image from "next/image";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TopBar } from "@/components/app/top-bar";
import { Pill } from "@/components/ui";
import { fmtDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function RewardDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = (await getCurrentUser())!;
  const ur = await prisma.userReward.findFirst({ where: { id, userId: me.id }, include: { reward: { include: { partner: true } }, redemption: true } });
  if (!ur) notFound();
  const qr = await QRCode.toDataURL(ur.qrToken, { margin: 1, width: 280, color: { dark: "#06323c" } });
  return (
    <div>
      <TopBar back="/profile/rewards" title="Reward" />
      <div className="mx-auto max-w-lg px-4 space-y-4">
        <section className="card overflow-hidden">
          <div className="relative h-44 bg-slate-100">{ur.reward.imageUrl && <Image src={ur.reward.imageUrl} alt="" fill sizes="100vw" className="object-cover" />}<div className="absolute top-3 right-3"><Pill tone={ur.status === "AVAILABLE" ? "green" : ur.status === "REDEEMED" ? "gray" : "red"}>{ur.status}</Pill></div></div>
          <div className="p-5 text-center">
            <div className="eyebrow">{ur.reward.partnerName}</div>
            <h1 className="text-xl font-black text-ink">{ur.reward.name}</h1>
            <p className="text-sm text-ink-soft mt-1">{ur.reward.description}</p>
            <div className={`mx-auto mt-4 rounded-2xl bg-white p-3 inline-block shadow-card ${ur.status !== "AVAILABLE" ? "grayscale opacity-50" : ""}`}><Image src={qr} alt="Reward QR" width={220} height={220} unoptimized /></div>
            <div className="mt-3 text-[11px] font-bold text-ink-soft">VOUCHER CODE</div>
            <div className="text-2xl font-black tracking-widest text-teal-800">{ur.voucherCode}</div>
            <div className="text-xs text-ink-soft mt-2">{ur.status === "REDEEMED" ? `Redeemed ${fmtDate(ur.redeemedAt, "d MMM yyyy, HH:mm")}${ur.redemption?.location ? ` at ${ur.redemption.location}` : ""}` : `Valid until ${fmtDate(ur.expiresAt, "d MMM yyyy")}`}</div>
          </div>
        </section>
        <section className="card p-4 space-y-3 text-sm">
          <div><div className="eyebrow">How to redeem</div><p className="text-ink-soft mt-0.5">{ur.reward.instructions ?? "Show this QR code to the partner staff. They scan it once to redeem."}</p></div>
          {ur.reward.terms && <div><div className="eyebrow">Terms & conditions</div><p className="text-ink-soft mt-0.5">{ur.reward.terms}</p></div>}
          {ur.reward.isSample && <div className="rounded-xl bg-sun-100 text-sun-600 text-xs font-bold p-3">Sample reward for demonstration — PIK Tourism replaces this with real partner offers in the admin dashboard.</div>}
        </section>
      </div>
    </div>
  );
}
