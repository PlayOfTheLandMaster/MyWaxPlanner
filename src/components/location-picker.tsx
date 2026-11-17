"use client";

import { useMemo, useState } from "react";
import { setTodayVenue } from "@/app/(app)/snow-actions";
import { hideVenue, removeVenue } from "@/app/(app)/venues/actions";
import { groupByPlace, placeOf } from "@/lib/venues/place";
import { suggestTarget } from "@/lib/venues/merge";

/**
 * `own`: added by this account, so ✕ deletes it; a shared venue is only
 * hidden from this account's lists. `sessions`: how many sessions name it.
 */
type V = { id: string; name: string; region: string | null; own: boolean; sessions: number };

const field = "min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-base";
const ALL = "";

/**
 * Today's Set location list: narrowed by country, province or state, and
 * name, then grouped and A–Z. It opens on the home venue's country with
 * every province showing: opening on the home province hid the BC venues of
 * an Alberta skier, who took them for deleted. Whenever the filters hide
 * anything, the list says how many and offers Show all.
 */
export function LocationPicker({ venues, current, home }: { venues: V[]; current: string | null; home: string | null }) {
  const places = useMemo(() => venues.map((v) => ({ v, p: placeOf(v.region) })), [venues]);
  const homePlace = places.find((x) => x.v.id === home)?.p ?? null;
  const [country, setCountry] = useState(homePlace?.country ?? ALL);
  const [province, setProvince] = useState(ALL);
  const [query, setQuery] = useState("");
  const [removing, setRemoving] = useState<string | null>(null);

  const countries = [...new Set(places.map((x) => x.p.country))].sort((a, b) =>
    a === "Other places" ? 1 : b === "Other places" ? -1 : a.localeCompare(b),
  );
  const provinces = [...new Set(places.filter((x) => x.p.country === country && x.p.province).map((x) => x.p.province as string))].sort(
    (a, b) => a.localeCompare(b),
  );

  const q = query.trim().toLowerCase();
  const shown = places
    .filter((x) => !country || x.p.country === country)
    .filter((x) => !province || x.p.province === province)
    .filter((x) => !q || `${x.v.name} ${x.v.region ?? ""}`.toLowerCase().includes(q))
    .map((x) => x.v);
  const filteredOut = venues.length - shown.length;
  const showAll = () => {
    setCountry(ALL);
    setProvince(ALL);
    setQuery("");
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Country
          <select
            value={country}
            onChange={(e) => {
              setCountry(e.target.value);
              setProvince(ALL);
            }}
            className={field}
          >
            <option value={ALL}>All countries</option>
            {countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Province / state
          <select
            value={province}
            onChange={(e) => setProvince(e.target.value)}
            disabled={!country || provinces.length === 0}
            className={field}
          >
            <option value={ALL}>All</option>
            {provinces.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
      </div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name"
        aria-label="Search locations by name"
        autoComplete="off"
        className={field}
      />

      {filteredOut > 0 && (
        <p className="flex items-center gap-2 text-sm text-muted">
          <span>
            {filteredOut === 1 ? "1 more location is" : `${filteredOut} more locations are`} outside these filters.
          </span>
          <button type="button" onClick={showAll} className="min-h-11 px-1 text-link underline">
            Show all
          </button>
        </p>
      )}
      {shown.length === 0 ? (
        <p className="text-sm text-muted">No locations match. Tap Show all, or add one below.</p>
      ) : (
        groupByPlace(shown).map((c) => (
          <section key={c.country} aria-label={c.country} className="flex flex-col gap-1">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{c.country}</h3>
            {c.provinces.map((pr) => (
              <div key={pr.province ?? "-"}>
                {pr.province && <h4 className="text-sm font-semibold">{pr.province}</h4>}
                <ul className="flex flex-col divide-y divide-line">
                  {pr.venues.map((v) => {
                    const on = v.id === current;
                    return (
                      <li key={v.id} className="flex flex-col">
                        <div className="flex items-center gap-1">
                          <form action={setTodayVenue.bind(null, v.id === home ? "home" : v.id)} className="min-w-0 flex-1">
                            <button
                              type="submit"
                              aria-pressed={on}
                              className="flex min-h-11 w-full items-center gap-3 text-left active:bg-tile"
                            >
                              <span
                                aria-hidden
                                className={`flex size-6 shrink-0 items-center justify-center rounded-full border text-xs ${on ? "border-accent bg-accent text-on-accent" : "border-line"}`}
                              >
                                {on ? "✓" : ""}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className={`block truncate ${on ? "font-semibold" : ""}`}>{v.name}</span>
                                {v.region && <span className="block truncate text-xs text-muted">{v.region}</span>}
                              </span>
                              {v.id === home && <span className="shrink-0 text-xs text-muted">home</span>}
                            </button>
                          </form>
                          <button
                            type="button"
                            onClick={() => setRemoving(removing === v.id ? null : v.id)}
                            aria-label={`Remove ${v.name}`}
                            aria-expanded={removing === v.id}
                            className="inline-flex size-11 shrink-0 items-center justify-center text-lg text-muted active:bg-tile"
                          >
                            ✕
                          </button>
                        </div>
                        {removing === v.id && (
                          <RemovePanel venue={v} others={venues.filter((o) => o.id !== v.id)} onCancel={() => setRemoving(null)} />
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </section>
        ))
      )}
    </div>
  );
}

const btn = "min-h-11 rounded-lg px-3 text-sm font-semibold active:opacity-70";

/** What ✕ asks before it acts. Nothing is removed until a button here is tapped. */
function RemovePanel({ venue, others, onCancel }: { venue: V; others: V[]; onCancel: () => void }) {
  const [target, setTarget] = useState(() => suggestTarget(venue.name, others) ?? "keep");
  const cancel = (
    <button type="button" onClick={onCancel} className="min-h-11 px-2 text-sm text-link underline">
      Cancel
    </button>
  );
  const box = "mb-2 flex flex-col gap-2 rounded-lg border border-line bg-tile p-3 text-sm";

  if (!venue.own) {
    return (
      <form action={hideVenue.bind(null, venue.id)} className={box}>
        <p>
          Hide {venue.name} from your lists? It is a shared location, so it stays for everyone else, and your sessions there keep it. You
          can show it again on the Venues page.
        </p>
        <div className="flex items-center gap-2">
          <button type="submit" className={`${btn} bg-danger text-on-accent`}>
            Hide
          </button>
          {cancel}
        </div>
      </form>
    );
  }

  if (venue.sessions === 0) {
    return (
      <form action={removeVenue.bind(null, venue.id, "none")} className={box}>
        <p>Delete {venue.name}? No sessions use it.</p>
        <div className="flex items-center gap-2">
          <button type="submit" className={`${btn} bg-danger text-on-accent`}>
            Delete
          </button>
          {cancel}
        </div>
      </form>
    );
  }

  const n = venue.sessions === 1 ? "1 session was" : `${venue.sessions} sessions were`;
  return (
    <form action={removeVenue.bind(null, venue.id, target)} className={box}>
      <p>
        {n} at {venue.name}. Before deleting it, move them to another location, or keep the name on them as plain text.
      </p>
      <label className="flex flex-col gap-1 font-medium">
        Sessions at {venue.name}
        <select value={target} onChange={(e) => setTarget(e.target.value)} className={field}>
          <option value="keep">Keep the name only</option>
          {others.map((o) => (
            <option key={o.id} value={o.id}>
              Move to {o.name}
              {o.region ? ` (${o.region})` : ""}
            </option>
          ))}
        </select>
      </label>
      <div className="flex items-center gap-2">
        <button type="submit" className={`${btn} bg-danger text-on-accent`}>
          {target === "keep" ? "Delete" : "Move and delete"}
        </button>
        {cancel}
      </div>
    </form>
  );
}
