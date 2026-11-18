// Waxing notes: a skier's own articles on the Learn tab (table learn_notes).
// Pure, so the form's rules and the list's grouping can be tested.

export const SECTIONS = ["instructions", "products", "how_to", "accommodation", "restaurants", "shops", "other"] as const;
export type Section = (typeof SECTIONS)[number];

export const SECTION_LABELS: Record<Section, string> = {
  instructions: "Waxing instructions",
  products: "Notes on products",
  how_to: "How-to",
  accommodation: "Accommodation",
  restaurants: "Restaurants",
  shops: "Shops",
  other: "Other",
};

export type Note = {
  id: string;
  user_id: string;
  section: Section;
  title: string;
  body: string;
  /** Set by an admin on their own note: every signed-in user can read it. */
  published: boolean;
  created_at: string;
  updated_at: string;
};

export const NOTE_COLUMNS = "id, user_id, section, title, body, published, created_at, updated_at";

export const TITLE_MAX = 120;
export const BODY_MAX = 20000;

export type NoteInput = { note: { section: Section; title: string; body: string }; error?: undefined } | { note?: undefined; error: string };

/** What a save may contain; the database checks the same limits. */
export function readNote(form: FormData): NoteInput {
  const section = String(form.get("section") ?? "");
  if (!(SECTIONS as readonly string[]).includes(section)) return { error: "Choose a section." };
  const title = String(form.get("title") ?? "").trim().replace(/\s+/g, " ");
  if (!title) return { error: "Give the note a title." };
  if (title.length > TITLE_MAX) return { error: `Keep the title under ${TITLE_MAX} characters.` };
  // Line breaks are kept as typed; only trailing space at the very ends goes.
  const body = String(form.get("body") ?? "").replace(/\r\n?/g, "\n").replace(/^\s*\n|\s+$/g, "");
  if (body.length > BODY_MAX) return { error: `That note is too long: keep it under ${BODY_MAX.toLocaleString("en-CA")} characters.` };
  return { note: { section: section as Section, title, body } };
}

/** The sections that hold notes, in the fixed order, each newest-edited first. */
export function groupNotes(notes: Note[]): { section: Section; notes: Note[] }[] {
  return SECTIONS.map((section) => ({
    section,
    notes: notes.filter((n) => n.section === section).sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
  })).filter((g) => g.notes.length > 0);
}

/** The first words of a note, for its line in the list. */
export function preview(body: string, max = 90): string {
  const t = body.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[.,;:\s]+$/, "")}…`;
}

/** Notes whose title or text contain every word searched for. */
export function searchNotes(notes: Note[], q: string | undefined): Note[] {
  const words = (q ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return notes;
  return notes.filter((n) => {
    const text = `${n.title} ${n.body}`.toLowerCase();
    return words.every((w) => text.includes(w));
  });
}

/** Splits what the reader can see into their own notes and those an admin published for everyone. */
export function splitNotes(notes: Note[], me: string): { own: Note[]; shared: Note[] } {
  return {
    own: notes.filter((n) => n.user_id === me),
    shared: notes.filter((n) => n.user_id !== me && n.published).sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
  };
}
