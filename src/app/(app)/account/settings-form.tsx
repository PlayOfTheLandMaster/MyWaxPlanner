"use client";

import { startTransition, useActionState } from "react";
import { saveSettings, type SettingsState } from "./actions";
import { BodyFields } from "@/components/body-fields";
import type { Body } from "@/lib/skiers/body";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const YEAR = new Date().getFullYear();

const field = "min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-base";
const label = "flex flex-col gap-1 text-sm font-medium";
const choice =
  "flex min-h-11 items-center justify-center rounded-lg border border-line bg-surface px-2 text-sm has-[:checked]:border-accent has-[:checked]:bg-tile has-[:checked]:font-semibold";

export function SettingsForm({
  venues,
  home,
  mode,
  firstName,
  lastInitial,
  me,
  years,
  seasonStart,
}: {
  venues: { id: string; name: string }[];
  home: string | null;
  mode: string;
  firstName: string | null;
  lastInitial: string | null;
  me: Body;
  years: number[];
  /** Month 1–12 the season starts in. */
  seasonStart: number;
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
      {/* Shown as "Finn P." wherever the app names you; the initial tells two people with one first name apart. */}
      <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-3">
        <label className={label}>
          First name
          <input name="first_name" defaultValue={firstName ?? ""} autoComplete="given-name" maxLength={40} required className={field} />
        </label>
        <label className={label}>
          Last initial
          <input
            name="last_initial"
            defaultValue={lastInitial ?? ""}
            autoComplete="family-name"
            maxLength={1}
            required
            className={`${field} uppercase`}
          />
        </label>
      </div>
      <BodyFields initial={me} years={years} />
      <label className={label}>
        Home Venue
        <select name="home_venue_id" defaultValue={home ?? ""} className={field}>
          <option value="">None</option>
          {venues.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      </label>
      <label className={label}>
        Ski season starts in
        <select name="season_start_month" defaultValue={String(seasonStart)} className={field}>
          {MONTHS.map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
        <span className="font-normal text-muted">
          A season always runs for 12 months from this month, for example {MONTHS[seasonStart - 1]} {YEAR} to{" "}
          {MONTHS[(seasonStart + 10) % 12]} {seasonStart === 1 ? YEAR : YEAR + 1}. History&apos;s &ldquo;This season&rdquo; uses it.
        </span>
      </label>
      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 text-sm font-medium">Plans start as</legend>
        <div className="grid grid-cols-2 gap-2">
          {[
            ["recreational", "Recreational"],
            ["race", "Race"],
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
