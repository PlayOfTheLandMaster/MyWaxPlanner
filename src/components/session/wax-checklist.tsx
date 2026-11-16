"use client";

import { useMemo, useSyncExternalStore } from "react";

/**
 * The plan's steps as a tick-off list while waxing. Ticks are kept on this
 * device only (a convenience, like a remembered fold): if storage is blocked
 * the list still works, it just forgets on reload. Recording the wax against
 * the session is step 3's wax-along mode.
 */

const CHANGED = "wax-steps-changed";

function read(key: string): string {
  try {
    return localStorage.getItem(key) ?? "[]";
  } catch {
    return "[]"; // storage blocked
  }
}

function subscribe(onChange: () => void) {
  // Another tab, or this list after a tick.
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGED, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGED, onChange);
  };
}

export function WaxChecklist({ sessionId, steps }: { sessionId: string; steps: { section: string; text: string }[] }) {
  const key = `wax-steps:${sessionId}`;
  // The server and the first render see nothing ticked; the device's ticks
  // follow straight after, without a mismatch.
  const raw = useSyncExternalStore(subscribe, () => read(key), () => "[]");
  const done = useMemo<number[]>(() => {
    try {
      const v = JSON.parse(raw);
      return Array.isArray(v) ? v.filter((n): n is number => typeof n === "number") : [];
    } catch {
      return [];
    }
  }, [raw]);

  const toggle = (i: number) => {
    const next = done.includes(i) ? done.filter((n) => n !== i) : [...done, i];
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // Not remembered on this device.
    }
    window.dispatchEvent(new Event(CHANGED));
  };

  const sections = [...new Set(steps.map((s) => s.section))];
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted" aria-live="polite">
        {done.length} of {steps.length} steps done
      </p>
      {sections.map((section) => (
        <div key={section || "steps"} className="flex flex-col gap-1">
          {section && <h3 className="text-sm font-semibold">{section}</h3>}
          <ul className="flex flex-col">
            {steps.map((s, i) =>
              s.section !== section ? null : (
                <li key={i}>
                  <label className="flex min-h-11 items-start gap-3 py-1 text-sm">
                    <input type="checkbox" checked={done.includes(i)} onChange={() => toggle(i)} className="mt-0.5 size-5 shrink-0" />
                    <span className={done.includes(i) ? "text-muted line-through" : ""}>{s.text}</span>
                  </label>
                </li>
              ),
            )}
          </ul>
        </div>
      ))}
    </div>
  );
}
