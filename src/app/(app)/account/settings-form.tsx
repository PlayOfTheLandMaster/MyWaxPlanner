"use client";

import { startTransition, useActionState } from "react";
import { saveSettings, type SettingsState } from "./actions";
import { BodyFields } from "@/components/body-fields";
import type { Body } from "@/lib/skiers/body";

const field = "min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-base";
const label = "flex flex-col gap-1 text-sm font-medium";
const choice =
  "flex min-h-11 items-center justify-center rounded-lg border border-line bg-surface px-2 text-sm has-[:checked]:border-accent has-[:checked]:bg-tile has-[:checked]:font-semibold";

export function SettingsForm({
  venues,
  home,
  mode,
  displayName,
  me,
  years,
}: {
  venues: { id: string; name: string }[];
  home: string | null;
  mode: string;
  displayName: string | null;
  me: Body;
  years: number[];
}) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveSettings, {});
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
        Your name (optional)
        <input name="display_name" defaultValue={displayName ?? ""} maxLength={60} className={field} />
      </label>
      <BodyFields initial={me} years={years} />
      <label className={label}>
        Home venue — its forecast is on Today
        <select name="home_venue_id" defaultValue={home ?? ""} className={field}>
          <option value="">None</option>
          {venues.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      </label>
      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 text-sm font-medium">Plans start as</legend>
        <div className="grid grid-cols-2 gap-2">
          {[
            ["recreational", "Recreational"],
            ["race", "Race day"],
          ].map(([v, l]) => (
            <label key={v} className={choice}>
              <input type="radio" name="default_mode" value={v} defaultChecked={mode === v} className="sr-only" />
              {l}
            </label>
          ))}
        </div>
      </fieldset>
      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      {state.saved && (
        <p role="status" className="text-sm text-link">
          Saved.
        </p>
      )}
      <button type="submit" disabled={pending} className="min-h-11 rounded-lg bg-accent px-4 font-semibold text-on-accent active:opacity-70 disabled:opacity-50">
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
