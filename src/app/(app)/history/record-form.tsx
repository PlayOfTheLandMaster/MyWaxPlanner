"use client";

import { useRef, useState } from "react";
import type { ForecastWindow } from "@/lib/weather/forecast";
import type { FormOptions } from "@/lib/history/load";
import { ForecastCard } from "@/components/forecast-card";
import { fold, foldHead } from "@/components/fold";
import { SKY_ICONS, SKY_LABELS } from "@/lib/history/vocab";
import { SessionForm, type SessionInitial } from "./session-form";
import { recordForecast, type SessionFormState } from "./actions";

type Card = { window: ForecastWindow | null; error: string | null; loading: boolean };

/**
 * Record a wax job: the "Forecast at time of session" card above the form,
 * following the date, time and venue as they are changed. The forecast saved
 * with the session is worked out again on the server when it is saved.
 */
export function RecordForm({
  options,
  save,
  initial,
  window: first,
  error: firstError,
  skiOwner,
  draftName,
}: {
  options: FormOptions;
  save: (prev: SessionFormState, data: FormData) => Promise<SessionFormState>;
  initial?: SessionInitial;
  window: ForecastWindow | null;
  error: string | null;
  /** Whose skis the form lists, for Add a pair of skis…. */
  skiOwner: string | null;
  /** Where the unsaved draft is kept (lib/history/draft.ts). */
  draftName: string;
}) {
  const [card, setCard] = useState<Card>({ window: first, error: firstError, loading: false });
  const asked = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const follow = (venueId: string, at: string | null) => {
    if (timer.current) clearTimeout(timer.current);
    const n = ++asked.current;
    if (!venueId || venueId === "new" || !at) {
      setCard({ window: null, error: null, loading: false });
      return;
    }
    setCard((c) => ({ ...c, loading: true }));
    // A pause first: turning the wheels of a date box changes it many times.
    timer.current = setTimeout(async () => {
      let r: Awaited<ReturnType<typeof recordForecast>>;
      try {
        r = await recordForecast(venueId, at);
      } catch {
        r = { error: "The forecast could not be loaded." };
      }
      // Only the latest question's answer is shown.
      if (n === asked.current) setCard({ window: r.window ?? null, error: r.window ? null : r.error, loading: false });
    }, 500);
  };

  const w = card.window;
  return (
    <>
      {w ? (
        // Folded to one line: the sky and air temperature; opens on the forecast saved with the session.
        <details className={`${fold} ${card.loading ? "opacity-60" : ""}`}>
          <summary className={foldHead}>
            <span aria-hidden className="text-2xl leading-none">
              {SKY_ICONS[w.sky]}
            </span>
            <span className="min-w-0">
              <span className="block truncate font-semibold">Forecast at time of session</span>
              <span className="block truncate text-sm text-muted">
                {card.loading
                  ? "Updating…"
                  : `${`${w.air_temp_c > 0 ? "+" : ""}${w.air_temp_c}`.replace("-", "−")} °C · ${SKY_LABELS[w.sky]} · ${w.venue.name}`}
              </span>
            </span>
          </summary>
          <ForecastCard w={w} compact bare />
          <p className="px-4 pb-4 text-xs text-muted">Saved with the session. Record what the snow was really like when you rate it.</p>
        </details>
      ) : card.loading ? (
        <p className={`${fold} flex min-h-16 items-center px-4 text-sm text-muted`}>Loading the forecast…</p>
      ) : card.error ? (
        <p className={`${fold} flex min-h-16 flex-col justify-center px-4 text-sm`}>
          {/* summarise()'s words when the moment is outside the hours fetched. */}
          {card.error.includes("outside the forecast") ? (
            <>
              <span className="font-semibold">No forecast for that date</span>
              <span className="text-muted">The weather service covers about three months back to six days ahead. No forecast is saved.</span>
            </>
          ) : (
            <span className="text-muted">No forecast to save: {card.error}</span>
          )}
        </p>
      ) : null}

      <SessionForm
        options={options}
        save={save}
        initial={initial}
        submitLabel="Save"
        cancelHref="/"
        hidden={{ record: "1" }}
        onWhereWhen={follow}
        skiOwner={skiOwner}
        draftName={draftName}
      />
    </>
  );
}
