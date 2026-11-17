"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Alert } from "@/components/ui";
import { postJson } from "@/components/ui/fetcher";

export default function RegisterPage() {
  const router = useRouter();
  const [f, setF] = useState({ name: "", email: "", password: "", username: "", instagram: "", dateOfBirth: "" });
  const [more, setMore] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setErr(null);
    try {
      const r = await postJson<{ demoVerifyLink?: string }>("/api/auth/register", f);
      if (r.demoVerifyLink) sessionStorage.setItem("pikq_verify_link", r.demoVerifyLink);
      router.push("/welcome");
      router.refresh();
    } catch (e) { setErr((e as Error).message); } finally { setLoading(false); }
  }

  return (
    <div className="card p-6 sm:p-8">
      <h1 className="text-2xl font-black text-ink">Create your explorer profile</h1>
      <p className="text-sm text-ink-soft mt-1">Free, no app download needed.</p>
      <a href="/api/auth/google" className="btn btn-outline w-full mt-5">Sign up with Google</a>
      <div className="flex items-center gap-3 my-4 text-[11px] font-bold text-ink-soft"><span className="h-px flex-1 bg-slate-200" />OR<span className="h-px flex-1 bg-slate-200" /></div>
      <form onSubmit={submit} className="space-y-3">
        <div><label className="label">Full name</label><input className="input" required value={f.name} onChange={set("name")} placeholder="Michelle" /></div>
        <div><label className="label">Email</label><input className="input" type="email" required value={f.email} onChange={set("email")} placeholder="you@example.com" /></div>
        <div><label className="label">Password</label><input className="input" type="password" required minLength={8} value={f.password} onChange={set("password")} placeholder="At least 8 characters" /></div>
        {!more ? <button type="button" onClick={() => setMore(true)} className="text-xs font-bold text-teal-700">+ Add username, Instagram & birthday (optional)</button> : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div><label className="label">Username</label><input className="input" value={f.username} onChange={set("username")} placeholder="pik_explorer" /></div>
            <div><label className="label">Instagram</label><input className="input" value={f.instagram} onChange={set("instagram")} placeholder="@yourhandle" /></div>
            <div className="sm:col-span-2"><label className="label">Date of birth</label><input className="input" type="date" value={f.dateOfBirth} onChange={set("dateOfBirth")} /></div>
          </div>
        )}
        {err && <Alert tone="error">{err}</Alert>}
        <Button type="submit" full loading={loading} size="lg">Create account</Button>
        <p className="text-[11px] text-ink-soft text-center">By continuing you agree to the PIK City Quest rules and privacy policy.</p>
      </form>
      <div className="text-xs font-semibold mt-4 text-center">Already have an account? <Link href="/login" className="text-teal-700">Sign in</Link></div>
    </div>
  );
}
