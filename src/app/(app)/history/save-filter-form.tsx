"use client";

import { startTransition, useActionState } from "react";
import type { FilterFormState } from "./actions";

export function SaveFilterForm({
  save,
}: {
  save: (prev: FilterFormState, data: FormData) => Promise<FilterFormState>;
}) {
  const [state, action, pending] = useActionState<FilterFormState, FormData>(save, {});
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
      className="flex flex-col gap-2"
    >
      <div className="flex gap-2">
        <input
          name="name"
          required
          maxLength={80}
          placeholder="Name, e.g. Canmore cold races"
          aria-label="Name for this filter"
          className="min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-base"
        />
        <button type="submit" disabled={pending} className="min-h-11 shrink-0 rounded-lg border border-line px-4 text-sm font-semibold disabled:opacity-50">
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      {state.saved && (
        <p role="status" className="text-sm text-link">
          Saved as “{state.saved}”.
        </p>
      )}
    </form>
  );
}
