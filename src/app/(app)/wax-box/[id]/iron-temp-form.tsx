"use client";

import { startTransition, useActionState } from "react";
import type { WaxFormState } from "../actions";

const field = "min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-base";

/**
 * The skier's own iron temperature for a shared wax the maker gives none for.
 * The wax-along and plans use it; the maker's own figure, where there is one,
 * always comes first, so this box only appears when there is a gap.
 */
export function IronTempForm({ yours, save }: { yours: number | null; save: (prev: WaxFormState, data: FormData) => Promise<WaxFormState> }) {
  const [state, action, pending] = useActionState<WaxFormState, FormData>(save, {});
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-3">
      <div>
        <h2 className="font-semibold">Your iron temperature</h2>
        <p className="mt-1 text-sm text-muted">
          The maker doesn&apos;t publish one for this wax. Enter the temperature from the packaging or your own experience, and
          plans and the wax-along will use it. Leave it blank for a wax that isn&apos;t ironed. Only you see it.
        </p>
      </div>
      <form
        // Submitted by hand so a refused save keeps what was typed.
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          startTransition(() => action(data));
        }}
        className="flex flex-col gap-3"
      >
        <label className="flex flex-col gap-1 text-sm font-medium">
          <span className="font-normal text-muted">Iron temperature, °C</span>
          <input name="iron_temp_c" inputMode="numeric" placeholder="e.g. 130" defaultValue={yours ?? ""} className={field} />
        </label>
        {state.error && (
          <p role="alert" className="text-sm text-danger">
            {state.error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 self-start rounded-lg bg-accent px-4 font-semibold text-on-accent active:opacity-70 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save iron temperature"}
        </button>
      </form>
    </section>
  );
}
