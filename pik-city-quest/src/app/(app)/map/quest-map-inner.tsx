"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Bus, Layers, LocateFixed, Navigation, Sparkles, ExternalLink, Play, X, Clock, MapPin } from "lucide-react";
import { getJson } from "@/components/ui/fetcher";
import { Pill, Spinner } from "@/components/ui";
import { cn, formatDistance, haversineMeters } from "@/lib/utils";

type Dest = { id: string; slug: string; name: string; description: string; category: string; tags: string[]; area: string; areaName: string; lat: number; lng: number; image: string | null; address: string | null; openingHours: string | null; websiteUrl: string | null; quests: Array<{ slug: string; name: string }>; missionCount: number; xp: number; questStatus: string | null; standaloneMissions: Array<{ id: string; name: string; xp: number; type: string }> };
type Data = { areas: Array<{ slug: string; name: string; color: string; lat: number; lng: number; zoom: number }>; destinations: Dest[]; routes: Array<{ id: string; operator: string; code: string; name: string; category: string; color: string; notes: string | null; polyline: number[][]; stops: Array<{ name: string; lat: number; lng: number }> }>; facilities: Array<{ id: string; name: string; type: string; lat: number; lng: number; address: string | null; openingHours: string | null }>; activeQuest: { slug: string; name: string; stops: Array<{ lat: number; lng: number; order: number; isStart: boolean; isEnd: boolean; name: string; status: string; checkpointId: string; missionId: string | null }> } | null };

const CAT_ICON: Record<string, string> = { "Main Destinations": "⭐", Culinary: "🍜", "Night Life": "🎶", "Beach & Water": "🏖️", Activities: "🎡", Shopping: "🛍️", "Photo Spot": "📸", Spiritual: "🛕", "Green Tourism": "🌿", Sport: "⛳", "Paw Proved": "🐾" };
const CAT_COLOR: Record<string, string> = { "Main Destinations": "#087088", Culinary: "#e11d48", "Night Life": "#7c3aed", "Beach & Water": "#0284c7", Activities: "#f59e0b", Shopping: "#db2777", "Photo Spot": "#f97316", Spiritual: "#b45309", "Green Tourism": "#16a34a", Sport: "#0f766e", "Paw Proved": "#d97706" };
const statusColor = (s: string | null) => s === "COMPLETED" ? "#10b981" : s === "LOCKED" ? "#94a3b8" : s === "SUBMITTED" ? "#f8b818" : s ? "#ff6b5b" : null;

