"use client";

import { useEffect, useState } from "react";

const MINE = process.env.NEXT_PUBLIC_BUILD ?? "dev";
const EVERY = 5 * 60 * 1000;

/**
 * "A new version is ready" with a Reload button, above the tab bar. A page left
 * open across a deploy can freeze on its next save (its server actions no longer
 * exist), so it asks which version is live every few minutes and whenever the
 * app comes back to the screen.
 */
export function UpdateBar() {
  const [newer, setNewer] = useState(false);
  useEffect(() => {
    if (MINE === "dev") return; // npm run dev: every edit would count as a new version
    let stop = false;
    async function check() {
      if (stop || document.visibilityState !== "visible") return;
      try {
        const r = await fetch("/api/version", { cache: "no-store" });
        if (!r.ok) return;
        const { build } = (await r.json()) as { build?: string };
        if (build && build !== "dev" && build !== MINE) setNewer(true);
      } catch {
        // Offline or a blip: ask again next time.
      }
    }
    const timer = setInterval(check, EVERY);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    check();
    return () => {
      stop = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, []);
  if (!newer) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-20 px-3 pb-2 print:hidden"
    >
      <div className="mx-auto flex max-w-xl items-center gap-3 rounded-xl bg-accent px-4 py-2 text-on-accent shadow-lg">
        <span className="flex-1 text-sm">A new version is ready.</span>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="min-h-11 rounded-lg bg-surface px-4 text-sm font-semibold text-accent active:opacity-70"
        >
          Reload
        </button>
      </div>
    </div>
  );
}
