"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Sheet } from "@/components/ui";
import { TauPikChat } from "@/components/app/taupik-chat";

export function TauPikFab({ context }: { context?: Record<string, string> }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  if (path.startsWith("/taupik")) return null;
  return (
    <>
      <button onClick={() => setOpen(true)} aria-label="Ask TauPIK" className="fixed z-50 right-4 bottom-[calc(var(--nav-h)+var(--safe-bottom)+0.9rem)] lg:bottom-8 size-14 rounded-full bg-gradient-to-br from-teal-700 to-teal-500 text-white shadow-float flex items-center justify-center animate-float">
        <Sparkles className="size-6" />
        <span className="absolute -top-1 -left-1 size-4 rounded-full bg-sun-500 border-2 border-white" />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="TauPIK · AI tourism assistant" wide>
        <TauPikChat compact context={context} />
      </Sheet>
    </>
  );
}
