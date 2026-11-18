"use client";

import { useRef, useState } from "react";

type Box = HTMLInputElement | HTMLSelectElement;

/** What each box holds with no filter: what a second tap goes back to when the page opened with this already applied. */
const CLEAR: Record<string, string> = { period: "season", sort: "date" };

/**
 * "Days similar to today", inside the Filter fold. A tap fills Period, Snow
 * from and to, Snow humidity and the best-glide sort from today's forecast,
 * without applying; a second tap puts back what was there before. Either way
 * Apply Filter is what changes the list.
 */
export function SimilarOption({ fields, detail, initiallyOn }: { fields: Record<string, string>; detail: string; initiallyOn: boolean }) {
  const [on, setOn] = useState(initiallyOn);
  const [touched, setTouched] = useState(false);
  // The values the first tap replaced, and any hidden box it had to add.
  const before = useRef<Record<string, string> | null>(null);
  const added = useRef<HTMLInputElement[]>([]);

  const toggle = (form: HTMLFormElement) => {
    const box = (name: string) => form.elements.namedItem(name) as Box | null;
    if (!on) {
      const saved: Record<string, string> = {};
      for (const [name, value] of Object.entries(fields)) {
        let el = box(name);
        // Sort has no box in the fold; it rides along as a hidden field.
        if (!el) {
          const hidden = document.createElement("input");
          hidden.type = "hidden";
          hidden.name = name;
          form.appendChild(hidden);
          added.current.push(hidden);
          el = hidden;
        }
        saved[name] = el.value;
        el.value = value;
      }
      before.current = saved;
    } else {
      for (const name of Object.keys(fields)) {
        const el = box(name);
        if (el) el.value = before.current?.[name] ?? CLEAR[name] ?? "";
      }
      for (const el of added.current) el.remove();
      added.current = [];
      before.current = null;
    }
    setOn(!on);
    setTouched(true);
  };

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        aria-pressed={on}
        onClick={(e) => e.currentTarget.form && toggle(e.currentTarget.form)}
        className={`flex min-h-11 items-start gap-3 rounded-lg border px-3 py-2 text-left active:bg-tile ${on ? "border-accent bg-tile" : "border-line bg-surface"}`}
      >
        {/* A tick box drawn, so on and off read at a glance. */}
        <span
          aria-hidden
          className={`mt-0.5 flex size-5 flex-none items-center justify-center rounded border-2 text-xs font-bold ${on ? "border-accent bg-accent text-on-accent" : "border-muted"}`}
        >
          {on ? "✓" : ""}
        </span>
        <span className="flex flex-col">
          <span className="font-semibold">Days similar to today</span>
          <span className="text-sm text-muted">{detail}</span>
        </span>
      </button>
      {touched && (
        <p role="status" className="text-sm">
          {on ? "Filled in below." : "Put back as it was."} Tap Apply Filter to update the list.
        </p>
      )}
    </div>
  );
}
