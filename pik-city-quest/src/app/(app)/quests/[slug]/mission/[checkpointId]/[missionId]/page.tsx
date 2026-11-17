import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock, MapPin, Navigation, Sparkles, Zap } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TopBar } from "@/components/app/top-bar";
import { Button, Difficulty, Pill } from "@/components/ui";
import { MissionRunner } from "@/components/mission/mission-runner";
import { safeRequirements } from "@/lib/safe-mission";
import { MISSION_TYPE_META } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function MissionPage({ params }: { params: Promise<{ slug: string; checkpointId: string; missionId: string }> }) {
  const { slug, checkpointId, missionId } = await params;
  const me = (await getCurrentUser())!;
  const cp = await prisma.questCheckpoint.findUnique({ where: { id: checkpointId }, include: { quest: true, destination: { include: { area: true } }, missions: { where: { missionId }, include: { mission: { include: { requirements: { orderBy: { order: "asc" } } } } } } } });
  if (!cp || cp.quest.slug !== slug || !cp.missions[0]) notFound();
  const cm = cp.missions[0];
  const run = await prisma.questRun.findFirst({ where: { userId: me.id, questId: cp.questId, status: "ACTIVE" }, include: { checkpoints: { where: { checkpointId } } } });
  const prog = run?.checkpoints[0];
  const locked = !run || !prog || prog.status === "LOCKED";
  const existing = run ? await prisma.missionSubmission.findFirst({ where: { userId: me.id, missionId, questRunId: run.id, checkpointId }, include: { requirements: true }, orderBy: { startedAt: "desc" } }) : null;
  const unread = await prisma.notification.count({ where: { userId: me.id, isRead: false } });
  const m = cm.mission;

  return (
    <div>
      <TopBar back={`/quests/${slug}`} title={m.name} unread={unread} />
      <div className="mx-auto max-w-lg lg:max-w-3xl px-4 space-y-4">
        <section className="card overflow-hidden">
          <div className="relative h-36">
            {cp.destination.coverImage && <Image src={cp.destination.coverImage} alt={cp.destination.name} fill sizes="100vw" className="object-cover" />}
            <div className="absolute inset-0 bg-gradient-to-t from-ink/85 to-transparent" />
            <div className="absolute bottom-3 left-4 right-4 text-white">
              <div className="text-[10px] font-black tracking-widest text-sun-400 uppercase">Checkpoint {cp.order + 1} · {cp.quest.name}</div>
              <div className="font-black text-lg leading-tight">{cp.destination.name}</div>
              <div className="text-xs text-white/85 flex items-center gap-1"><MapPin className="size-3" />{cp.destination.area.name}{cp.destination.openingHours ? ` · ${cp.destination.openingHours}` : ""}</div>
            </div>
          </div>
          <div className="p-4 space-y-2">
            <div className="flex flex-wrap gap-1.5"><Pill tone="teal">{MISSION_TYPE_META[m.type]?.label}</Pill><Difficulty level={m.difficulty} /><Pill tone="sun"><Zap className="size-3" />+{cm.xpOverride ?? m.xp} XP</Pill><Pill tone={m.verification === "AUTO" ? "green" : "purple"}>{m.verification === "AUTO" ? "Auto-verified" : "Reviewed by PIK team"}</Pill>{!cm.isMandatory && <Pill tone="gray">Optional</Pill>}</div>
            <p className="text-sm text-ink-soft">{m.description}</p>
            <div className="rounded-xl bg-teal-50 p-3 text-sm text-ink"><span className="font-black text-teal-800">What to do: </span>{m.instructions}</div>
            <div className="flex gap-2 pt-1">
              <a className="btn btn-ghost min-h-9 px-3 text-xs" href={`https://www.google.com/maps/dir/?api=1&destination=${cp.destination.lat},${cp.destination.lng}`} target="_blank" rel="noreferrer"><Navigation className="size-4" />How to get there</a>
              <Link className="btn btn-ghost min-h-9 px-3 text-xs" href={`/taupik`}><Sparkles className="size-4" />Ask TauPIK</Link>
            </div>
          </div>
        </section>
        {locked ? (
          <section className="card p-6 text-center space-y-2"><Lock className="mx-auto size-8 text-ink-soft" /><div className="font-black">This checkpoint is locked</div><p className="text-sm text-ink-soft">{run ? "Complete the previous checkpoint to unlock it." : "Start the quest to play this mission."}</p><Button href={`/quests/${slug}`} variant="ghost">Back to quest</Button></section>
        ) : (
          <MissionRunner
            mission={{ id: m.id, name: m.name, description: m.description, instructions: m.instructions, type: m.type, xp: cm.xpOverride ?? m.xp, difficulty: m.difficulty, verification: m.verification, stepsOrdered: m.stepsOrdered, maxAttempts: m.maxAttempts, timeLimitSec: m.timeLimitSec, requirements: safeRequirements(m.requirements) }}
            destination={{ name: cp.destination.name, lat: cp.destination.lat, lng: cp.destination.lng, gpsRadiusM: cp.destination.gpsRadiusM, slug: cp.destination.slug }}
            checkpointId={cp.id} runId={run!.id} questId={cp.questId} questSlug={slug}
            initial={existing ? { id: existing.id, status: existing.status, rejectionReason: existing.rejectionReason, requirements: existing.requirements.map((r) => ({ requirementId: r.requirementId, status: r.status, attempts: r.attempts, rejectionReason: r.rejectionReason })) } : null}
          />
        )}
      </div>
    </div>
  );
}
