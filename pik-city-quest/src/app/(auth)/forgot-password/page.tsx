"use client";
import { useState } from "react";
import Link from "next/link";
import { Button, Alert } from "@/components/ui";
import { postJson } from "@/components/ui/fetcher";

export default function ForgotPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [demo, setDemo] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setErr(null);
    try { const r = await postJson<{ message: string; demoLink?: string }>("/api/auth/forgot", { email }); setMsg(r.message); setDemo(r.demoLink ?? null); }
    catch (e) { setErr((e as Error).message); } finally { setLoading(false); }
  }
  return (
    <div className="card p-6 sm:p-8">
      <h1 className="text-2xl font-black text-ink">Reset your password</h1>
      <p className="text-sm text-ink-soft mt-1">We'll email you a secure link.</p>
      <form onSubmit={submit} className="space-y-3 mt-5">
        <div><label className="label">Email</label><input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        {err && <Alert tone="error">{err}</Alert>}
        {msg && <Alert tone="success">{msg}</Alert>}
        {demo && <Alert tone="warn">Demo mode (no email provider configured): <Link className="underline break-all" href={demo}>{demo}</Link></Alert>}
        <Button type="submit" full loading={loading}>Send reset link</Button>
      </form>
      <div className="text-xs font-semibold mt-4 text-center"><Link href="/login" className="text-teal-700">Back to sign in</Link></div>
    </div>
  );
}
