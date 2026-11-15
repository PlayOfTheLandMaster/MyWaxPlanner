"use client";

import { useActionState } from "react";
import type { WaxFormState } from "../actions";

export function NotesForm({
  initial,
  save,
}: {
  initial: string | null;
  save: (prev: WaxFormState, data: FormData) => Promise<WaxFormState>;
}) {
  const [state, action, pending] = useActionState<WaxFormState, FormData>(save, {});
  return (
    <form action={action} className="flex flex-col gap-2">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Notes
        <textarea
          name="notes"
          rows={3}
          defaultValue={initial ?? ""}
          placeholder="Where you bought it, how it ran, anything worth remembering"
          className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-base"
        />
      </label>
      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 self-start rounded-lg border border-line px-4 active:bg-tile disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save notes"}
      </button>
    </form>
  );
}
