"use client";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";

type Toast = { id: number; message: string; tone: "success" | "error" | "info" };
const Ctx = createContext<{ toast: (message: string, tone?: Toast["tone"]) => void }>({ toast: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const toast = useCallback((message: string, tone: Toast["tone"] = "info") => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s, { id, message, tone }]);
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), 3500);
  }, []);
  const value = useMemo(() => ({ toast }), [toast]);
  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-[min(92vw,420px)] pointer-events-none">
        {items.map((t) => (
          <div key={t.id} className={`animate-pop pointer-events-auto flex items-center gap-2 rounded-2xl px-4 py-3 shadow-float text-sm font-semibold ${t.tone === "success" ? "bg-emerald-600 text-white" : t.tone === "error" ? "bg-rose-600 text-white" : "bg-ink text-white"}`}>
            {t.tone === "success" ? <CheckCircle2 className="size-4" /> : t.tone === "error" ? <AlertCircle className="size-4" /> : <Info className="size-4" />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
export const useToast = () => useContext(Ctx);
