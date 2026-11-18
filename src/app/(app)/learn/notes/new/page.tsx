import { Suspense } from "react";
import type { Metadata } from "next";
import { BackLink } from "@/components/nav-trail";
import { SECTIONS, type Section } from "@/lib/learn/notes";
import { NoteForm } from "../note-form";
import { saveNote } from "../actions";

export const metadata: Metadata = { title: "Write a note · My Wax Planner" };

export default function NewNotePage({ searchParams }: PageProps<"/learn/notes/new">) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-5 px-4 py-6">
      <div>
        <BackLink fallback="/learn" fallbackLabel="Notes" />
        <h1 className="text-2xl font-bold">Write a note</h1>
        <p className="text-sm text-muted">Your waxing notes are yours alone; nobody else sees them.</p>
      </div>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Form searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Form({ searchParams }: { searchParams: PageProps<"/learn/notes/new">["searchParams"] }) {
  // "Write a note" under a section heading starts in that section.
  const s = (await searchParams).section;
  const section = (SECTIONS as readonly string[]).includes(String(s)) ? (s as Section) : "instructions";
  return <NoteForm save={saveNote.bind(null, null)} initial={{ section, title: "", body: "" }} cancelHref="/learn" />;
}
