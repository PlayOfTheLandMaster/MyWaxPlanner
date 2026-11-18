import { test } from "node:test";
import assert from "node:assert/strict";
import { groupNotes, preview, readNote, searchNotes, type Note } from "./notes";

const form = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};

test("reads a note, keeping its line breaks", () => {
  const { note } = readNote(form({ section: "how_to", title: "  Hot   scrape ", body: "\n\nStep 1\r\nStep 2\n\n  " }));
  assert.deepEqual(note, { section: "how_to", title: "Hot scrape", body: "Step 1\nStep 2" });
});

test("refuses a note with no section, no title or too much text", () => {
  assert.match(readNote(form({ title: "x" })).error ?? "", /section/);
  assert.match(readNote(form({ section: "other", title: "   " })).error ?? "", /title/);
  assert.match(readNote(form({ section: "other", title: "x".repeat(121) })).error ?? "", /under 120/);
  assert.match(readNote(form({ section: "other", title: "x", body: "y".repeat(20001) })).error ?? "", /too long/);
});

const note = (id: string, section: Note["section"], updated_at: string, title = id, body = ""): Note => ({
  id,
  section,
  title,
  body,
  created_at: updated_at,
  updated_at,
});

test("groups in the fixed order, newest edit first, and leaves out empty sections", () => {
  const groups = groupNotes([note("a", "other", "2026-01-01"), note("b", "instructions", "2026-01-01"), note("c", "instructions", "2026-02-01")]);
  assert.deepEqual(
    groups.map((g) => [g.section, g.notes.map((n) => n.id)]),
    [
      ["instructions", ["c", "b"]],
      ["other", ["a"]],
    ],
  );
});

test("a preview stops at a word and says it goes on", () => {
  assert.equal(preview("Short note"), "Short note");
  const p = preview("Iron the base layer in slowly, one pass from tip to tail, then let it cool for ten minutes before scraping it", 60);
  assert.ok(p.endsWith("…") && p.length <= 61 && !p.includes("  "));
});

test("search matches every word, in the title or the text", () => {
  const notes = [note("a", "products", "x", "Swix V40", "Good on cold fresh snow"), note("b", "how_to", "x", "Klister", "Warm the tube")];
  assert.deepEqual(searchNotes(notes, "cold swix").map((n) => n.id), ["a"]);
  assert.deepEqual(searchNotes(notes, "").map((n) => n.id), ["a", "b"]);
  assert.deepEqual(searchNotes(notes, "tube warm").map((n) => n.id), ["b"]);
});