export default function QuestMapInner() {
  const params = useSearchParams();
  const mapRef = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layers = useRef<{ dest: L.LayerGroup; routes: L.LayerGroup; fac: L.LayerGroup; quest: L.LayerGroup; me: L.LayerGroup } | null>(null);
  const [data, setData] = useState<Data | null>(null);
  const [area, setArea] = useState<string>("all");
  const [showRoutes, setShowRoutes] = useState(false);
  const [showFac, setShowFac] = useState(false);
  const [sel, setSel] = useState<Dest | null>(null);
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);
  const [geoErr, setGeoErr] = useState<string | null>(null);
  const [cat, setCat] = useState<string>("all");

  useEffect(() => { getJson<Data>("/api/map").then(setData).catch(console.error); }, []);

  // init map
  useEffect(() => {
    if (!mapRef.current || map.current) return;
    const m = L.map(mapRef.current, { zoomControl: false, attributionControl: true }).setView([-6.078, 106.722], 13);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>', maxZoom: 19 }).addTo(m);
    L.control.zoom({ position: "bottomright" }).addTo(m);
    layers.current = { dest: L.layerGroup().addTo(m), routes: L.layerGroup(), fac: L.layerGroup(), quest: L.layerGroup().addTo(m), me: L.layerGroup().addTo(m) };
    map.current = m;
    return () => { m.remove(); map.current = null; };
  }, []);

  const visible = useMemo(() => data?.destinations.filter((d) => (area === "all" || d.area === area) && (cat === "all" || d.category === cat || (cat === "quest" && d.quests.length > 0))) ?? [], [data, area, cat]);

  // destination markers
  useEffect(() => {
    const L_ = layers.current; const m = map.current; if (!L_ || !m || !data) return;
    L_.dest.clearLayers();
    for (const d of visible) {
      const sc = statusColor(d.questStatus);
      const color = sc ?? CAT_COLOR[d.category] ?? "#087088";
      const icon = L.divIcon({ className: "", html: `<div class="marker-dot" style="background:${color}">${d.questStatus === "COMPLETED" ? "✓" : d.questStatus === "LOCKED" ? "🔒" : CAT_ICON[d.category] ?? "📍"}</div>`, iconSize: [34, 34], iconAnchor: [17, 17] });
      L.marker([d.lat, d.lng], { icon, title: d.name }).on("click", () => setSel(d)).addTo(L_.dest);
    }
  }, [visible, data]);

  // active quest route
  useEffect(() => {
    const L_ = layers.current; if (!L_ || !data) return;
    L_.quest.clearLayers();
    if (data.activeQuest && data.activeQuest.stops.length > 1) {
      L.polyline(data.activeQuest.stops.map((s) => [s.lat, s.lng] as [number, number]), { color: "#087088", weight: 5, opacity: 0.8, dashArray: "10 10" }).addTo(L_.quest);
      for (const s of data.activeQuest.stops) {
        if (!s.isStart && !s.isEnd) continue;
        const icon = L.divIcon({ className: "", html: `<div style="transform:translateY(-26px);background:${s.isEnd ? "#ff6b5b" : "#f8b818"};color:#0f2a33;font-weight:900;font-size:10px;padding:3px 8px;border-radius:999px;border:2px solid white;box-shadow:0 4px 10px rgba(0,0,0,.3)">${s.isEnd ? "FINISH" : "START"}</div>`, iconSize: [0, 0] });
        L.marker([s.lat, s.lng], { icon, interactive: false }).addTo(L_.quest);
      }
    }
  }, [data]);

  // transport + facilities toggles
  useEffect(() => {
    const L_ = layers.current; const m = map.current; if (!L_ || !m || !data) return;
    L_.routes.clearLayers();
    if (showRoutes) {
      for (const r of data.routes) {
        if (r.polyline.length > 1) L.polyline(r.polyline.map((p) => [p[0], p[1]] as [number, number]), { color: r.color, weight: 3, opacity: 0.75 }).bindPopup(`<b>${r.operator} ${r.code}</b><br/>${r.name}<br/><small>${r.notes ?? ""}</small>`).addTo(L_.routes);
        for (const s of r.stops) L.marker([s.lat, s.lng], { icon: L.divIcon({ className: "", html: `<div class="marker-stop" style="border-color:${r.color}"></div>`, iconSize: [12, 12], iconAnchor: [6, 6] }) }).bindPopup(`<b>${s.name}</b><br/>${r.operator} ${r.code} · ${r.name}`).addTo(L_.routes);
      }
      L_.routes.addTo(m);
    } else m.removeLayer(L_.routes);
    L_.fac.clearLayers();
    if (showFac) {
      for (const f of data.facilities) L.marker([f.lat, f.lng], { icon: L.divIcon({ className: "", html: `<div class="marker-dot" style="background:#475569;width:26px;height:26px;font-size:12px">${f.type === "Charging Station" ? "🔌" : f.type === "Hospital" ? "🏥" : f.type === "Clinic" ? "⚕️" : f.type === "Money Changer" ? "💱" : "🕌"}</div>`, iconSize: [26, 26], iconAnchor: [13, 13] }) }).bindPopup(`<b>${f.name}</b><br/>${f.type}<br/><small>${f.openingHours ?? ""}</small>`).addTo(L_.fac);
      L_.fac.addTo(m);
    } else m.removeLayer(L_.fac);
  }, [showRoutes, showFac, data]);

  // area switch
  useEffect(() => {
    const m = map.current; if (!m || !data) return;
    if (area === "all") m.flyToBounds(L.latLngBounds(data.destinations.map((d) => [d.lat, d.lng] as [number, number])).pad(0.05), { duration: 0.8 });
    else { const a = data.areas.find((x) => x.slug === area); if (a) m.flyTo([a.lat, a.lng], a.zoom, { duration: 0.8 }); }
  }, [area, data]);

  // focus param
  useEffect(() => {
    const m = map.current; const f = params.get("focus"); if (!m || !data || !f) return;
    const d = data.destinations.find((x) => x.slug === f); if (d) { m.flyTo([d.lat, d.lng], 17, { duration: 0.9 }); setSel(d); }
  }, [params, data]);

  function locate() {
    setGeoErr(null);
    if (!navigator.geolocation) return setGeoErr("Geolocation not supported — explore manually.");
    navigator.geolocation.getCurrentPosition((p) => {
      const pos = { lat: p.coords.latitude, lng: p.coords.longitude }; setMe(pos);
      const L_ = layers.current; const m = map.current; if (!L_ || !m) return;
      L_.me.clearLayers();
      L.circle([pos.lat, pos.lng], { radius: p.coords.accuracy, color: "#2563eb", weight: 1, fillOpacity: 0.08 }).addTo(L_.me);
      L.marker([pos.lat, pos.lng], { icon: L.divIcon({ className: "", html: `<div class="marker-user"></div>`, iconSize: [18, 18], iconAnchor: [9, 9] }), interactive: false }).addTo(L_.me);
      m.flyTo([pos.lat, pos.lng], 16, { duration: 0.8 });
    }, () => setGeoErr("Location permission denied — you can still explore the map manually."), { enableHighAccuracy: true, timeout: 10000 });
  }

  const cats = useMemo(() => Array.from(new Set(data?.destinations.map((d) => d.category) ?? [])), [data]);
  const activeCp = sel && data?.activeQuest?.stops.find((s) => s.name === sel.name);

  return (
    <div className="absolute inset-0">
      <div ref={mapRef} className="absolute inset-0" />
      {!data && <div className="absolute inset-0 flex items-center justify-center bg-white/60"><Spinner /></div>}
      {/* top controls */}
      <div className="absolute top-3 left-0 right-0 z-[500] px-3 space-y-2 pointer-events-none">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pointer-events-auto">
          {[{ slug: "all", name: "All PIK" }, ...(data?.areas ?? [])].map((a) => <button key={a.slug} onClick={() => setArea(a.slug)} className={cn("shrink-0 rounded-full px-3.5 py-2 text-xs font-bold shadow-card border", area === a.slug ? "bg-teal-800 text-white border-teal-800" : "bg-white text-ink border-white")}>{a.name}</button>)}
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pointer-events-auto">
          {[{ k: "all", l: "All places" }, { k: "quest", l: "🎯 Quest stops" }, ...cats.map((c) => ({ k: c, l: `${CAT_ICON[c] ?? ""} ${c}` }))].map((c) => <button key={c.k} onClick={() => setCat(c.k)} className={cn("shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold shadow-card border", cat === c.k ? "bg-sun-500 text-ink border-sun-500" : "bg-white/95 text-ink-soft border-white")}>{c.l}</button>)}
        </div>
      </div>
      {/* right controls */}
      <div className="absolute right-3 top-28 z-[500] flex flex-col gap-2">
        <button onClick={locate} className="size-11 rounded-full bg-white shadow-card flex items-center justify-center" aria-label="My location"><LocateFixed className={cn("size-5", me ? "text-blue-600" : "text-ink")} /></button>
        <button onClick={() => setShowRoutes((s) => !s)} className={cn("size-11 rounded-full shadow-card flex items-center justify-center", showRoutes ? "bg-teal-800 text-white" : "bg-white text-ink")} aria-label="Transport routes"><Bus className="size-5" /></button>
        <button onClick={() => setShowFac((s) => !s)} className={cn("size-11 rounded-full shadow-card flex items-center justify-center", showFac ? "bg-teal-800 text-white" : "bg-white text-ink")} aria-label="Facilities"><Layers className="size-5" /></button>
      </div>
      {geoErr && <div className="absolute left-3 right-16 bottom-3 z-[500] rounded-xl bg-ink text-white text-xs font-semibold px-3 py-2">{geoErr}</div>}
      {showRoutes && data && (
        <div className="absolute left-3 bottom-3 z-[500] max-w-[70%] rounded-2xl bg-white/95 shadow-card p-3 text-[11px] space-y-1 max-h-40 overflow-y-auto">
          <div className="font-black text-ink mb-1">Transport (piktourism.com)</div>
          {data.routes.map((r) => <div key={r.id} className="flex items-center gap-2"><span className="size-3 rounded-full" style={{ background: r.color }} /><b>{r.operator} {r.code}</b><span className="text-ink-soft truncate">{r.name}</span></div>)}
          <div className="text-ink-soft pt-1">Stop positions are sample data — editable in admin.</div>
        </div>
      )}
      {/* destination card */}
      {sel && (
        <div className="absolute inset-x-0 bottom-0 z-[600] p-3 lg:left-auto lg:w-[420px]">
          <div className="card overflow-hidden animate-pop">
            <div className="relative h-32">{sel.image && <Image src={sel.image} alt={sel.name} fill sizes="420px" className="object-cover" />}<div className="absolute inset-0 bg-gradient-to-t from-ink/80 to-transparent" /><button onClick={() => setSel(null)} className="absolute top-2 right-2 size-8 rounded-full bg-white/90 flex items-center justify-center" aria-label="Close"><X className="size-4" /></button><div className="absolute bottom-2 left-3 right-3 text-white"><div className="font-black leading-tight">{sel.name}</div><div className="text-[11px] text-white/85">{sel.areaName} · {sel.category}{me ? ` · ${formatDistance(haversineMeters(me.lat, me.lng, sel.lat, sel.lng))} away` : ""}</div></div></div>
            <div className="p-3 space-y-2">
              <p className="text-xs text-ink-soft line-clamp-2">{sel.description}</p>
              {sel.address && <div className="text-[11px] text-ink-soft flex gap-1"><MapPin className="size-3 shrink-0 mt-0.5" /><span className="line-clamp-1">{sel.address}</span></div>}
              {sel.openingHours && <div className="text-[11px] text-ink-soft flex gap-1"><Clock className="size-3 shrink-0 mt-0.5" /><span className="line-clamp-1">{sel.openingHours}</span></div>}
              <div className="flex flex-wrap gap-1">{sel.questStatus && <Pill tone={sel.questStatus === "COMPLETED" ? "green" : sel.questStatus === "LOCKED" ? "gray" : "sun"}>{sel.questStatus}</Pill>}<Pill tone="teal">{sel.missionCount} missions · {sel.xp} XP</Pill>{sel.quests.slice(0, 2).map((q) => <Pill key={q.slug} tone="gray">{q.name}</Pill>)}</div>
              <div className="grid grid-cols-2 gap-2">
                {activeCp && activeCp.missionId && activeCp.status !== "LOCKED" && activeCp.status !== "COMPLETED" ? <Link href={`/quests/${data!.activeQuest!.slug}/mission/${activeCp.checkpointId}/${activeCp.missionId}`} className="btn btn-sun min-h-10 text-xs"><Play className="size-4" />Start mission</Link>
                  : sel.standaloneMissions[0] ? <Link href={`/missions/${sel.standaloneMissions[0].id}`} className="btn btn-sun min-h-10 text-xs"><Play className="size-4" />Start mission</Link>
                  : sel.quests[0] ? <Link href={`/quests/${sel.quests[0].slug}`} className="btn btn-sun min-h-10 text-xs"><Play className="size-4" />View quest</Link> : <Link href={`/destinations/${sel.slug}`} className="btn btn-sun min-h-10 text-xs">Details</Link>}
                <a className="btn btn-primary min-h-10 text-xs" href={`https://www.google.com/maps/dir/?api=1&destination=${sel.lat},${sel.lng}`} target="_blank" rel="noreferrer"><Navigation className="size-4" />How to get there</a>
                <Link href="/taupik" className="btn btn-ghost min-h-10 text-xs"><Sparkles className="size-4" />Ask TauPIK</Link>
                {sel.websiteUrl ? <a className="btn btn-ghost min-h-10 text-xs" href={sel.websiteUrl} target="_blank" rel="noreferrer"><ExternalLink className="size-4" />Visit destination</a> : <Link href={`/destinations/${sel.slug}`} className="btn btn-ghost min-h-10 text-xs">Details</Link>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
