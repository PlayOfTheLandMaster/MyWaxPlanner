"use client";

import { useState } from "react";

/**
 * "Delete" beside a row in a list (a planned session, a pair of skis). One
 * tap asks, a second deletes: a row added by mistake goes without opening
 * it, and a slip of the finger beside its other buttons cannot lose one.
 */
export function ConfirmDelete({ action, label }: { action: () => Promise<void>; label: string }) {
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return (
      <button
        type="button"
        onClick={() => setAsking(true)}
        aria-label={`Delete ${label}`}
        className="inline-flex min-h-11 shrink-0 items-center px-2 text-sm text-danger underline"
      >
        Delete
      </button>
    );
  }
  return (
    <form action={action} className="flex shrink-0 items-center gap-1">
      <button type="submit" className="min-h-11 rounded-lg bg-danger px-3 text-sm font-semibold text-on-accent active:opacity-70">
        Delete
      </button>
      <button type="button" onClick={() => setAsking(false)} className="min-h-11 px-2 text-sm text-link underline">
        Keep
      </button>
    </form>
  );
}
