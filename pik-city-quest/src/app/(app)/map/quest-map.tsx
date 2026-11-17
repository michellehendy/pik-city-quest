"use client";
import dynamic from "next/dynamic";
const Inner = dynamic(() => import("./quest-map-inner"), { ssr: false, loading: () => <div className="absolute inset-0 skeleton" /> });
export function QuestMap() { return <Inner />; }
