"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Alert } from "@/components/ui";
import { postJson } from "@/components/ui/fetcher";

function GoogleIcon() {
  return <svg viewBox="0 0 48 48" className="size-5"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.3-.4-3.5z"/></svg>;
}

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(params.get("error") === "google_not_configured" ? "Google Sign-In is not configured on this server yet (set GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)." : params.get("error") ? "Google sign-in failed. Please try again." : null);
  const [loading, setLoading] = useState(false);
  const next = params.get("next") || "/";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setErr(null);
    try {
      const r = await postJson<{ redirect: string }>("/api/auth/login", { email, password });
      router.push(next !== "/" ? next : r.redirect || "/");
      router.refresh();
    } catch (e) { setErr((e as Error).message); } finally { setLoading(false); }
  }

  return (
    <div className="card p-6 sm:p-8">
      <h1 className="text-2xl font-black text-ink">Welcome back, explorer</h1>
      <p className="text-sm text-ink-soft mt-1">Sign in to continue your PIK adventure.</p>
      <a href="/api/auth/google" className="btn btn-outline w-full mt-5"><GoogleIcon /> Sign in with Google</a>
      <div className="flex items-center gap-3 my-4 text-[11px] font-bold text-ink-soft"><span className="h-px flex-1 bg-slate-200" />OR<span className="h-px flex-1 bg-slate-200" /></div>
      <form onSubmit={submit} className="space-y-3">
        <div><label className="label">Email</label><input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></div>
        <div><label className="label">Password</label><input className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" /></div>
        {err && <Alert tone="error">{err}</Alert>}
        <Button type="submit" full loading={loading} size="lg">Sign in</Button>
      </form>
      <div className="flex justify-between text-xs font-semibold mt-4">
        <Link href="/forgot-password" className="text-teal-700">Forgot password?</Link>
        <Link href="/register" className="text-teal-700">Create account</Link>
      </div>
      <div className="mt-5 rounded-xl bg-sand p-3 text-[11px] text-ink-soft leading-relaxed">
        <b>Demo accounts</b> · Visitor: michelle@example.com / Explorer123! · Admin: admin@piktourism.local / Admin123! · Verifier: verify@piktourism.local / Verify123! · Partner: partner@expressfun.local / Partner123!
      </div>
    </div>
  );
}
