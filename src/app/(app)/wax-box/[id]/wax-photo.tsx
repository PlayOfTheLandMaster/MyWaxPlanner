"use client";

import { useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { setWaxPhoto } from "../actions";

const TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const LONGEST = 1200;

/**
 * A photo of the wax's container. Taken with the camera or picked from the
 * library, shrunk in the browser to about 1200 px (so the list's thumbnails
 * stay light), uploaded to the owner's own folder in the private wax-photos
 * bucket, then recorded on the box row by setWaxPhoto, which also removes the
 * photo it replaces.
 */
export function WaxPhoto({ boxId, userId, url, name }: { boxId: string; userId: string; url: string | null; name: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function upload(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!TYPES.includes(file.type) && !/\.(heic|heif)$/i.test(file.name)) {
      setError("Only JPEG, PNG, WebP or HEIC photos.");
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const blob = (await shrink(file)) ?? file;
    const jpeg = blob !== file;
    const ext = jpeg ? "jpg" : file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    if (blob.size > 10 * 1024 * 1024) {
      setBusy(false);
      setError("That photo is over 10 MB.");
      return;
    }
    const path = `${userId}/${boxId}/${crypto.randomUUID()}.${ext}`;
    const up = await supabase.storage.from("wax-photos").upload(path, blob, { contentType: jpeg ? "image/jpeg" : file.type || "image/jpeg" });
    if (up.error) {
      setBusy(false);
      setError(`Could not upload the photo: ${up.error.message}`);
      return;
    }
    const message = await setWaxPhoto(boxId, path);
    if (message) {
      await supabase.storage.from("wax-photos").remove([path]);
      setError(message);
    }
    setBusy(false);
    if (input.current) input.current.value = "";
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4" aria-labelledby="wax-photo">
      <h2 id="wax-photo" className="font-semibold">
        Photo
      </h2>
      {url && (
        // eslint-disable-next-line @next/next/no-img-element -- a signed, short-lived URL from a private bucket
        <img src={url} alt={`The ${name} container`} className="max-h-72 w-full rounded-lg bg-tile object-contain" />
      )}
      <div className="grid grid-cols-2 gap-2">
        <label className="flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-line px-4 text-sm active:bg-tile">
          {busy ? "Uploading…" : url ? "Change photo" : "Add a photo"}
          {/* No `capture`: on an iPad that would force the camera, and a photo already in the library is just as good. */}
          <input
            ref={input}
            type="file"
            accept="image/*"
            disabled={busy}
            onChange={(e) => upload(e.target.files?.[0])}
            className="sr-only"
          />
        </label>
        {url && (
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              startTransition(async () => {
                const message = await setWaxPhoto(boxId, null);
                if (message) setError(message);
              })
            }
            className="min-h-11 rounded-lg border border-line px-4 text-sm text-danger active:bg-tile"
          >
            Remove photo
          </button>
        )}
      </div>
      {!url && <p className="text-sm text-muted">Take one of the container, so you can spot it in the box. It shows beside the wax on the list.</p>}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </section>
  );
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
