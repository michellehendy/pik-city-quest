import Image from "next/image";
import Link from "next/link";
import { ToastProvider } from "@/components/ui/toast";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="min-h-screen lg:grid lg:grid-cols-2">
        <div className="relative h-56 lg:h-auto overflow-hidden">
          <Image src="https://storage.googleapis.com/gcs-pik-prod/pik-prod/places/1508/image/cbd-beachwalk-1777370083.webp" alt="Dermaga CBD Beachwalk PIK2" fill priority sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-teal-950/90 via-teal-950/30 to-teal-950/10" />
          <div className="absolute left-5 top-5 bg-white/95 rounded-2xl px-3 py-2 shadow-float"><Image src="/pik-tourism-board-logo.png" alt="PIK Tourism Board" width={92} height={64} className="h-10 w-auto" /></div>
          <div className="absolute bottom-5 left-5 right-5 text-white">
            <div className="eyebrow !text-sun-400">PIK Tourism Board presents</div>
            <div className="text-3xl lg:text-5xl font-black tracking-tight leading-none">PIK CITY QUEST</div>
            <div className="mt-1 text-xs lg:text-base font-semibold text-white/85">EXPLORE PIK. COMPLETE QUESTS. COLLECT EXPERIENCES.</div>
          </div>
        </div>
        <div className="flex items-start lg:items-center justify-center px-5 py-6 lg:py-12">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>
      <footer className="text-center text-[11px] text-ink-soft pb-6 -mt-2">
        Complements <Link href="https://piktourism.com" target="_blank" className="font-bold text-teal-700">piktourism.com</Link> · will live at piktourism.com/city-quest
      </footer>
    </ToastProvider>
  );
}
