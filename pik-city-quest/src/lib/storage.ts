// Media storage adapter. Local disk for the demo; swap `saveFile` for S3 / GCS in production.
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";

const ROOT = path.resolve(process.cwd(), process.env.UPLOAD_DIR || "./uploads");
export const ALLOWED_IMAGE = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
export const ALLOWED_VIDEO = ["video/mp4", "video/webm", "video/quicktime"];
export const MAX_IMAGE_MB = 10;
export const MAX_VIDEO_MB = 40;

export async function saveFile(buffer: Buffer, mime: string, kind: "photo" | "video" | "avatar" | "story") {
  const ext = mime.split("/")[1]?.replace("quicktime", "mov").replace("jpeg", "jpg") || "bin";
  const day = new Date().toISOString().slice(0, 10);
  const name = `${randomBytes(12).toString("hex")}.${ext}`;
  const dir = path.join(ROOT, kind, day);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), buffer);
  return { url: `/api/media/${kind}/${day}/${name}`, relPath: `${kind}/${day}/${name}` };
}
export function resolveMedia(rel: string[]) {
  const p = path.join(ROOT, ...rel);
  if (!p.startsWith(ROOT)) return null;
  return p;
}
