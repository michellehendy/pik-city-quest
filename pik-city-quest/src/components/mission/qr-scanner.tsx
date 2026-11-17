"use client";
import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { Camera, Keyboard, ImageUp } from "lucide-react";
import { Button, Alert } from "@/components/ui";

/** Camera QR scanner using getUserMedia + jsQR, with manual-entry and image-upload fallbacks. */
export function QrScanner({ onToken, busy }: { onToken: (token: string) => void; busy?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [active, setActive] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const [showManual, setShowManual] = useState(false);
  const lastRef = useRef<string>("");

  function extractToken(text: string) {
    try { const u = new URL(text); const t = u.searchParams.get("t") || u.pathname.split("/").filter(Boolean).pop(); return t || text; } catch { return text.trim(); }
  }

  useEffect(() => {
    if (!active) return;
    let stream: MediaStream | null = null;
    let raf = 0; let stopped = false;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("Camera is not supported in this browser.");
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        const v = videoRef.current!; v.srcObject = stream; v.setAttribute("playsinline", "true"); await v.play();
        const c = canvasRef.current!; const ctx = c.getContext("2d", { willReadFrequently: true })!;
        const tick = () => {
          if (stopped) return;
          if (v.readyState === v.HAVE_ENOUGH_DATA) {
            c.width = v.videoWidth; c.height = v.videoHeight; ctx.drawImage(v, 0, 0, c.width, c.height);
            const img = ctx.getImageData(0, 0, c.width, c.height);
            const code = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
            if (code?.data && code.data !== lastRef.current) { lastRef.current = code.data; onToken(extractToken(code.data)); setActive(false); return; }
          }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch (e) { setErr((e as Error).name === "NotAllowedError" ? "Camera permission denied. Allow camera access in your browser settings, or enter the code manually." : (e as Error).message); setActive(false); }
    })();
    return () => { stopped = true; cancelAnimationFrame(raf); stream?.getTracks().forEach((t) => t.stop()); };
  }, [active, onToken]);

  async function fromImage(file: File) {
    const bmp = await createImageBitmap(file);
    const c = canvasRef.current!; c.width = bmp.width; c.height = bmp.height;
    const ctx = c.getContext("2d")!; ctx.drawImage(bmp, 0, 0);
    const img = ctx.getImageData(0, 0, c.width, c.height);
    const code = jsQR(img.data, img.width, img.height);
    if (code?.data) onToken(extractToken(code.data)); else setErr("No QR code found in that image.");
  }

  return (
    <div className="space-y-3">
      <div className="relative rounded-2xl overflow-hidden bg-ink aspect-square max-h-80 mx-auto">
        <video ref={videoRef} className={`absolute inset-0 w-full h-full object-cover ${active ? "" : "hidden"}`} muted playsInline />
        <canvas ref={canvasRef} className="hidden" />
        {active ? <><div className="absolute inset-[12%] border-2 border-white/80 rounded-2xl [mask:linear-gradient(#000,#000)]" /><div className="scanline" /></> : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white/90 gap-3 p-6 text-center">
            <Camera className="size-10" />
            <p className="text-sm font-semibold">Point your camera at the PIK City Quest QR code displayed at the venue.</p>
            <Button onClick={() => { setErr(null); setActive(true); }} variant="sun" loading={busy}>Open camera</Button>
          </div>
        )}
      </div>
      {err && <Alert tone="error">{err}</Alert>}
      <div className="flex gap-2 justify-center text-xs font-bold">
        <label className="btn btn-ghost min-h-9 px-3 text-xs cursor-pointer"><ImageUp className="size-4" />Upload QR image<input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && fromImage(e.target.files[0])} /></label>
        <button onClick={() => setShowManual((s) => !s)} className="btn btn-ghost min-h-9 px-3 text-xs"><Keyboard className="size-4" />Enter code</button>
      </div>
      {showManual && <form onSubmit={(e) => { e.preventDefault(); if (manual.trim()) onToken(manual.trim()); }} className="flex gap-2"><input className="input" placeholder="QR token printed under the code" value={manual} onChange={(e) => setManual(e.target.value)} /><Button type="submit" loading={busy}>Verify</Button></form>}
    </div>
  );
}
