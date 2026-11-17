"use client";
import Link from "next/link";
import Image from "next/image";
import { cn, initials } from "@/lib/utils";
import { Loader2, X } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";

type BtnVariant = "primary" | "sun" | "ghost" | "outline" | "danger" | "dark";
type BtnProps = {
  variant?: BtnVariant; size?: "sm" | "md" | "lg"; href?: string; className?: string; children: ReactNode; loading?: boolean; disabled?: boolean;
  onClick?: () => void; type?: "button" | "submit"; full?: boolean; target?: string;
};
export function Button({ variant = "primary", size = "md", href, className, children, loading, disabled, onClick, type = "button", full, target }: BtnProps) {
  const cls = cn("btn", `btn-${variant}`, size === "sm" && "min-h-9 px-3.5 py-2 text-xs", size === "lg" && "min-h-13 px-6 py-4 text-base", full && "w-full", className);
  if (href) return <Link href={href} target={target} className={cls} aria-disabled={disabled}>{children}</Link>;
  return (
    <button type={type} className={cls} disabled={disabled || loading} onClick={onClick}>
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

export function Avatar({ src, name, size = 40, className, ring }: { src?: string | null; name: string; size?: number; className?: string; ring?: boolean }) {
  return (
    <div className={cn("relative shrink-0 overflow-hidden rounded-full bg-teal-100 text-teal-800 font-extrabold flex items-center justify-center", ring && "ring-2 ring-sun-500 ring-offset-2", className)} style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {src ? <Image src={src} alt={name} fill sizes={`${size}px`} className="object-cover" unoptimized /> : initials(name)}
    </div>
  );
}

export function Progress({ value, className, color = "bg-teal-600", track = "bg-teal-100", height = "h-2" }: { value: number; className?: string; color?: string; track?: string; height?: string }) {
  return (
    <div className={cn("w-full rounded-full overflow-hidden", track, height, className)}>
      <div className={cn("h-full rounded-full transition-all duration-700", color)} style={{ width: `${Math.max(0, Math.min(100, value * 100))}%` }} />
    </div>
  );
}

export function Pill({ children, tone = "teal", className }: { children: ReactNode; tone?: "teal" | "sun" | "gray" | "green" | "red" | "purple" | "white" | "dark" | "blue"; className?: string }) {
  const tones: Record<string, string> = {
    teal: "bg-teal-100 text-teal-800", sun: "bg-sun-100 text-sun-600", gray: "bg-slate-100 text-slate-600", green: "bg-emerald-100 text-emerald-700",
    red: "bg-rose-100 text-rose-700", purple: "bg-violet-100 text-violet-700", white: "bg-white/90 text-ink backdrop-blur", dark: "bg-ink text-white", blue: "bg-sky-100 text-sky-700",
  };
  return <span className={cn("pill", tones[tone], className)}>{children}</span>;
}

export function Difficulty({ level }: { level: string }) {
  const tone = level === "EASY" ? "green" : level === "MEDIUM" ? "sun" : level === "HARD" ? "red" : "purple";
  return <Pill tone={tone}>{level}</Pill>;
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-5 animate-spin text-teal-700", className)} />;
}

export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="card p-8 text-center flex flex-col items-center gap-3">
      {icon && <div className="size-14 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center text-2xl">{icon}</div>}
      <div className="font-extrabold text-ink">{title}</div>
      {body && <p className="text-sm text-ink-soft max-w-xs">{body}</p>}
      {action}
    </div>
  );
}

export function Sheet({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title?: string; children: ReactNode; wide?: boolean }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, onClose]);
  if (!open || !mounted) return null;
  // Portal to <body> so the sheet escapes any stacking context (sticky bars, fixed nav) and always sits on top.
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center" role="dialog" aria-modal>
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={onClose} />
      <div className={cn("relative w-full bg-white rounded-t-3xl sm:rounded-3xl shadow-float max-h-[92vh] overflow-y-auto", wide ? "sm:max-w-2xl" : "sm:max-w-md")}>
        <div className="sticky top-0 bg-white/95 backdrop-blur flex items-center justify-between px-5 pt-4 pb-3 border-b border-teal-800/5">
          <div className="mx-auto sm:hidden absolute left-1/2 -translate-x-1/2 top-2 h-1.5 w-12 rounded-full bg-slate-200" />
          <h3 className="font-extrabold text-ink mt-1">{title}</h3>
          <button onClick={onClose} className="size-9 rounded-full bg-slate-100 flex items-center justify-center" aria-label="Close"><X className="size-4" /></button>
        </div>
        <div className="p-5 pb-[calc(1.25rem+var(--safe-bottom))]">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

export function SectionHeader({ title, eyebrow, action, href }: { title: string; eyebrow?: string; action?: string; href?: string }) {
  return (
    <div className="flex items-end justify-between mb-3 px-1">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h2 className="section-title">{title}</h2>
      </div>
      {action && href && <Link href={href} className="text-xs font-bold text-teal-700 hover:underline">{action}</Link>}
    </div>
  );
}

export function Alert({ tone = "info", children }: { tone?: "info" | "error" | "success" | "warn"; children: ReactNode }) {
  const t = { info: "bg-teal-50 text-teal-900 border-teal-200", error: "bg-rose-50 text-rose-800 border-rose-200", success: "bg-emerald-50 text-emerald-800 border-emerald-200", warn: "bg-sun-100 text-sun-600 border-sun-300" }[tone];
  return <div className={cn("rounded-xl border px-3.5 py-2.5 text-sm font-medium", t)}>{children}</div>;
}

export function Stat({ label, value, icon }: { label: string; value: ReactNode; icon?: ReactNode }) {
  return (
    <div className="card p-3.5 flex items-center gap-3">
      {icon && <div className="size-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">{icon}</div>}
      <div className="min-w-0">
        <div className="text-lg font-extrabold leading-tight text-ink">{value}</div>
        <div className="text-[11px] font-semibold text-ink-soft uppercase tracking-wide truncate">{label}</div>
      </div>
    </div>
  );
}
