import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BackLink } from "@/components/nav-trail";
import { createClient } from "@/lib/supabase/server";
import { NOTE_COLUMNS, type Note } from "@/lib/learn/notes";
import { NoteForm } from "../../note-form";
import { saveNote } from "../../actions";

export const metadata: Metadata = { title: "Edit note · My Wax Planner" };

export default function EditNotePage({ params }: PageProps<"/learn/notes/[id]/edit">) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-5 px-4 py-6">
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Form params={params} />
      </Suspense>
    </main>
  );
}

async function Form({ params }: { params: PageProps<"/learn/notes/[id]/edit">["params"] }) {
  const { id } = await params;
  const { data, error } = await (await createClient()).from("learn_notes").select(NOTE_COLUMNS).eq("id", id).maybeSingle();
  if (error?.code === "22P02" || (!error && !data)) notFound();
  if (error) return <p role="alert" className="text-sm text-danger">Could not read the note: {error.message}</p>;
  const note = data as Note;
  return (
    <>
      <div>
        <BackLink fallback={`/learn/notes/${id}`} fallbackLabel="Note" />
        <h1 className="text-2xl font-bold">Edit note</h1>
      </div>
      <NoteForm save={saveNote.bind(null, id)} initial={note} cancelHref={`/learn/notes/${id}`} />
    </>
  );
}
