import { redirect } from "next/navigation";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { PERMISSIONS, type Permission } from "@/lib/constants";
import { AdminNav } from "@/components/admin/nav";
import { ToastProvider } from "@/components/ui/toast";

export const metadata = { title: "Admin" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (!hasPermission(user.role, "admin.access")) redirect("/");
  const allowed = (Object.keys(PERMISSIONS) as Permission[]).filter((p) => hasPermission(user.role, p));
  return (
    <ToastProvider>
      <div className="min-h-screen bg-slate-100 text-slate-900">
        <AdminNav allowed={allowed} name={user.name} role={user.role} />
        <main className="lg:pl-60"><div className="p-4 lg:p-8 max-w-[1400px] mx-auto">{children}</div></main>
      </div>
    </ToastProvider>
  );
}
