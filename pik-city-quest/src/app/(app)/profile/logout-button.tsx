"use client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
export function LogoutButton({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  return <Button variant="outline" full onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); router.push("/login"); router.refresh(); }}>{children}</Button>;
}
