"use client";
import { use, useEffect, useState } from "react";
import { Button, Alert, Spinner } from "@/components/ui";
import { postJson } from "@/components/ui/fetcher";

export default function VerifyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [msg, setMsg] = useState("");
  useEffect(() => { postJson("/api/auth/verify", { token }).then(() => setState("ok")).catch((e) => { setMsg(e.message); setState("error"); }); }, [token]);
  return (
    <div className="card p-6 sm:p-8 text-center">
      {state === "loading" && <div className="flex justify-center"><Spinner /></div>}
      {state === "ok" && <><div className="text-4xl">✅</div><h1 className="text-xl font-black mt-2">Email verified</h1><p className="text-sm text-ink-soft">Your account is fully set up.</p><Button href="/" className="mt-4">Go to PIK City Quest</Button></>}
      {state === "error" && <><Alert tone="error">{msg}</Alert><Button href="/" variant="ghost" className="mt-4">Continue</Button></>}
    </div>
  );
}
