import { test } from "node:test";
import assert from "node:assert/strict";
import { draftFields, draftKey, hasContent, readDraft } from "./draft";

test("only today's well-formed draft is restored", () => {
  const d = JSON.stringify({ v: 1, day: "2026-11-18", state: { technique: "classic" }, fields: { notes: "x" } });
  assert.equal(readDraft(d, "2026-11-18")?.state.technique, "classic");
  assert.equal(readDraft(d, "2026-11-19"), null);
  assert.equal(readDraft("not json", "2026-11-18"), null);
  assert.equal(readDraft(null, "2026-11-18"), null);
  assert.equal(readDraft(JSON.stringify({ v: 2, day: "2026-11-18", state: {}, fields: {} }), "2026-11-18"), null);
});

test("keeps the plain fields, leaving out hidden and state-held ones, and gathers repeats", () => {
  const entries: [string, string][] = [
    ["notes", "Cold and fast"],
    ["tz_offset", "420"],
    ["technique", "classic"],
    ["snow_types", "fresh"],
    ["snow_types", "fine"],
  ];
  assert.deepEqual(draftFields(entries, new Set(["tz_offset", "technique"])), { notes: "Cold and fast", snow_types: ["fresh", "fine"] });
});

test("an untouched form is not worth restoring", () => {
  assert.equal(hasContent({ notes: "", sky: "" }), false);
  assert.equal(hasContent({ notes: "", event_name: "Loppet" }), true);
  assert.equal(draftKey("record:me:new"), "mwp-draft:record:me:new");
});
