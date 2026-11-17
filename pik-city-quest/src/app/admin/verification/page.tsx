import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { VerificationQueue } from "./queue";
export const dynamic = "force-dynamic";
export default async function VerificationPage() {
  await requirePermission("verification.review");
  const quests = await prisma.quest.findMany({ where: { archivedAt: null }, select: { id: true, name: true } });
  return <VerificationQueue quests={quests} />;
}
