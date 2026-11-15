"use client";

import { startTransition, useActionState, useState } from "react";
import { BackLink } from "@/components/nav-trail";
import type { VideoFormState } from "./actions";
import { LEVELS, LEVEL_LABELS, TOPICS, TOPIC_LABELS, formatTime, parseYouTube, thumbnailUrl, type Video } from "@/lib/learn/videos";

const field = "min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-base";
const label = "flex flex-col gap-1 text-sm font-medium";
const choice =
  "flex min-h-11 items-center justify-center rounded-lg border border-line bg-surface px-2 text-sm has-[:checked]:border-accent has-[:checked]:bg-tile has-[:checked]:font-semibold";

export function VideoForm({
  save,
  initial,
  submitLabel,
  cancelHref,
}: {
  save: (prev: VideoFormState, data: FormData) => Promise<VideoFormState>;
  initial?: Video;
  submitLabel: string;
  cancelHref: string;
}) {
  const [state, action, pending] = useActionState<VideoFormState, FormData>(save, {});
  const [url, setUrl] = useState(initial ? `https://youtu.be/${initial.youtube_id}` : "");
  const link = parseYouTube(url);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
      className="flex flex-col gap-4"
    >
      <label className={label}>
        YouTube link
        <input
          name="url"
          required
          inputMode="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste from YouTube: Share → Copy link"
          className={field}
        />
      </label>
      {link && (
        // eslint-disable-next-line @next/next/no-img-element -- YouTube's own thumbnail
        <img src={thumbnailUrl(link.id)} alt="" className="-mt-2 aspect-video w-32 rounded-md object-cover" />
      )}
      {url && !link && <p className="-mt-2 text-sm text-danger">Not a YouTube link yet.</p>}
      <label className={label}>
        Title (optional — taken from YouTube)
        <input name="title" defaultValue={initial?.title} className={field} />
      </label>
      <input type="hidden" name="channel" value={initial?.channel ?? ""} />
      <label className={label}>
        Topic
        <select name="topic" required defaultValue={initial?.topic ?? ""} className={field}>
          <option value="" disabled>
            Choose…
          </option>
          {TOPICS.map((t) => (
            <option key={t} value={t}>
              {TOPIC_LABELS[t]}
            </option>
          ))}
        </select>
      </label>
      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 text-sm font-medium">Technique</legend>
        <div className="grid grid-cols-3 gap-2">
          {[
            ["", "Both"],
            ["classic", "Classic"],
            ["skate", "Skate"],
          ].map(([v, l]) => (
            <label key={v} className={choice}>
              <input type="radio" name="technique" value={v} defaultChecked={(initial?.technique ?? "") === v} className="sr-only" />
              {l}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 text-sm font-medium">Level</legend>
        <div className="grid grid-cols-3 gap-2">
          {LEVELS.map((l) => (
            <label key={l} className={choice}>
              <input type="radio" name="level" value={l} defaultChecked={initial?.level === l} className="sr-only" />
              {LEVEL_LABELS[l]}
            </label>
          ))}
        </div>
      </fieldset>
      <label className={label}>
        Start at (optional)
        <input
          name="start"
          inputMode="numeric"
          defaultValue={initial?.start_seconds ? formatTime(initial.start_seconds) : ""}
          placeholder={link?.start ? `${formatTime(link.start)} (from the link)` : "e.g. 1:45 to skip the intro"}
          className={field}
        />
      </label>
      <label className={label}>
        Your notes
        <textarea
          name="notes"
          rows={4}
          defaultValue={initial?.notes ?? ""}
          placeholder="What it's good for, what to skip, anything out of date (e.g. fluoro products)"
          className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-base"
        />
      </label>
      <label className={label}>
        Tags (optional, separated by commas)
        <input name="tags" defaultValue={initial?.tags.join(", ")} placeholder="e.g. klister, wet snow, swix" className={field} />
      </label>
      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <BackLink fallback={cancelHref} className="flex min-h-11 items-center justify-center rounded-lg border border-line px-4 font-semibold active:bg-tile">
          Cancel
        </BackLink>
        <button type="submit" disabled={pending} className="min-h-11 rounded-lg bg-accent px-4 font-semibold text-on-accent active:opacity-70 disabled:opacity-50">
          {pending ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
