"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

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
      <Buttons onKeep={() => setAsking(false)} />
    </form>
  );
}

/**
 * Deleting takes a second or two (a shared venue's name is first copied onto
 * every session that used it), and a Delete that looked unchanged invited
 * more taps. So while it runs it says "Deleting…" and takes no more.
 */
function Buttons({ onKeep }: { onKeep: () => void }) {
  const { pending } = useFormStatus();
  return (
    <>
      <button
        type="submit"
        disabled={pending}
        aria-live="polite"
        className="min-h-11 rounded-lg bg-danger px-3 text-sm font-semibold text-on-accent active:opacity-70 disabled:opacity-60"
      >
        {pending ? "Deleting…" : "Delete"}
      </button>
      {!pending && (
        <button type="button" onClick={onKeep} className="min-h-11 px-2 text-sm text-link underline">
          Keep
        </button>
      )}
    </>
  );
}
