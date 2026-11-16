"use client";

import { startTransition, useActionState } from "react";
import type { SavePlanState } from "./actions";

export function SavePlanButton({ save }: { save: (prev: SavePlanState) => Promise<SavePlanState> }) {
  const [state, action, pending] = useActionState<SavePlanState>(save, {});
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => action())}
        className="min-h-11 rounded-lg bg-accent px-4 font-semibold text-on-accent active:opacity-70 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Use this plan"}
      </button>
      <p className="text-xs text-muted">Saves it as today&apos;s session. After skiing, Today asks how it went.</p>
      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
    </div>
  );
}
