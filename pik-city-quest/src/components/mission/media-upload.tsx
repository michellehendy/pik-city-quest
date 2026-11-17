"use client";
import { useRef, useState } from "react";
import Image from "next/image";
import { Camera, Upload, RefreshCw } from "lucide-react";
import { Button, Alert } from "@/components/ui";

export function MediaUpload({ kind, prompt, maxSizeMB, onUploaded, busy, geo }: { kind: "photo" | "video"; prompt?: string; maxSizeMB?: number; onUploaded: (url: string) => void; busy?: boolean; geo?: { lat: number; lng: number } | null }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const limit = maxSizeMB ?? (kind === "video" ? 40 : 10);

  function pick(f: File | undefined) {
    if (!f) return;
    setErr(null);
    if (f.size > limit * 1024 * 1024) { setErr(`File is too large (max ${limit} MB).`); return; }
    setFile(f); setPreview(URL.createObjectURL(f));
  }
  async function upload() {
    if (!file) return;
    setUploading(true); setErr(null);
    try {
      const fd = new FormData(); fd.append("file", file); fd.append("kind", kind);
      if (geo) { fd.append("lat", String(geo.lat)); fd.append("lng", String(geo.lng)); }
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      onUploaded(data.url);
    } catch (e) { setErr((e as Error).message); } finally { setUploading(false); }
  }
  return (
    <div className="space-y-3">
      {prompt && <div className="rounded-2xl bg-sun-100 text-sun-600 text-sm font-bold px-4 py-3">📸 {prompt}</div>}
      <div className="relative rounded-2xl overflow-hidden bg-slate-100 aspect-[4/3] flex items-center justify-center">
        {preview ? (kind === "video" ? <video src={preview} controls className="w-full h-full object-contain bg-black" /> : <Image src={preview} alt="Preview" fill className="object-cover" unoptimized />) : (
          <div className="text-center text-ink-soft p-6"><Camera className="mx-auto size-10 mb-2" /><div className="text-sm font-semibold">Take a {kind} or choose one from your gallery</div><div className="text-[11px] mt-1">JPG, PNG, WEBP{kind === "video" ? ", MP4, MOV" : ""} · max {limit} MB · timestamp recorded on upload</div></div>
        )}
      </div>
      <input ref={camRef} type="file" accept={kind === "video" ? "video/*" : "image/*"} capture="environment" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      <input ref={fileRef} type="file" accept={kind === "video" ? "video/*" : "image/*"} className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      {err && <Alert tone="error">{err}</Alert>}
      {!file ? (
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={() => camRef.current?.click()}><Camera className="size-4" />{kind === "video" ? "Record" : "Take photo"}</Button>
          <Button variant="ghost" onClick={() => fileRef.current?.click()}><Upload className="size-4" />Upload</Button>
        </div>
      ) : (
        <div className="grid grid-cols-[auto_1fr] gap-2">
          <Button variant="ghost" onClick={() => { setFile(null); setPreview(null); }}><RefreshCw className="size-4" />Retake</Button>
          <Button onClick={upload} loading={uploading || busy}>Submit for review</Button>
        </div>
      )}
    </div>
  );
}
