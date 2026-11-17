"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Alert } from "@/components/ui";

export default function WelcomePage() {
  const [verify, setVerify] = useState<string | null>(null);
  useEffect(() => { try { setVerify(sessionStorage.getItem("pikq_verify_link")); } catch {} }, []);
  return (
    <div className="card p-6 sm:p-8 text-center">
      <div className="mx-auto size-24 rounded-full bg-sun-100 flex items-center justify-center text-5xl animate-pop">🧭</div>
      <h1 className="text-2xl font-black text-ink mt-4">WELCOME TO PIK CITY QUEST!</h1>
      <p className="text-sm text-ink-soft mt-2">You're ready to explore PIK. Choose your quest, complete fun missions, and collect experiences along the way.</p>
      <div className="grid grid-cols-3 gap-2 mt-5 text-[11px] font-bold text-ink-soft">
        <div className="rounded-xl bg-teal-50 p-3"><div className="text-xl">📍</div>Visit checkpoints</div>
        <div className="rounded-xl bg-teal-50 p-3"><div className="text-xl">🎯</div>Complete missions</div>
        <div className="rounded-xl bg-teal-50 p-3"><div className="text-xl">🏅</div>Collect badges</div>
      </div>
      {verify && <div className="mt-4 text-left"><Alert tone="warn">Demo mode: no email provider is configured, so your verification link is shown here — <Link className="underline" href={verify.replace(/^https?:\/\/[^/]+/, "")}>verify email</Link></Alert></div>}
      <Button href="/quests" size="lg" variant="sun" full className="mt-6">LET'S EXPLORE!</Button>
    </div>
  );
}
