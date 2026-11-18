// A wax container's photo, from the browser to the private wax-photos bucket:
// shrunk to about 1200 px (so the list's thumbnails stay light), then uploaded
// under the owner's own folder, which the bucket's policies insist on. Used by
// a wax's Photo card and by Add a wax.

import { createClient } from "@/lib/supabase/client";

export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const LONGEST = 1200;

/** Uploads to <userId>/<folder>/<random>.jpg and returns the key, or an error to show. */
export async function uploadWaxPhoto(file: File, userId: string, folder: string): Promise<{ path: string } | { error: string }> {
  if (!PHOTO_TYPES.includes(file.type) && !/\.(heic|heif)$/i.test(file.name)) return { error: "Only JPEG, PNG, WebP or HEIC photos." };
  const small = await shrink(file);
  const blob = small ?? file;
  if (blob.size > 10 * 1024 * 1024) return { error: "That photo is over 10 MB." };
  const ext = small ? "jpg" : file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${userId}/${folder}/${crypto.randomUUID()}.${ext}`;
  const up = await createClient()
    .storage.from("wax-photos")
    .upload(path, blob, { contentType: small ? "image/jpeg" : file.type || "image/jpeg" });
  if (up.error) return { error: `Could not upload the photo: ${up.error.message}` };
  return { path };
}

/** Removes an uploaded photo that ended up unused. */
export async function discardWaxPhoto(path: string) {
  await createClient().storage.from("wax-photos").remove([path]);
}

/** The photo as a JPEG no longer than LONGEST px, or null if the browser cannot read it (then the original goes up). */
async function shrink(file: File): Promise<Blob | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, LONGEST / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return await new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", 0.85));
  } catch {
    return null;
  }
}
