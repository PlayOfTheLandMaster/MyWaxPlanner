"use client";

import { useFormStatus } from "react-dom";

/** Publish to all users / Unpublish, which says so while it works and takes no more taps. */
export function PublishButton({ action, published }: { action: () => Promise<void>; published: boolean }) {
  return (
    <form action={action}>
      <Submit published={published} />
    </form>
  );
}

function Submit({ published }: { published: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-live="polite"
      className={`min-h-11 rounded-lg px-4 text-sm font-semibold active:opacity-70 disabled:opacity-60 ${
        published ? "border border-line" : "bg-accent text-on-accent"
      }`}
    >
      {pending ? (published ? "Unpublishing…" : "Publishing…") : published ? "Unpublish" : "Publish to all users"}
    </button>
  );
}
