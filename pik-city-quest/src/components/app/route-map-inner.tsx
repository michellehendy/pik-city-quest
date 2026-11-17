"use client";
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { RouteStop } from "./route-map";

const colorFor = (s?: string, end?: boolean) => end ? "#ff6b5b" : s === "COMPLETED" ? "#10b981" : s === "LOCKED" ? "#94a3b8" : s === "SUBMITTED" ? "#f8b818" : "#087088";

export default function RouteMapInner({ stops, height = 240, className }: { stops: RouteStop[]; height?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current || !stops.length) return;
    const map = L.map(ref.current, { zoomControl: false, attributionControl: true, scrollWheelZoom: false, dragging: true });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>', maxZoom: 19 }).addTo(map);
    const latlngs = stops.map((s) => [s.lat, s.lng] as [number, number]);
    L.polyline(latlngs, { color: "#087088", weight: 4, opacity: 0.85, dashArray: "8 8" }).addTo(map);
    stops.forEach((s) => {
      const icon = L.divIcon({ className: "", html: `<div class="marker-dot" style="background:${colorFor(s.status, s.isEnd)}">${s.isEnd ? "🏁" : s.status === "COMPLETED" ? "✓" : s.order + 1}</div>`, iconSize: [34, 34], iconAnchor: [17, 17] });
      L.marker([s.lat, s.lng], { icon }).addTo(map).bindPopup(`<b>${s.name}</b><br/><a href="https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}" target="_blank" rel="noreferrer">Directions ↗</a>`);
    });
    map.fitBounds(L.latLngBounds(latlngs).pad(0.25));
    return () => { map.remove(); };
  }, [stops]);
  return <div ref={ref} style={{ height }} className={`rounded-2xl overflow-hidden ${className ?? ""}`} />;
}
