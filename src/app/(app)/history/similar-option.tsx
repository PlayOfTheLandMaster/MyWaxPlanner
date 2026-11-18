"use client";

import { useState } from "react";

/**
 * "Days similar to today", inside the Filter fold: a tap fills Period, Snow
 * from and to and Snow humidity from today's forecast (and sorts by best
 * glide), without applying. The person can still change any of them, or add
 * others, before Apply Filter.
 */
export function SimilarOption({ fields, detail }: { fields: Record<string, string>; detail: string }) {
  const [filled, setFilled] = useState(false);
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={(e) => {
          const form = e.currentTarget.form;
          if (!form) return;
          for (const [name, value] of Object.entries(fields)) {
            let el = form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null;
            // Sort has no box in the fold; it rides along as a hidden field.
            if (!el) {
              const hidden = document.createElement("input");
              hidden.type = "hidden";
              hidden.name = name;
              form.appendChild(hidden);
              el = hidden;
            }
            el.value = value;
          }
          setFilled(true);
        }}
        className="flex min-h-11 flex-col items-start justify-center rounded-lg border border-line bg-surface px-3 py-2 text-left active:bg-tile"
      >
        <span className="font-semibold">Days similar to today</span>
        <span className="text-sm text-muted">{detail}</span>
      </button>
      {filled && (
        <p role="status" className="text-sm">
          Filled in below. Change anything, then tap Apply Filter.
        </p>
      )}
    </div>
  );
}
