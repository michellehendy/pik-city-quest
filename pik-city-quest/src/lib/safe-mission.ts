import { parseJson } from "./utils";
import type { SafeRequirement } from "@/components/mission/mission-runner";

/** Strips answer keys and secret codes before a mission reaches the browser. */
export function safeRequirements(reqs: Array<{ id: string; order: number; type: string; label: string | null; isMandatory: boolean; config: string }>): SafeRequirement[] {
  return reqs.map((r) => {
    const c = parseJson<Record<string, unknown>>(r.config, {});
    const safe: SafeRequirement["config"] = { maxAttempts: (c.maxAttempts as number) ?? null, timerSec: (c.timerSec as number) ?? null, prompt: c.prompt as string, maxSizeMB: c.maxSizeMB as number, radiusM: c.radiusM as number, timeWindow: c.timeWindow as { from: string; to: string } | undefined, hashtag: c.hashtag as string, platform: c.platform as string };
    if (r.type === "QUIZ") safe.questions = ((c.questions as Array<{ id: string; text: string; options: string[]; type?: string }>) ?? []).map((q) => ({ id: q.id, text: q.text, options: q.options, type: q.type }));
    return { id: r.id, order: r.order, type: r.type, label: r.label, isMandatory: r.isMandatory, config: safe };
  });
}
