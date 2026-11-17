"use client";
import { useState } from "react";
import Image from "next/image";
import { Check, Search } from "lucide-react";
import { QrScanner } from "@/components/mission/qr-scanner";
import { Button, Pill, Alert } from "@/components/ui";
import { getJson, postJson } from "@/components/ui/fetcher";
import { useToast } from "@/components/ui/toast";
import { fmtDate } from "@/lib/utils";
type Look = { found: boolean; scoped?: boolean; userReward?: { id: string; status: string; voucherCode: string; expiresAt: string; redeemedAt: string | null; reward: { name: string; partnerName: string; description: string; terms: string | null; imageUrl: string | null }; user: { name: string; username: string } } };
export default function RedeemPage() {
  const [code, setCode] = useState("");
  const [location, setLocation] = useState("");
  const [look, setLook] = useState<Look | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; reason?: string } | null>(null);
  const { toast } = useToast();
  async function lookup(c: string) { setCode(c); setResult(null); setBusy(true); try { setLook(await getJson<Look>(`/api/admin/redeem?code=${encodeURIComponent(c)}`)); } catch (e) { toast((e as Error).message, "error"); } finally { setBusy(false); } }
  async function redeem() { setBusy(true); try { const r = await postJson<{ ok: boolean; reason?: string }>("/api/admin/redeem", { code, location }); setResult(r); if (r.ok) toast("Reward redeemed", "success"); await lookup(code); } catch (e) { toast((e as Error).message, "error"); } finally { setBusy(false); } }
  const ur = look?.userReward;
  return (
    <div className="space-y-4 max-w-3xl">
      <div><h1 className="text-xl font-black">Reward redemption scanner</h1><p className="text-xs text-slate-500">Partners scan the visitor's reward QR (or type the voucher code) to verify validity and redeem it once. Partner admins only see their own rewards.</p></div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl bg-white border border-slate-200 p-4 space-y-3"><QrScanner onToken={lookup} busy={busy} /><form onSubmit={(e) => { e.preventDefault(); lookup(code); }} className="flex gap-2"><input className="input" placeholder="Voucher code e.g. PIKDQ-ABCD1234" value={code} onChange={(e) => setCode(e.target.value)} /><Button type="submit" loading={busy}><Search className="size-4" /></Button></form></div>
        <div className="rounded-xl bg-white border border-slate-200 p-4 space-y-3">
          {!look && <div className="text-sm text-slate-500">Scan or enter a code to see the reward.</div>}
          {look && !look.found && <Alert tone="error">Voucher not found.</Alert>}
          {ur && (
            <>
              <div className="flex gap-3"><div className="relative size-20 rounded-lg overflow-hidden bg-slate-100 shrink-0">{ur.reward.imageUrl && <Image src={ur.reward.imageUrl} alt="" fill sizes="80px" className="object-cover" />}</div><div><div className="font-black">{ur.reward.name}</div><div className="text-xs text-slate-500">{ur.reward.partnerName}</div><div className="text-xs mt-1">For <b>{ur.user.name}</b> (@{ur.user.username})</div><div className="font-mono text-xs mt-1">{ur.voucherCode}</div></div></div>
              <div className="flex flex-wrap gap-1"><Pill tone={ur.status === "AVAILABLE" ? "green" : ur.status === "REDEEMED" ? "gray" : "red"}>{ur.status}</Pill><Pill tone="gray">{ur.status === "REDEEMED" ? `redeemed ${fmtDate(ur.redeemedAt)}` : `valid until ${fmtDate(ur.expiresAt)}`}</Pill></div>
              <p className="text-xs text-slate-600">{ur.reward.description}</p>{ur.reward.terms && <p className="text-[11px] text-slate-500">{ur.reward.terms}</p>}
              {look.scoped && <Alert tone="error">This voucher belongs to another partner — you cannot redeem it.</Alert>}
              {ur.status === "AVAILABLE" && !look.scoped && <><input className="input" placeholder="Redemption location (e.g. Batavia PIK counter)" value={location} onChange={(e) => setLocation(e.target.value)} /><Button full size="lg" variant="sun" loading={busy} onClick={redeem}><Check className="size-4" />Confirm redemption</Button></>}
              {result && <Alert tone={result.ok ? "success" : "error"}>{result.ok ? "Redeemed successfully. The visitor's wallet is updated." : result.reason}</Alert>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
