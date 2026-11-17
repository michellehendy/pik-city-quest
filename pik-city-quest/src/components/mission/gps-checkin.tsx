"use client";
import { useState } from "react";
import { LocateFixed, Navigation } from "lucide-react";
import { Button, Alert } from "@/components/ui";
import { formatDistance, haversineMeters } from "@/lib/utils";

export type Geo = { lat: number; lng: number; accuracyM: number };
export function getPosition(): Promise<Geo> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Geolocation is not supported in this browser."));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracyM: p.coords.accuracy }),
      (e) => reject(new Error(e.code === 1 ? "Location permission denied. Enable location for this site in your browser settings." : e.code === 2 ? "Location unavailable. Move outdoors and try again." : "Location request timed out. Try again.")),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
    );
  });
}

export function GpsCheckin({ target, radiusM, onCheckin, busy }: { target: { lat: number; lng: number; name: string }; radiusM: number; onCheckin: (geo: Geo) => void; busy?: boolean }) {
  const [geo, setGeo] = useState<Geo | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const dist = geo ? haversineMeters(geo.lat, geo.lng, target.lat, target.lng) : null;
  async function locate() {
    setErr(null);
    try { const g = await getPosition(); setGeo(g); onCheckin(g); } catch (e) { setErr((e as Error).message); }
  }
  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-teal-50 p-4 text-center">
        <div className="relative mx-auto size-20 rounded-full bg-teal-800 text-white flex items-center justify-center pulse-ring"><LocateFixed className="size-8" /></div>
        <div className="mt-3 text-sm font-bold text-ink">Check in within {radiusM} m of {target.name}</div>
        {dist != null && <div className={`text-xs font-bold mt-1 ${dist <= radiusM ? "text-emerald-700" : "text-rose-700"}`}>You are {formatDistance(dist)} away · accuracy ±{Math.round(geo!.accuracyM)} m</div>}
        <p className="text-[11px] text-ink-soft mt-1">We only use your location to verify this check-in. It is validated on our servers.</p>
      </div>
      {err && <Alert tone="error">{err}</Alert>}
      <div className="flex gap-2">
        <Button onClick={locate} loading={busy} full><LocateFixed className="size-4" />Check in now</Button>
        <a className="btn btn-ghost" href={`https://www.google.com/maps/dir/?api=1&destination=${target.lat},${target.lng}`} target="_blank" rel="noreferrer" aria-label="Navigate"><Navigation className="size-4" /></a>
      </div>
    </div>
  );
}
