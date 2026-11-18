import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BackLink } from "@/components/nav-trail";
import { ConfirmDelete } from "@/components/confirm-delete";
import { createClient } from "@/lib/supabase/server";
import { readerTimeZone } from "@/lib/reader-zone";
import { NOTE_COLUMNS, SECTION_LABELS, type Note } from "@/lib/learn/notes";
import { currentUser } from "@/lib/auth/current-user";
import { isAdmin } from "@/lib/learn/load";
import { deleteNote, setPublished } from "../actions";
import { PublishButton } from "./publish-button";

export const metadata: Metadata = { title: "Waxing note · My Wax Planner" };

export default function NotePage({ params, searchParams }: PageProps<"/learn/notes/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-5 px-4 py-6">
      <BackLink fallback="/learn" fallbackLabel="Learn" className="-mb-3 inline-flex min-h-11 items-center self-start text-sm text-link underline" />
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Article params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Article({
  params,
  searchParams,
}: {
  params: PageProps<"/learn/notes/[id]">["params"];
  searchParams: PageProps<"/learn/notes/[id]">["searchParams"];
}) {
  const [{ id }, q] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const [{ data, error }, timeZone, user, admin] = await Promise.all([
    supabase.from("learn_notes").select(NOTE_COLUMNS).eq("id", id).maybeSingle(),
    readerTimeZone(),
    currentUser(),
    isAdmin(supabase),
  ]);
  // Not a note id, or someone else's: Row Level Security hides it either way.
  if (error?.code === "22P02" || (!error && !data)) notFound();
  if (error) return <p role="alert" className="text-sm text-danger">Could not read the note: {error.message}</p>;
  const note = data as Note;
  // Another user's note can only be here because an admin published it: read only.
  const mine = note.user_id === user?.id;
  const day = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone, day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));

  return (
    <article className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-muted">
          {SECTION_LABELS[note.section]}
          {mine && note.published && <span className="ml-2 rounded-full bg-tile px-2 text-xs text-ink">Published to all users</span>}
          {!mine && <span className="ml-2 rounded-full bg-tile px-2 text-xs text-ink">Shared by the admin</span>}
        </p>
        <h1 className="text-2xl font-bold break-words">{note.title}</h1>
        <p className="text-xs text-muted">
          {note.updated_at.slice(0, 16) !== note.created_at.slice(0, 16) ? `Edited ${day(note.updated_at)}` : `Written ${day(note.created_at)}`}
        </p>
      </header>
      {note.body ? (
        // Plain text as typed: line breaks kept, nothing read as markup.
        <div className="whitespace-pre-wrap break-words rounded-xl border border-line bg-surface p-4 leading-relaxed">{note.body}</div>
      ) : (
        <p className="rounded-xl border border-line bg-surface p-4 text-muted">Nothing written yet.</p>
      )}
      {q.published && <p role="status" className="text-sm">Published: every user can now read this note on their Learn tab.</p>}
      {q.unpublished && <p role="status" className="text-sm">Unpublished: this note is yours alone again.</p>}
      {q.notpublished && (
        <p role="alert" className="text-sm text-danger">
          That didn&apos;t work: only the admin can publish, and only their own notes. Reload and try again.
        </p>
      )}
      {mine && (
      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
        <Link
          href={`/learn/notes/${note.id}/edit`}
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-accent px-5 font-semibold text-on-accent active:opacity-70"
        >
          Edit
        </Link>
        <ConfirmDelete action={deleteNote.bind(null, note.id)} label={note.title} />
      </div>
      )}
      {/* The admin can push one of their own notes out to every user, and take it back. */}
      {mine && admin && (
        <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-3">
          <p className="text-sm text-muted">
            {note.published
              ? "Every user can read this note under Shared by the admin. Edits you make show for them too."
              : "Only you can see this note. Publish it to put it on every user's Learn tab, read only."}
          </p>
          <PublishButton action={setPublished.bind(null, note.id, !note.published)} published={note.published} />
        </div>
      )}
    </article>
  );
}
