"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

export type QuizQuestion = { id: string; text: string; options: string[]; type?: string };
export function Quiz({ questions, timerSec, onSubmit, busy }: { questions: QuizQuestion[]; timerSec?: number | null; onSubmit: (answers: Record<string, number>) => void; busy?: boolean }) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [left, setLeft] = useState<number | null>(timerSec ?? null);
  useEffect(() => {
    if (left == null) return;
    if (left <= 0) { onSubmit(answers); return; }
    const t = setTimeout(() => setLeft((l) => (l == null ? l : l - 1)), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left]);
  const complete = questions.every((q) => answers[q.id] != null);
  return (
    <div className="space-y-4">
      {left != null && <div className="text-xs font-black text-ink-soft text-right">⏱ {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}</div>}
      {questions.map((q, i) => (
        <div key={q.id} className="rounded-2xl bg-white shadow-card p-4">
          <div className="text-xs font-black text-teal-700 mb-1">QUESTION {i + 1} / {questions.length}</div>
          <div className="font-bold text-ink">{q.text}</div>
          <div className="grid gap-2 mt-3">
            {q.options.map((o, oi) => (
              <button key={oi} onClick={() => setAnswers({ ...answers, [q.id]: oi })} className={cn("text-left rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition", answers[q.id] === oi ? "border-teal-800 bg-teal-800 text-white" : "border-teal-800/10 bg-white hover:bg-teal-50")}>
                <span className="inline-block w-5 text-xs opacity-70">{String.fromCharCode(65 + oi)}</span>{o}
              </button>
            ))}
          </div>
        </div>
      ))}
      <Button full disabled={!complete} loading={busy} onClick={() => onSubmit(answers)}>Submit answers</Button>
    </div>
  );
}
