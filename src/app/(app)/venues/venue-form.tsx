"use client";

import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import { addVenue, type VenueFormState } from "./actions";

const field = "min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-base";
const label = "flex flex-col gap-1 text-sm font-medium";

export type VenuePrefill = {
  name?: string;
  region?: string;
  latitude?: string;
  longitude?: string;
  elevation_m?: string;
};

export function VenueForm({ prefill, back }: { prefill: VenuePrefill; back: string }) {
  const [state, action, pending] = useActionState<VenueFormState, FormData>(addVenue, {});
  const [lat, setLat] = useState(prefill.latitude ?? "");
  const [lon, setLon] = useState(prefill.longitude ?? "");
  const [elev, setElev] = useState(prefill.elevation_m ?? "");
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);

  // Only on request: the app never assumes you ski where your phone is.
  function useHere() {
    if (!navigator.geolocation) {
      setLocError("This browser cannot share its location.");
      return;
    }
    setLocating(true);
    setLocError(null);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLat(p.coords.latitude.toFixed(5));
        setLon(p.coords.longitude.toFixed(5));
        if (p.coords.altitude !== null) setElev(String(Math.round(p.coords.altitude)));
        setLocating(false);
      },
      () => {
        setLocError("Location was not shared. Check the browser's permission for this site.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
      className="flex flex-col gap-4"
    >
      <input type="hidden" name="back" value={back} />
      <label className={label}>
        Name
        <input name="name" required defaultValue={prefill.name} placeholder="e.g. Lake Louise, Great Divide trail" className={field} />
      </label>
      <label className={label}>
        Area (optional)
        <input name="region" defaultValue={prefill.region} placeholder="e.g. Banff National Park, AB" className={field} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className={label}>
          Latitude
          <input name="latitude" inputMode="decimal" required value={lat} onChange={(e) => setLat(e.target.value)} placeholder="51.42540" className={field} />
        </label>
        <label className={label}>
          Longitude
          <input name="longitude" inputMode="decimal" required value={lon} onChange={(e) => setLon(e.target.value)} placeholder="-116.17730" className={field} />
        </label>
      </div>
      <label className={label}>
        Trail elevation, m (optional)
        <input name="elevation_m" inputMode="numeric" value={elev} onChange={(e) => setElev(e.target.value)} placeholder="e.g. 1540" className={field} />
        <span className="font-normal text-muted">
          The forecast is worked out for this height. Leave it blank and the weather service uses its own map height for the spot.
        </span>
      </label>
      <button type="button" onClick={useHere} disabled={locating} className="min-h-11 rounded-lg border border-line px-4 text-sm active:bg-tile disabled:opacity-50">
        {locating ? "Finding you…" : "I'm at the venue now: use my location"}
      </button>
      {locError && <p className="text-sm text-danger">{locError}</p>}
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input type="checkbox" name="make_home" className="size-5" />
        Make this my home venue (shown on Today)
      </label>
      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 flex-1 rounded-lg bg-accent px-4 font-semibold text-on-accent active:opacity-70 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save venue"}
        </button>
        {/* Back to where Add a venue was opened from: Today, Plan a wax or Venues. Nothing is saved. */}
        <Link href={back} className="inline-flex min-h-11 items-center rounded-lg border border-line px-4 font-semibold active:bg-tile">
          Cancel
        </Link>
      </div>
    </form>
  );
}
