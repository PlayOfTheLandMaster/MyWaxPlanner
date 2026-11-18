"use client";

import { startTransition, useActionState } from "react";
import { BackLink } from "@/components/nav-trail";
import { BODY_MAX, SECTIONS, SECTION_LABELS, TITLE_MAX, type Note } from "@/lib/learn/notes";
import type { NoteFormState } from "./actions";

const field = "min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-base";
const label = "flex flex-col gap-1 text-sm font-medium";
const choice =
  "flex min-h-11 items-center justify-center rounded-lg border border-line bg-surface px-2 text-center text-sm has-[:checked]:border-accent has-[:checked]:bg-tile has-[:checked]:font-semibold";

/** Write a waxing note, or change one. Save opens it to read. */
export function NoteForm({
  save,
  initial,
  cancelHref,
}: {
  save: (prev: NoteFormState, data: FormData) => Promise<NoteFormState>;
  initial?: Pick<Note, "section" | "title" | "body">;
  cancelHref: string;
}) {
  const [state, action, pending] = useActionState<NoteFormState, FormData>(save, {});
  return (
    <form
      // Submitted by hand so a refused save keeps what was typed (React
      // empties a form after an action={…} submission).
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
      noValidate
      className="flex flex-col gap-4"
    >
      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 text-sm font-medium">Section</legend>
        <div className="grid grid-cols-2 gap-2">
          {SECTIONS.map((s) => (
            <label key={s} className={choice}>
              <input type="radio" name="section" value={s} defaultChecked={s === (initial?.section ?? "instructions")} className="sr-only" />
              {SECTION_LABELS[s]}
            </label>
          ))}
        </div>
      </fieldset>

      <label className={label}>
        Title
        <input name="title" maxLength={TITLE_MAX} defaultValue={initial?.title ?? ""} placeholder="e.g. Klister on icy tracks" className={field} />
      </label>

      <label className={label}>
        Note
        <textarea
          name="body"
          rows={14}
          maxLength={BODY_MAX}
          defaultValue={initial?.body ?? ""}
          placeholder="Write it the way you'd explain it at the waxing bench. Line breaks are kept."
          className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-base"
        />
      </label>

      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 rounded-lg bg-accent px-5 font-semibold text-on-accent active:opacity-70 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <BackLink fallback={cancelHref} className="inline-flex min-h-11 items-center px-2 text-sm text-link underline">
          Cancel
        </BackLink>
      </div>
    </form>
  );
}
