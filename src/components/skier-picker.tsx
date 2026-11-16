"use client";

import { useState, useSyncExternalStore } from "react";
import { setCurrentSkier } from "@/lib/skiers/actions";
import { SHOW_ALL_UP_TO, quickPicks, remember, search } from "@/lib/skiers/quick";

const RECENT_KEY = "wax.recentSkiers";

/** The skiers picked lately on this device, newest first. Empty on the server and in private windows. */
function readRecent(): string[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}
let recentCache = "";
let recentValue: string[] = [];
const subscribe = (fn: () => void) => {
  window.addEventListener("storage", fn);
  return () => window.removeEventListener("storage", fn);
};
function snapshot(): string[] {
  // useSyncExternalStore needs the same array back while nothing changed.
  const raw = (() => {
    try {
      return localStorage.getItem(RECENT_KEY) ?? "";
    } catch {
      return "";
    }
  })();
  if (raw !== recentCache) {
    recentCache = raw;
    recentValue = readRecent();
  }
  return recentValue;
}
const EMPTY: string[] = [];

/**
 * One tap picks who is being waxed for; Session, History and Skis all follow.
 * Used inside every screen's skier banner (Today included), so picking never
 * leaves the page. `returnTo` is where to land afterwards when the page's own
 * address would otherwise keep showing someone else (a History filter).
 *
 * A short list shows every skier as a button. A coach's squad shows the
 * account holder, the skier picked now and the most recently picked as
 * buttons, with a search for everyone else (lib/skiers/quick.ts).
 */
export function SkierPicker({
  skiers,
  current,
  me,
  returnTo,
}: {
  skiers: { id: string; name: string }[];
  current: string;
  /** The account holder's name, for their own button. */
  me: string;
  returnTo?: string;
}) {
  const recent = useSyncExternalStore(subscribe, snapshot, () => EMPTY);
  const [query, setQuery] = useState("");
  const big = skiers.length > SHOW_ALL_UP_TO;
  const quick = quickPicks(skiers, current, recent);
  const found = big && query.trim() ? search(skiers, query) : [];

  const button = (k: { id: string; name: string }) => {
    const on = current === k.id;
    return (
      <button
        key={k.id}
        type="submit"
        name="skier"
        value={k.id}
        aria-pressed={on}
        className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm ${on ? "border-accent bg-accent font-semibold text-on-accent" : "border-line bg-surface active:bg-tile"}`}
      >
        {k.name}
      </button>
    );
  };

  return (
    <form
      action={setCurrentSkier}
      onSubmit={(e) => {
        // Remember the pick on this device, so it is a button next time.
        const id = (e.nativeEvent as SubmitEvent).submitter?.getAttribute("value");
        if (!id) return;
        try {
          localStorage.setItem(RECENT_KEY, JSON.stringify(remember(readRecent(), id)));
        } catch {
          // Private window or storage full: the picker still works, just without memory.
        }
      }}
      className="flex flex-col gap-3"
    >
      {returnTo && <input type="hidden" name="return" value={returnTo} />}
      <div className="flex flex-wrap gap-2">
        {button({ id: "me", name: me })}
        {quick.map(button)}
      </div>
      {big && (
        <div className="flex flex-col gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              // Enter must not submit the form with no skier chosen.
              if (e.key === "Enter") e.preventDefault();
            }}
            placeholder={`Find one of ${skiers.length} skiers`}
            aria-label="Find a skier"
            autoComplete="off"
            className="min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-base"
          />
          {query.trim() &&
            (found.length > 0 ? (
              <div className="flex flex-wrap gap-2" aria-live="polite">
                {found.map(button)}
              </div>
            ) : (
              <p className="text-sm text-muted" aria-live="polite">
                No skier matches “{query.trim()}”.
              </p>
            ))}
        </div>
      )}
    </form>
  );
}
