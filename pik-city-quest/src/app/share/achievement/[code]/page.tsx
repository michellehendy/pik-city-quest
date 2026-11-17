import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { fmtDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** Public achievement page (reached from the QR on share cards). Respects the explorer's privacy setting. */
export default async function PublicAchievement({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const run = await prisma.questRun.findUnique({ where: { completionCode: code }, include: { user: true, quest: { include: { badges: true } }, checkpoints: { where: { status: "COMPLETED" }, include: { checkpoint: { include: { destination: true } } } } } });
  if (!run || run.status !== "COMPLETED") notFound();
  const isPublic = run.user.publicProfile;
  return (
    <main className="min-h-screen bg-gradient-to-br from-teal-900 via-teal-800 to-teal-600 text-white flex items-center justify-center p-5">
      <div className="w-full max-w-md rounded-3xl bg-white/10 backdrop-blur border border-white/15 p-6 text-center shadow-float">
        <div className="eyebrow !text-sun-400">PIK CITY QUEST · PIK TOURISM BOARD</div>
        <div className="mx-auto size-24 rounded-full bg-white/15 border-4 border-sun-500 flex items-center justify-center text-5xl mt-3">{run.quest.badges[0]?.icon ?? "🏆"}</div>
        <h1 className="text-2xl font-black mt-3">{isPublic ? run.user.name : "A PIK explorer"} completed</h1>
        <div className="text-xl font-extrabold text-sun-300">{run.quest.name}</div>
        <div className="text-sm text-white/85 mt-1">{run.checkpoints.length} checkpoints · {run.xpEarned} XP · {fmtDate(run.completedAt)}</div>
        {run.quest.coverImage && <div className="relative h-40 rounded-2xl overflow-hidden mt-4"><Image src={run.quest.coverImage} alt="" fill sizes="400px" className="object-cover" /></div>}
        <div className="flex flex-wrap gap-1.5 justify-center mt-4">{run.checkpoints.map((c) => <span key={c.id} className="pill bg-white/15 text-white normal-case tracking-normal">✓ {c.checkpoint.destination.name}</span>)}</div>
        <div className="text-[11px] text-white/60 mt-3">Verification code {run.completionCode}</div>
        <Link href="/register" className="btn btn-sun w-full mt-5">Start your own PIK adventure</Link>
        <a href="https://piktourism.com" className="block text-xs font-bold text-white/80 mt-3">piktourism.com ↗</a>
      </div>
    </main>
  );
}
