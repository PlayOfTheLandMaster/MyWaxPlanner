import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BackLink } from "@/components/nav-trail";
import { ConfirmDelete } from "@/components/confirm-delete";
import { createClient } from "@/lib/supabase/server";
import { readerTimeZone } from "@/lib/reader-zone";
import { NOTE_COLUMNS, SECTION_LABELS, type Note } from "@/lib/learn/notes";
import { deleteNote } from "../actions";

export const metadata: Metadata = { title: "Waxing note · My Wax Planner" };

export default function NotePage({ params }: PageProps<"/learn/notes/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-5 px-4 py-6">
      <BackLink fallback="/learn" fallbackLabel="Learn" className="-mb-3 inline-flex min-h-11 items-center self-start text-sm text-link underline" />
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Article params={params} />
      </Suspense>
    </main>
  );
}

async function Article({ params }: { params: PageProps<"/learn/notes/[id]">["params"] }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data, error }, timeZone] = await Promise.all([
    supabase.from("learn_notes").select(NOTE_COLUMNS).eq("id", id).maybeSingle(),
    readerTimeZone(),
  ]);
  // Not a note id, or someone else's: Row Level Security hides it either way.
  if (error?.code === "22P02" || (!error && !data)) notFound();
  if (error) return <p role="alert" className="text-sm text-danger">Could not read the note: {error.message}</p>;
  const note = data as Note;
  const day = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone, day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));

  return (
    <article className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-muted">{SECTION_LABELS[note.section]}</p>
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
      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
        <Link
          href={`/learn/notes/${note.id}/edit`}
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-accent px-5 font-semibold text-on-accent active:opacity-70"
        >
          Edit
        </Link>
        <ConfirmDelete action={deleteNote.bind(null, note.id)} label={note.title} />
      </div>
    </article>
  );
}
