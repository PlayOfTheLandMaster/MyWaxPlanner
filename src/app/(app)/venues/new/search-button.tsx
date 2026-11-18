"use client";

import { useEffect, useState } from "react";

/**
 * Search, which says it is searching: looking around a town as well as by
 * name takes several seconds, because OpenStreetMap is asked once a second.
 */
export function SearchButton() {
  const [busy, setBusy] = useState(false);
  // Back to this page from the browser's history: the old page, still "Searching…".
  useEffect(() => {
    const reset = () => setBusy(false);
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);
  return (
    <button
      type="submit"
      onClick={() => setTimeout(() => setBusy(true))}
      aria-live="polite"
      className="min-h-11 shrink-0 rounded-lg border border-line px-4 text-sm font-semibold"
    >
      {busy ? "Searching…" : "Search"}
    </button>
  );
}
