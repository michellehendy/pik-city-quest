import { api, ok } from "@/lib/api";
import { HttpError, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ALLOWED_IMAGE, ALLOWED_VIDEO, MAX_IMAGE_MB, MAX_VIDEO_MB, saveFile } from "@/lib/storage";

export const POST = api(async (req) => {
  const user = await requireUser();
  const form = await req.formData();
  const file = form.get("file");
  const kind = (form.get("kind") as string) || "photo";
  if (!(file instanceof File)) throw new HttpError(400, "No file uploaded.");
  const isVideo = ALLOWED_VIDEO.includes(file.type);
  const isImage = ALLOWED_IMAGE.includes(file.type);
  if (!isVideo && !isImage) throw new HttpError(400, "Unsupported file type. Use JPG, PNG, WEBP, MP4 or MOV.");
  const maxMb = isVideo ? MAX_VIDEO_MB : MAX_IMAGE_MB;
  if (file.size > maxMb * 1024 * 1024) throw new HttpError(400, `File is too large. Max ${maxMb} MB.`);
  const buf = Buffer.from(await file.arrayBuffer());
  const saved = await saveFile(buf, file.type, isVideo ? "video" : kind === "avatar" ? "avatar" : kind === "story" ? "story" : "photo");
  const lat = form.get("lat") ? Number(form.get("lat")) : null;
  const lng = form.get("lng") ? Number(form.get("lng")) : null;
  const upload = await prisma.mediaUpload.create({ data: { userId: user.id, path: saved.relPath, mime: file.type, size: file.size, kind: isVideo ? "VIDEO" : kind === "avatar" ? "AVATAR" : kind === "story" ? "STORY" : "PHOTO", lat, lng } });
  if (kind === "avatar") await prisma.user.update({ where: { id: user.id }, data: { avatarUrl: saved.url } });
  return ok({ url: saved.url, id: upload.id, mime: file.type, size: file.size });
});
