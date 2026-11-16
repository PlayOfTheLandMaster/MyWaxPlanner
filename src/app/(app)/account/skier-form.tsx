"use client";

import { startTransition, useActionState, useRef } from "react";
import type { SkierFormState } from "./skier-actions";
import { BodyFields } from "@/components/body-fields";
import type { Body } from "@/lib/skiers/body";
import { splitName } from "@/lib/profile/name";

const field = "min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-base";

/** Add a skier (empties itself after each one, for adding a team quickly) or edit one. */
export function SkierForm({
  save,
  initial,
  submitLabel,
  years,
}: {
  save: (prev: SkierFormState, data: FormData) => Promise<SkierFormState>;
  initial?: { name: string; notes: string | null } & Body;
  submitLabel: string;
  years: number[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  // Stored as "Anna S."; edited as its two parts.
  const parts = splitName(initial?.name);
  const [state, action, pending] = useActionState<SkierFormState, FormData>(async (prev, data) => {
    const result = await save(prev, data);
    if (result.added && formRef.current) {
      formRef.current.reset();
      formRef.current.querySelector<HTMLInputElement>("input[name=first_name]")?.focus();
    }
    return result;
  }, {});

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
      className="flex flex-col gap-2"
    >
      {/* The initial tells two skiers with one first name apart: Anna S. and Anna K. */}
      <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-2">
        <input
          name="first_name"
          required
          maxLength={40}
          defaultValue={parts.first_name}
          placeholder="First name, e.g. Emma"
          aria-label="Skier's first name"
          className={field}
        />
        <input
          name="last_initial"
          required
          maxLength={1}
          defaultValue={parts.last_initial}
          placeholder="Initial"
          aria-label="Skier's last initial"
          className={`${field} uppercase`}
        />
      </div>
      <input
        name="notes"
        maxLength={500}
        defaultValue={initial?.notes ?? ""}
        placeholder="Notes (optional), e.g. U14, light skier"
        aria-label="Notes"
        className={field}
      />
      <BodyFields initial={initial} years={years} />
      <button type="submit" disabled={pending} className="min-h-11 rounded-lg bg-accent px-4 font-semibold text-on-accent active:opacity-70 disabled:opacity-50">
        {pending ? "Saving…" : submitLabel}
      </button>
      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      {state.added && (
        <p role="status" className="text-sm text-link">
          Added {state.added}. Add the next, or tap their name to add skis.
        </p>
      )}
    </form>
  );
}
