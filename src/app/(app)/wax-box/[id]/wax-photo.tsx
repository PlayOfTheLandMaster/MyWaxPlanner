"use client";

import { useRef, useState, useTransition } from "react";
import { discardWaxPhoto, uploadWaxPhoto } from "@/lib/wax-box/photo-upload";
import { setWaxPhoto } from "../actions";

/**
 * A photo of the wax's container. Taken with the camera or picked from the
 * library; it saves as soon as it is picked (no Save button), and the card
 * says so. setWaxPhoto records it on the box row and removes the photo it
 * replaces.
 */
export function WaxPhoto({ boxId, userId, url, name }: { boxId: string; userId: string; url: string | null; name: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function upload(file: File | undefined) {
    if (!file) return;
    setError(null);
    setDone(null);
    setBusy(true);
    const up = await uploadWaxPhoto(file, userId, boxId);
    if ("error" in up) {
      setError(up.error);
    } else {
      const message = await setWaxPhoto(boxId, up.path);
      if (message) {
        await discardWaxPhoto(up.path);
        setError(message);
      } else setDone("Photo saved.");
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
          <input ref={input} type="file" accept="image/*" disabled={busy} onChange={(e) => upload(e.target.files?.[0])} className="sr-only" />
        </label>
        {url && (
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              startTransition(async () => {
                setDone(null);
                const message = await setWaxPhoto(boxId, null);
                if (message) setError(message);
                else setDone("Photo removed.");
              })
            }
            className="min-h-11 rounded-lg border border-line px-4 text-sm text-danger active:bg-tile"
          >
            Remove photo
          </button>
        )}
      </div>
      {!url && !done && (
        <p className="text-sm text-muted">Take one of the container, so you can spot it in the box. It shows beside the wax on the list.</p>
      )}
      {done && (
        <p role="status" className="text-sm">
          {done}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </section>
  );
}
