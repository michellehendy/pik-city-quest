"use client";
import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Coins, ExternalLink } from "lucide-react";
import { Button, Pill, Sheet, Alert } from "@/components/ui";
import { postJson } from "@/components/ui/fetcher";
import { useToast } from "@/components/ui/toast";
import { fmtDate } from "@/lib/utils";

type R = { id: string; name: string; partnerName: string; partnerLogo: string | null; description: string; imageUrl: string | null; terms: string | null; instructions: string | null; pointsCost: number; expiresAt: string | null; validDays: number; issuance: string; remaining: number | null; isSample: boolean };

export function ExchangeList({ points, rewards, tenants }: { points: number; rewards: R[]; tenants: Array<{ id: string; name: string; logoUrl: string | null; description: string | null }> }) {
  const [sel, setSel] = useState<R | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  async function exchange() {
    if (!sel) return; setBusy(true); setErr(null);
    try { const r = await postJson<{ userReward: { id: string } }>(`/api/rewards/${sel.id}/exchange`); toast("Reward added to your wallet!", "success"); setSel(null); router.push(`/profile/rewards/${r.userReward.id}`); router.refresh(); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  return (
    <div className="space-y-5">
      <section className="rounded-3xl bg-gradient-to-br from-teal-900 to-teal-600 text-white p-5 shadow-float">
        <div className="eyebrow !text-sun-400">Reward points balance</div>
        <div className="text-4xl font-black flex items-center gap-2"><Coins className="size-8 text-sun-500" />{points}</div>
        <p className="text-xs text-white/85 mt-1">Points are credited alongside XP and spent here. Your XP and level are never reduced.</p>
      </section>
      <section>
        <div className="section-title px-1 mb-1">Tourist Exclusive</div>
        <p className="text-xs text-ink-soft px-1 mb-3">Enjoy exclusive deals and limited-time offers crafted to enhance your journey in PIK. Partners from <a className="font-bold text-teal-700" href="https://piktourism.com/tourist-exclusive" target="_blank" rel="noreferrer">piktourism.com/tourist-exclusive ↗</a>.</p>
        <div className="snap-row no-scrollbar -mx-4 px-4">{tenants.map((t) => <div key={t.id} className="card w-[150px] p-3 text-center"><div className="relative mx-auto size-14 rounded-full overflow-hidden bg-slate-100">{t.logoUrl && <Image src={t.logoUrl} alt={t.name} fill sizes="56px" className="object-cover" />}</div><div className="text-xs font-extrabold mt-2 text-ink">{t.name}</div></div>)}</div>
      </section>
      <section className="grid gap-3 sm:grid-cols-2">
        {rewards.map((r) => (
          <button key={r.id} onClick={() => setSel(r)} className="card overflow-hidden text-left">
            <div className="relative h-32 bg-slate-100">{r.imageUrl && <Image src={r.imageUrl} alt="" fill sizes="400px" className="object-cover" />}<div className="absolute top-2 left-2 flex gap-1">{r.issuance === "TOURIST_EXCLUSIVE" && <Pill tone="sun">Tourist Exclusive</Pill>}{r.isSample && <Pill tone="gray">Sample</Pill>}</div></div>
            <div className="p-3"><div className="font-extrabold text-sm text-ink leading-tight">{r.name}</div><div className="text-[11px] text-ink-soft">{r.partnerName}</div><div className="flex items-center justify-between mt-2"><span className="text-sm font-black text-teal-700 inline-flex items-center gap-1"><Coins className="size-4 text-sun-500" />{r.pointsCost} pts</span><span className="text-[10px] font-bold text-ink-soft">{r.expiresAt ? `until ${fmtDate(r.expiresAt)}` : `${r.validDays} days validity`}</span></div></div>
          </button>
        ))}
      </section>
      <Sheet open={!!sel} onClose={() => setSel(null)} title={sel?.name}>
        {sel && (
          <div className="space-y-3 text-sm">
            <div className="relative h-40 rounded-2xl overflow-hidden bg-slate-100">{sel.imageUrl && <Image src={sel.imageUrl} alt="" fill sizes="400px" className="object-cover" />}</div>
            <div className="font-bold text-ink-soft">{sel.partnerName}</div>
            <p className="text-ink-soft">{sel.description}</p>
            {sel.terms && <div><div className="eyebrow">Terms & conditions</div><p className="text-ink-soft text-xs mt-0.5">{sel.terms}</p></div>}
            {sel.instructions && <div><div className="eyebrow">Redemption</div><p className="text-ink-soft text-xs mt-0.5">{sel.instructions}</p></div>}
            <div className="text-xs text-ink-soft">Validity: {sel.expiresAt ? `until ${fmtDate(sel.expiresAt)}` : `${sel.validDays} days after exchange`}{sel.remaining != null ? ` · ${sel.remaining} left` : ""}</div>
            {err && <Alert tone="error">{err}</Alert>}
            <Button full size="lg" variant="sun" loading={busy} disabled={points < sel.pointsCost} onClick={exchange}>{points < sel.pointsCost ? `Need ${sel.pointsCost - points} more points` : `Exchange ${sel.pointsCost} points`}</Button>
            <a className="btn btn-ghost w-full" href="https://piktourism.com/tourist-exclusive" target="_blank" rel="noreferrer"><ExternalLink className="size-4" />View on piktourism.com</a>
          </div>
        )}
      </Sheet>
    </div>
  );
}
