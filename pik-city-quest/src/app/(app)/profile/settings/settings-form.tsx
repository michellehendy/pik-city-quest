"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, ChevronDown } from "lucide-react";
import { Avatar, Button, Alert } from "@/components/ui";
import { postJson } from "@/components/ui/fetcher";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type U = { name: string; username: string; email: string; instagram: string | null; dateOfBirth: string; publicProfile: boolean; language: string; hasPassword: boolean; notifPrefs: Record<string, boolean>; sharePrefs: Record<string, boolean>; avatarUrl: string | null };
const NOTIFS = [["missions", "Mission unlocked / completed"], ["badges", "New badges"], ["rewards", "Rewards & vouchers"], ["quests", "Special & seasonal quests"], ["email", "Email digest (when email is configured)"], ["push", "Push notifications (PWA, future)"]];
const SHARES = [["instagram", "Instagram"], ["whatsapp", "WhatsApp"], ["tiktok", "TikTok"], ["showName", "Show my name on shared cards"]];

function Section({ title, children, open = false }: { title: string; children: React.ReactNode; open?: boolean }) {
  const [o, setO] = useState(open);
  return <section className="card"><button onClick={() => setO((s) => !s)} className="w-full flex items-center justify-between px-4 py-3.5 font-extrabold text-ink"><span>{title}</span><ChevronDown className={cn("size-4 transition", o && "rotate-180")} /></button>{o && <div className="px-4 pb-4 space-y-3">{children}</div>}</section>;
}
function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return <label className="flex items-center justify-between gap-3 text-sm"><span className="text-ink">{label}</span><button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className={cn("w-11 h-6 rounded-full transition relative", on ? "bg-teal-700" : "bg-slate-300")}><span className={cn("absolute top-0.5 size-5 rounded-full bg-white transition", on ? "left-[22px]" : "left-0.5")} /></button></label>;
}

export function SettingsForm({ user }: { user: U }) {
  const router = useRouter();
  const { toast } = useToast();
  const [f, setF] = useState(user);
  const [pw, setPw] = useState({ current: "", next: "" });
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState("");
  const [avatar, setAvatar] = useState(user.avatarUrl);
  async function save(partial: Record<string, unknown>) { setBusy(true); try { await postJson("/api/profile", partial, "PATCH"); toast("Saved", "success"); router.refresh(); } catch (e) { toast((e as Error).message, "error"); } finally { setBusy(false); } }
  async function uploadAvatar(file: File) { const fd = new FormData(); fd.append("file", file); fd.append("kind", "avatar"); const r = await fetch("/api/upload", { method: "POST", body: fd }); const d = await r.json(); if (!r.ok) return toast(d.error, "error"); setAvatar(d.url); toast("Profile photo updated", "success"); router.refresh(); }
  return (
    <div className="space-y-3">
      <Section title="Edit profile" open>
        <div className="flex items-center gap-4"><Avatar src={avatar} name={f.name} size={72} ring /><label className="btn btn-ghost min-h-9 text-xs cursor-pointer"><Camera className="size-4" />Change photo<input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])} /></label></div>
        <div><label className="label">Full name</label><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        <div><label className="label">Username</label><input className="input" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value.toLowerCase() })} /></div>
        <div><label className="label">Email</label><input className="input bg-slate-50" value={f.email} readOnly /></div>
        <div className="grid grid-cols-2 gap-3"><div><label className="label">Instagram</label><input className="input" value={f.instagram ?? ""} onChange={(e) => setF({ ...f, instagram: e.target.value })} placeholder="@handle" /></div><div><label className="label">Date of birth</label><input className="input" type="date" value={f.dateOfBirth} onChange={(e) => setF({ ...f, dateOfBirth: e.target.value })} /></div></div>
        <Button loading={busy} onClick={() => save({ name: f.name, username: f.username, instagram: f.instagram ?? undefined, dateOfBirth: f.dateOfBirth || null })}>Save profile</Button>
      </Section>
      <Section title="Account security">
        <div><label className="label">Current password</label><input className="input" type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></div>
        <div><label className="label">New password</label><input className="input" type="password" minLength={8} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></div>
        <Button loading={busy} onClick={async () => { setBusy(true); try { await postJson("/api/profile/password", pw); toast("Password updated — other sessions were signed out.", "success"); setPw({ current: "", next: "" }); } catch (e) { toast((e as Error).message, "error"); } finally { setBusy(false); } }}>Update password</Button>
        <Alert tone="info">Sessions are stored server-side and can be revoked. Signing in with Google links to the same account by email.</Alert>
      </Section>
      <Section title="Notification preferences">{NOTIFS.map(([k, l]) => <Toggle key={k} label={l} on={f.notifPrefs[k] ?? true} onChange={(v) => { const n = { ...f.notifPrefs, [k]: v }; setF({ ...f, notifPrefs: n }); save({ notifPrefs: n }); }} />)}</Section>
      <Section title="Privacy settings">
        <Toggle label="Public profile (name shown on leaderboard & shared achievement pages)" on={f.publicProfile} onChange={(v) => { setF({ ...f, publicProfile: v }); save({ publicProfile: v }); }} />
        <p className="text-[11px] text-ink-soft">Location is used only to verify check-ins and is validated server-side. Photos are stored securely and reviewed by the PIK Tourism team.</p>
      </Section>
      <Section title="Social media sharing preferences">{SHARES.map(([k, l]) => <Toggle key={k} label={l} on={f.sharePrefs[k] ?? true} onChange={(v) => { const n = { ...f.sharePrefs, [k]: v }; setF({ ...f, sharePrefs: n }); save({ sharePrefs: n }); }} />)}</Section>
      <Section title="Language preferences">
        <div className="flex gap-2">{[["en", "English"], ["id", "Bahasa Indonesia"]].map(([k, l]) => <button key={k} onClick={() => { setF({ ...f, language: k }); save({ language: k as "en" | "id" }); }} className={cn("btn min-h-10 text-xs", f.language === k ? "btn-primary" : "btn-ghost")}>{l}</button>)}</div>
        <p className="text-[11px] text-ink-soft">Interface translations can be added through the i18n layer; the preference is stored on your profile.</p>
      </Section>
      <Section title="Delete account">
        <Alert tone="error">This removes your personal data and signs you out everywhere. Historical quest completions are anonymised for analytics. Type DELETE to confirm.</Alert>
        <input className="input" value={del} onChange={(e) => setDel(e.target.value)} placeholder="DELETE" />
        <Button variant="danger" disabled={del !== "DELETE"} loading={busy} onClick={async () => { setBusy(true); try { await postJson("/api/profile/delete", { confirm: del }); router.push("/login"); } catch (e) { toast((e as Error).message, "error"); setBusy(false); } }}>Delete my account</Button>
      </Section>
    </div>
  );
}
