"use client";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { QuestCard, type QuestCardData } from "@/components/app/quest-card";
import { DURATION_BUCKETS } from "@/lib/constants";
import { EmptyState, Sheet, Button } from "@/components/ui";
import { cn } from "@/lib/utils";

type Q = QuestCardData & { id: string; areaSlugs: string[]; startsAt: string | null; endsAt: string | null };
const STATUSES = ["ALL", "AVAILABLE", "ONGOING", "COMPLETED", "UPCOMING"];

export function QuestBrowser({ quests, areas }: { quests: Q[]; areas: Array<{ slug: string; name: string }> }) {
  const params = useSearchParams();
  const [status, setStatus] = useState(params.get("status") || "ALL");
  const [type, setType] = useState<string>("ALL");
  const [difficulty, setDifficulty] = useState<string>("ALL");
  const [duration, setDuration] = useState<string>("ALL");
  const [area, setArea] = useState<string>("ALL");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => quests.filter((q) => {
    if (status !== "ALL" && q.userStatus !== status) return false;
    if (type !== "ALL" && q.type !== type) return false;
    if (difficulty !== "ALL" && q.difficulty !== difficulty) return false;
    if (area !== "ALL" && !q.areaSlugs.includes(area)) return false;
    if (duration !== "ALL") { const b = DURATION_BUCKETS.find((x) => x.key === duration)!; if (q.durationMinutes < b.min || q.durationMinutes > b.max) return false; }
    return true;
  }), [quests, status, type, difficulty, duration, area]);
  const activeFilters = [type, difficulty, duration, area].filter((x) => x !== "ALL").length;

  return (
    <section>
      <div className="flex items-center justify-between mb-3 px-1"><h2 className="section-title">Choose your quest</h2><button onClick={() => setOpen(true)} className="btn btn-ghost min-h-9 px-3 text-xs"><SlidersHorizontal className="size-4" />Filters{activeFilters ? ` · ${activeFilters}` : ""}</button></div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-3">
        <Chip active={type === "SPECIAL"} onClick={() => setType(type === "SPECIAL" ? "ALL" : "SPECIAL")}>★ Special</Chip>
        <Chip active={type === "REGULAR"} onClick={() => setType(type === "REGULAR" ? "ALL" : "REGULAR")}>Regular</Chip>
        <span className="w-px bg-teal-800/10 my-1" />
        {STATUSES.map((s) => <Chip key={s} active={status === s} onClick={() => setStatus(s)}>{s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}</Chip>)}
      </div>
      {filtered.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((q) => <QuestCard key={q.id} q={q} />)}</div> : <EmptyState icon="🧭" title="No quests match these filters" body="Try clearing a filter or check back soon — PIK Tourism adds new quests regularly." action={<Button variant="ghost" onClick={() => { setStatus("ALL"); setType("ALL"); setDifficulty("ALL"); setDuration("ALL"); setArea("ALL"); }}>Clear filters</Button>} />}
      <Sheet open={open} onClose={() => setOpen(false)} title="Filter quests">
        <Group label="Difficulty">{["ALL", "EASY", "MEDIUM", "HARD", "EXPERT"].map((d) => <Chip key={d} active={difficulty === d} onClick={() => setDifficulty(d)}>{d === "ALL" ? "Any" : d}</Chip>)}</Group>
        <Group label="Duration"><Chip active={duration === "ALL"} onClick={() => setDuration("ALL")}>Any</Chip>{DURATION_BUCKETS.map((b) => <Chip key={b.key} active={duration === b.key} onClick={() => setDuration(b.key)}>{b.label}</Chip>)}</Group>
        <Group label="Area"><Chip active={area === "ALL"} onClick={() => setArea("ALL")}>All PIK</Chip>{areas.map((a) => <Chip key={a.slug} active={area === a.slug} onClick={() => setArea(a.slug)}>{a.name}</Chip>)}</Group>
        <Group label="Quest type">{["ALL", "SPECIAL", "REGULAR"].map((t) => <Chip key={t} active={type === t} onClick={() => setType(t)}>{t === "ALL" ? "Both" : t}</Chip>)}</Group>
        <Button full className="mt-2" onClick={() => setOpen(false)}>Show {filtered.length} quest{filtered.length === 1 ? "" : "s"}</Button>
      </Sheet>
    </section>
  );
}
function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={cn("shrink-0 rounded-full px-3.5 py-2 text-xs font-bold border transition", active ? "bg-teal-800 text-white border-teal-800" : "bg-white text-ink-soft border-teal-800/10")}>{children}</button>;
}
function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="mb-4"><div className="label">{label}</div><div className="flex flex-wrap gap-2">{children}</div></div>;
}
