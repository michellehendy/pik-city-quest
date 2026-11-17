import Image from "next/image";
import { notFound } from "next/navigation";
import { MapPin, Zap } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TopBar } from "@/components/app/top-bar";
import { Difficulty, Pill } from "@/components/ui";
import { MissionRunner } from "@/components/mission/mission-runner";
import { safeRequirements } from "@/lib/safe-mission";
import { MISSION_TYPE_META } from "@/lib/constants";

export const dynamic = "force-dynamic";

/** Standalone mission (daily / weekly / bonus challenges) – not tied to a quest checkpoint. */
export default async function StandaloneMissionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = (await getCurrentUser())!;
  const m = await prisma.mission.findUnique({ where: { id }, include: { destination: { include: { area: true } }, requirements: { orderBy: { order: "asc" } } } });
  if (!m || !m.isActive) notFound();
  const existing = await prisma.missionSubmission.findFirst({ where: { userId: me.id, missionId: id, questRunId: null, checkpointId: null }, include: { requirements: true }, orderBy: { startedAt: "desc" } });
  return (
    <div>
      <TopBar back="/" title={m.name} />
      <div className="mx-auto max-w-lg lg:max-w-3xl px-4 space-y-4">
        <section className="card overflow-hidden">
          {m.destination?.coverImage && <div className="relative h-32"><Image src={m.destination.coverImage} alt="" fill sizes="100vw" className="object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-ink/80 to-transparent" /><div className="absolute bottom-3 left-4 text-white font-black">{m.destination.name}</div></div>}
          <div className="p-4 space-y-2">
            <div className="flex flex-wrap gap-1.5"><Pill tone="teal">{MISSION_TYPE_META[m.type]?.label}</Pill><Difficulty level={m.difficulty} /><Pill tone="sun"><Zap className="size-3" />+{m.xp} XP</Pill></div>
            <p className="text-sm text-ink-soft">{m.description}</p>
            <div className="rounded-xl bg-teal-50 p-3 text-sm"><b className="text-teal-800">What to do: </b>{m.instructions}</div>
            {m.destination && <div className="text-xs text-ink-soft flex items-center gap-1"><MapPin className="size-3" />{m.destination.address}</div>}
          </div>
        </section>
        <MissionRunner
          mission={{ id: m.id, name: m.name, description: m.description, instructions: m.instructions, type: m.type, xp: m.xp, difficulty: m.difficulty, verification: m.verification, stepsOrdered: m.stepsOrdered, maxAttempts: m.maxAttempts, timeLimitSec: m.timeLimitSec, requirements: safeRequirements(m.requirements) }}
          destination={m.destination ? { name: m.destination.name, lat: m.destination.lat, lng: m.destination.lng, gpsRadiusM: m.destination.gpsRadiusM, slug: m.destination.slug } : null}
          checkpointId={null} runId={null} questId={null} questSlug={null}
          initial={existing ? { id: existing.id, status: existing.status, rejectionReason: existing.rejectionReason, requirements: existing.requirements.map((r) => ({ requirementId: r.requirementId, status: r.status, attempts: r.attempts, rejectionReason: r.rejectionReason })) } : null}
        />
      </div>
    </div>
  );
}
