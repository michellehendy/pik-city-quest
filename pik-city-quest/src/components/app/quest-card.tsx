import Image from "next/image";
import Link from "next/link";
import { Clock, MapPin, Zap } from "lucide-react";
import { Difficulty, Pill } from "@/components/ui";
import { formatDuration } from "@/lib/utils";

export type QuestCardData = { slug: string; name: string; tagline: string | null; description: string; coverImage: string | null; type: string; difficulty: string; durationMinutes: number; userStatus: string; totals: { checkpoints: number; totalXp: number }; };

export function statusTone(s: string) {
  return ({ AVAILABLE: "teal", ONGOING: "sun", COMPLETED: "green", UPCOMING: "purple", ENDED: "gray", LOCKED: "gray" } as Record<string, "teal" | "sun" | "green" | "purple" | "gray">)[s] ?? "gray";
}

export function QuestCard({ q, compact }: { q: QuestCardData; compact?: boolean }) {
  return (
    <Link href={`/quests/${q.slug}`} className={`card overflow-hidden block group ${compact ? "w-[270px]" : ""}`}>
      <div className={`relative ${compact ? "h-36" : "h-44"}`}>
        {q.coverImage && <Image src={q.coverImage} alt={q.name} fill sizes="(min-width:1024px) 400px, 90vw" className="object-cover transition duration-500 group-hover:scale-105" />}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/10 to-transparent" />
        <div className="absolute top-3 left-3 flex gap-1.5"><Pill tone={q.type === "SPECIAL" ? "sun" : "white"}>{q.type === "SPECIAL" ? "★ Special" : "Regular"}</Pill></div>
        <div className="absolute top-3 right-3"><Pill tone={statusTone(q.userStatus)}>{q.userStatus}</Pill></div>
        <div className="absolute bottom-3 left-3 right-3 text-white">
          <div className="font-black text-lg leading-tight drop-shadow">{q.name}</div>
          {q.tagline && <div className="text-xs font-semibold text-white/85 line-clamp-1">{q.tagline}</div>}
        </div>
      </div>
      <div className="p-3.5">
        {!compact && <p className="text-xs text-ink-soft line-clamp-2 mb-2.5">{q.description}</p>}
        <div className="flex items-center gap-2 text-[11px] font-bold text-ink-soft flex-wrap">
          <Difficulty level={q.difficulty} />
          <span className="inline-flex items-center gap-1"><Clock className="size-3.5" />{formatDuration(q.durationMinutes)}</span>
          <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{q.totals.checkpoints} stops</span>
          <span className="inline-flex items-center gap-1 text-teal-700"><Zap className="size-3.5" />{q.totals.totalXp} XP</span>
        </div>
      </div>
    </Link>
  );
}
