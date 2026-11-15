"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { deletePhoto } from "../actions";

export type ShownPhoto = { id: string; url: string | null; caption: string | null };

const TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

// Photos go straight from the phone to the private session-photos bucket,
// under the skier's own folder (the bucket's policies insist on it), and a
// row in wax_session_photos records each one.
export function Photos({ sessionId, userId, photos }: { sessionId: string; userId: string; photos: ShownPhoto[] }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    for (const file of Array.from(files)) {
      if (!TYPES.includes(file.type)) {
        setError(`${file.name}: only JPEG, PNG, WebP or HEIC photos.`);
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError(`${file.name} is over 10 MB.`);
        continue;
      }
      const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `${userId}/${sessionId}/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from("session-photos").upload(path, file, { contentType: file.type });
      if (up.error) {
        setError(`Could not upload ${file.name}: ${up.error.message}`);
        continue;
      }
      const row = await supabase
        .from("wax_session_photos")
        .insert({ user_id: userId, session_id: sessionId, storage_path: path });
      if (row.error) {
        await supabase.storage.from("session-photos").remove([path]);
        setError(`Could not save ${file.name}: ${row.error.message}`);
      }
    }
    setBusy(false);
    if (input.current) input.current.value = "";
    startTransition(() => router.refresh());
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4" aria-labelledby="photos">
      <h2 id="photos" className="font-semibold">
        Photos
      </h2>
      {photos.length > 0 && (
        <ul className="grid grid-cols-2 gap-2">
          {photos.map((p) => (
            <li key={p.id} className="flex flex-col gap-1">
              {p.url ? (
                // eslint-disable-next-line @next/next/no-img-element -- signed, short-lived URLs from a private bucket
                <img src={p.url} alt={p.caption ?? "Session photo"} className="aspect-square w-full rounded-lg object-cover" />
              ) : (
                <div className="flex aspect-square items-center justify-center rounded-lg bg-tile text-sm text-muted">Unavailable</div>
              )}
              <button
                type="button"
                onClick={() => startTransition(() => deletePhoto(sessionId, p.id))}
                className="min-h-11 rounded-lg border border-line text-sm text-danger"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <label className="flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-line px-4 text-sm active:bg-tile">
        {busy ? "Uploading…" : "Add photos"}
        <input
          ref={input}
          type="file"
          accept={TYPES.join(",")}
          multiple
          disabled={busy}
          onChange={(e) => upload(e.target.files)}
          className="sr-only"
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </section>
  );
}
