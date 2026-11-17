"use client";
import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { Button, Alert } from "@/components/ui";
import { postJson } from "@/components/ui/fetcher";

export default function ResetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setErr(null);
    try { await postJson("/api/auth/reset", { token, password }); router.push("/login?reset=1"); }
    catch (e) { setErr((e as Error).message); } finally { setLoading(false); }
  }
  return (
    <div className="card p-6 sm:p-8">
      <h1 className="text-2xl font-black text-ink">Choose a new password</h1>
      <form onSubmit={submit} className="space-y-3 mt-5">
        <div><label className="label">New password</label><input className="input" type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        {err && <Alert tone="error">{err}</Alert>}
        <Button type="submit" full loading={loading}>Update password</Button>
      </form>
    </div>
  );
}
