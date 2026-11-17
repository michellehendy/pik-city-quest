import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { BottomNav, SideNav } from "@/components/app/bottom-nav";
import { ToastProvider } from "@/components/ui/toast";
import { TauPikFab } from "@/components/app/taupik-fab";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return (
    <ToastProvider>
      <SideNav name={user.name} avatar={user.avatarUrl} />
      <div className="lg:pl-64 min-h-screen flex flex-col">
        <main className="flex-1 pb-[calc(var(--nav-h)+var(--safe-bottom)+1rem)] lg:pb-10">{children}</main>
      </div>
      <TauPikFab />
      <BottomNav />
    </ToastProvider>
  );
}
