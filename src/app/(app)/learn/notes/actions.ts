"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { readNote } from "@/lib/learn/notes";

export type NoteFormState = { error?: string };

async function signedIn() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  return { supabase, userId: data.user.id };
}

/** Writes a new note (id null) or changes one; then opens it to read. */
export async function saveNote(id: string | null, _prev: NoteFormState, form: FormData): Promise<NoteFormState> {
  const { supabase, userId } = await signedIn();
  const { note, error } = readNote(form);
  if (error !== undefined) return { error };

  let savedId = id;
  if (id) {
    // Row Level Security refuses someone else's note as "no rows", not an error, so count what changed.
    const { data, error: e } = await supabase.from("learn_notes").update(note).eq("id", id).select("id");
    if (e) return { error: `Could not save the note: ${e.message}` };
    if (!data?.length) return { error: "That note is no longer in your notes." };
  } else {
    const { data, error: e } = await supabase.from("learn_notes").insert({ ...note, user_id: userId }).select("id").single();
    if (e) return { error: `Could not save the note: ${e.message}` };
    savedId = data.id as string;
  }
  revalidatePath("/learn");
  redirect(`/learn/notes/${savedId}`);
}

/** Deletes a note (two taps on its page) and goes back to the list. */
export async function deleteNote(id: string) {
  const { supabase } = await signedIn();
  const { data } = await supabase.from("learn_notes").delete().eq("id", id).select("id");
  revalidatePath("/learn");
  redirect(data?.length ? "/learn?deleted=1" : "/learn");
}

/**
 * Publishes an admin's own note to every user, or takes it back. The database
 * refuses anyone else (only the writer may change a note, only an admin may
 * publish), so a refusal is counted rather than assumed away.
 */
export async function setPublished(id: string, publish: boolean) {
  const { supabase } = await signedIn();
  const { data } = await supabase.from("learn_notes").update({ published: publish }).eq("id", id).select("id");
  revalidatePath("/learn");
  redirect(data?.length ? `/learn/notes/${id}?${publish ? "published" : "unpublished"}=1` : `/learn/notes/${id}?notpublished=1`);
}
