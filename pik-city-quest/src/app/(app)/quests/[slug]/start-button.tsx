"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Sheet, Alert } from "@/components/ui";
import { postJson } from "@/components/ui/fetcher";

export function StartQuestButton({ questId, rules, name, size = "lg", label = "START QUEST" }: { questId: string; rules: string | null; name: string; size?: "md" | "lg"; label?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function start() {
    setBusy(true); setErr(null);
    try { await postJson(`/api/quests/${questId}/start`); setOpen(false); router.refresh(); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  return (
    <>
      <Button onClick={() => setOpen(true)} size={size} variant="sun" full>{label}</Button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Before you start">
        <div className="space-y-3">
          <div className="font-black text-ink text-lg">{name}</div>
          <ul className="text-sm text-ink-soft space-y-2 list-disc pl-5">
            {(rules ?? "").split(/(?<=\.)\s+/).filter(Boolean).map((r, i) => <li key={i}>{r}</li>)}
            <li>Your progress is saved automatically — you can pause and continue any day while the quest is active.</li>
          </ul>
          {err && <Alert tone="error">{err}</Alert>}
          <Button onClick={start} loading={busy} full size="lg">I'm ready — start quest</Button>
        </div>
      </Sheet>
    </>
  );
}
