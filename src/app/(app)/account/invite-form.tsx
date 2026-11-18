"use client";

import { useActionState } from "react";
import { addInvite, type InviteState } from "./invite-actions";

const field = "min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-base";

export function InviteForm() {
  const [state, action, pending] = useActionState<InviteState, FormData>(addInvite, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Email address
        <input name="email" type="email" required autoComplete="off" className={field} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Note (optional)
        <input name="note" maxLength={200} placeholder="e.g. Anna, club coach" className={field} />
      </label>
      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      {state.added && (
        <p role="status" className="text-sm">
          {state.added} can now create an account. Send them the link above.
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-lg bg-accent px-4 font-semibold text-on-accent active:opacity-70 disabled:opacity-50"
      >
        {pending ? "Adding…" : "Add to the list"}
      </button>
    </form>
  );
}
