import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, ExternalLink, MapPin, Navigation, Phone, Play, Sparkles, Zap } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TopBar } from "@/components/app/top-bar";
import { Button, Pill } from "@/components/ui";
import { parseJson } from "@/lib/utils";
import { MISSION_TYPE_META } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function DestinationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const me = (await getCurrentUser())!;
  const d = await prisma.destination.findUnique({ where: { slug }, include: { area: true, missions: { where: { isActive: true } }, checkpoints: { where: { quest: { status: "PUBLISHED", archivedAt: null } }, include: { quest: true, missions: { include: { mission: true } } } }, events: { where: { endDate: { gte: new Date() } }, orderBy: { startDate: "asc" }, take: 5 } } });
  if (!d) notFound();
  const gallery = parseJson<string[]>(d.gallery, []);
  const tags = parseJson<string[]>(d.tags, []);
  const quests = Array.from(new Map(d.checkpoints.map((c) => [c.questId, c])).values());
  const activeRun = await prisma.questRun.findFirst({ where: { userId: me.id, status: "ACTIVE", quest: { checkpoints: { some: { destinationId: d.id } } } }, include: { quest: { include: { checkpoints: { where: { destinationId: d.id }, include: { missions: true } } } }, checkpoints: true } });
  const activeCp = activeRun?.quest.checkpoints[0];
  const activeProg = activeCp ? activeRun!.checkpoints.find((c) => c.checkpointId === activeCp.id) : null;
  const totalXp = d.checkpoints.reduce((s, c) => s + c.missions.reduce((t, m) => t + (m.xpOverride ?? m.mission.xp), 0), 0) + d.missions.reduce((s, m) => s + m.xp, 0);
  return (
    <div>
      <TopBar back="/map" title={d.name} />
      <div className="mx-auto max-w-lg lg:max-w-3xl px-4 space-y-4">
        <section className="relative h-60 rounded-3xl overflow-hidden shadow-float">{d.coverImage && <Image src={d.coverImage} alt={d.name} fill priority sizes="100vw" className="object-cover" />}<div className="absolute inset-0 bg-gradient-to-t from-ink/85 to-transparent" /><div className="absolute top-3 left-3 flex gap-1.5"><Pill tone="white">{d.category}</Pill><Pill tone="sun">{d.area.name}</Pill></div><div className="absolute bottom-4 left-4 right-4 text-white"><h1 className="text-2xl font-black leading-tight">{d.name}</h1><p className="text-xs text-white/85">{d.description}</p></div></section>
        <section className="grid grid-cols-2 gap-2">
          <a className="btn btn-primary" href={`https://www.google.com/maps/dir/?api=1&destination=${d.lat},${d.lng}`} target="_blank" rel="noreferrer"><Navigation className="size-4" />How to get there</a>
          <Link className="btn btn-ghost" href="/taupik"><Sparkles className="size-4" />Ask TauPIK</Link>
          {activeCp && activeProg && activeProg.status !== "LOCKED" && activeProg.status !== "COMPLETED" && activeCp.missions[0] && <Link className="btn btn-sun col-span-2" href={`/quests/${activeRun!.quest.slug}/mission/${activeCp.id}/${activeCp.missions[0].missionId}`}><Play className="size-4" />Start mission</Link>}
          {d.websiteUrl && <a className="btn btn-outline col-span-2" href={d.websiteUrl} target="_blank" rel="noreferrer"><ExternalLink className="size-4" />Visit destination on piktourism.com</a>}
        </section>
        <section className="card p-4 space-y-2 text-sm">
          {d.address && <div className="flex gap-2 text-ink-soft"><MapPin className="size-4 shrink-0 text-teal-700" />{d.address}</div>}
          {d.openingHours && <div className="flex gap-2 text-ink-soft"><Clock className="size-4 shrink-0 text-teal-700" />{d.openingHours}</div>}
          {d.phone && <div className="flex gap-2 text-ink-soft"><Phone className="size-4 shrink-0 text-teal-700" />{d.phone}</div>}
          <div className="flex gap-2 text-ink-soft"><Zap className="size-4 shrink-0 text-sun-500" />{totalXp} XP available across {quests.length} quest{quests.length === 1 ? "" : "s"} · GPS radius {d.gpsRadiusM} m</div>
          {!!tags.length && <div className="flex flex-wrap gap-1 pt-1">{tags.map((t) => <Pill key={t} tone="gray">{t}</Pill>)}</div>}
        </section>
        {d.longDescription && <section className="card p-4 text-sm text-ink-soft whitespace-pre-line leading-relaxed">{d.longDescription}</section>}
        {!!gallery.length && <section className="snap-row no-scrollbar -mx-4 px-4">{gallery.map((g) => <div key={g} className="relative w-56 h-40 rounded-2xl overflow-hidden"><Image src={g} alt="" fill sizes="224px" className="object-cover" /></div>)}</section>}
        {!!quests.length && <section><div className="section-title mb-2 px-1">Quests featuring this destination</div><div className="space-y-2">{quests.map((c) => <Link key={c.id} href={`/quests/${c.quest.slug}`} className="card p-3 flex items-center gap-3"><div className="relative size-14 rounded-xl overflow-hidden shrink-0">{c.quest.coverImage && <Image src={c.quest.coverImage} alt="" fill sizes="56px" className="object-cover" />}</div><div className="flex-1 min-w-0"><div className="font-extrabold text-sm text-ink">{c.quest.name}</div><div className="text-[11px] text-ink-soft">Checkpoint {c.order + 1} · {c.missions.map((m) => MISSION_TYPE_META[m.mission.type]?.label).join(", ")}</div></div><Pill tone={c.quest.type === "SPECIAL" ? "sun" : "teal"}>{c.quest.type}</Pill></Link>)}</div></section>}
        {!!d.events.length && <section><div className="section-title mb-2 px-1">Upcoming events here</div><div className="space-y-2">{d.events.map((e) => <a key={e.id} href={e.url ?? "#"} target="_blank" rel="noreferrer" className="card p-3 flex gap-3"><div className="rounded-xl bg-teal-800 text-white px-3 py-2 text-center shrink-0"><div className="text-[10px] font-bold uppercase">{e.startDate.toLocaleString("en", { month: "short" })}</div><div className="text-lg font-black leading-none">{e.startDate.getDate()}</div></div><div className="min-w-0"><div className="font-bold text-sm text-ink line-clamp-1">{e.title}</div><div className="text-[11px] text-ink-soft line-clamp-2">{e.excerpt ?? e.description}</div></div></a>)}</div></section>}
        <Button href={`/map?focus=${d.slug}`} variant="ghost" full><MapPin className="size-4" />Show on map</Button>
      </div>
    </div>
  );
}
