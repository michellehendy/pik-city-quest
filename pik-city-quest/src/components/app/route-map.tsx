"use client";
import dynamic from "next/dynamic";
const Inner = dynamic(() => import("./route-map-inner"), { ssr: false, loading: () => <div className="skeleton h-56 rounded-2xl" /> });
export type RouteStop = { lat: number; lng: number; name: string; status?: string; order: number; isEnd?: boolean };
export function RouteMap(props: { stops: RouteStop[]; height?: number; className?: string }) { return <Inner {...props} />; }
