import { test } from "node:test";
import assert from "node:assert/strict";
import { quickPicks, remember, search } from "./quick";

const squad = ["Anna S.", "Anna K.", "Bo L.", "Cleo M.", "Dag N.", "Eli O.", "Freya P.", "Gus Q."].map((name, i) => ({ id: `s${i}`, name }));

test("a small list shows everyone", () => {
  const few = squad.slice(0, 6);
  assert.deepEqual(quickPicks(few, "me", []), few);
});

test("a squad: current first, then recent, then A–Z, four in all", () => {
  const picks = quickPicks(squad, "s4", ["s6", "s4", "gone", "s2"]).map((k) => k.name);
  assert.deepEqual(picks, ["Dag N.", "Freya P.", "Bo L.", "Anna K."]);
});

test("with nothing remembered, A–Z fills the buttons", () => {
  assert.deepEqual(quickPicks(squad, "me", []).map((k) => k.name), ["Anna K.", "Anna S.", "Bo L.", "Cleo M."]);
});

test("remember: newest first, no repeats, never 'me', ten at most", () => {
  assert.deepEqual(remember(["a", "b"], "b"), ["b", "a"]);
  assert.deepEqual(remember(["a"], "me"), ["a"]);
  assert.equal(remember(Array.from({ length: 10 }, (_, i) => `x${i}`), "new").length, 10);
});

test("search: every word, any case, accents ignored, A–Z", () => {
  assert.deepEqual(search(squad, "anna").map((k) => k.name), ["Anna K.", "Anna S."]);
  assert.deepEqual(search(squad, "anna s").map((k) => k.name), ["Anna S."]);
  assert.deepEqual(search([{ name: "Åsa B." }], "asa").map((k) => k.name), ["Åsa B."]);
  assert.equal(search(squad, "").length, squad.length);
});
