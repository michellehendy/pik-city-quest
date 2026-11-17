import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

/** Landing route printed inside venue QR codes. Sends the visitor to the right mission with the token pre-filled. */
export default async function QrLanding({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/qr/${token}`);
  const qr = await prisma.qrCode.findUnique({ where: { token }, include: { destination: true, mission: true } });
  if (!qr || !qr.isActive) redirect("/quests?qr=invalid");
  const run = await prisma.questRun.findFirst({ where: { userId: user.id, status: "ACTIVE", quest: { checkpoints: { some: { destinationId: qr.destinationId ?? "__", missions: qr.missionId ? { some: { missionId: qr.missionId } } : { some: { mission: { type: { in: ["QR", "MULTI"] } } } } } } } }, include: { quest: { include: { checkpoints: { where: { destinationId: qr.destinationId ?? "__" }, include: { missions: { include: { mission: { include: { requirements: true } } } } } } } } } });
  const cp = run?.quest.checkpoints[0];
  const cm = cp?.missions.find((m) => (qr.missionId ? m.missionId === qr.missionId : m.mission.requirements.some((r) => r.type === "QR")));
  if (run && cp && cm) redirect(`/quests/${run.quest.slug}/mission/${cp.id}/${cm.missionId}?qr=${token}`);
  if (qr.destination) redirect(`/destinations/${qr.destination.slug}?qr=${token}`);
  redirect("/quests");
}
