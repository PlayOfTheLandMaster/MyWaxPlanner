"use client";

import { useRef, useState } from "react";
import { uploadWaxPhoto } from "@/lib/wax-box/photo-upload";

/**
 * Add a wax's optional photo. It uploads when picked (to the owner's "new"
 * folder) and is shown here, but it belongs to the wax only once the form's
 * own button saves it: the key rides along as a hidden field.
 */
export function AddPhoto({ userId }: { userId: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [path, setPath] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(file: File | undefined) {
    if (!file) return;
    setError(null);
    setBusy(true);
    const up = await uploadWaxPhoto(file, userId, "new");
    if ("error" in up) {
      setError(up.error);
    } else {
      setPath(up.path);
      if (preview) URL.revokeObjectURL(preview);
      setPreview(URL.createObjectURL(file));
    }
    setBusy(false);
    if (input.current) input.current.value = "";
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">Photo of the container (optional)</p>
      <input type="hidden" name="photo_path" value={path} />
      {preview && (
        // eslint-disable-next-line @next/next/no-img-element -- the photo just picked, from this device
        <img src={preview} alt="The photo you picked" className="max-h-48 w-full rounded-lg bg-tile object-contain" />
      )}
      <div className="grid grid-cols-2 gap-2">
        <label className="flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-line px-4 text-sm active:bg-tile">
          {busy ? "Uploading…" : preview ? "Change photo" : "Add a photo"}
          <input ref={input} type="file" accept="image/*" disabled={busy} onChange={(e) => pick(e.target.files?.[0])} className="sr-only" />
        </label>
        {preview && (
          <button
            type="button"
            onClick={() => {
              setPath("");
              URL.revokeObjectURL(preview);
              setPreview(null);
            }}
            className="min-h-11 rounded-lg border border-line px-4 text-sm text-danger active:bg-tile"
          >
            Remove photo
          </button>
        )}
      </div>
      {preview && <p className="text-xs text-muted">Saved with the wax when you tap Add to wax box.</p>}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
