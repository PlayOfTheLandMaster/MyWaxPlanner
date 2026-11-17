import { test } from "node:test";
import assert from "node:assert/strict";
import { normalName, suggestTarget } from "./merge";

const shared = { id: "s", name: "Lake Louise" };

test("normalName ignores case, accents and punctuation", () => {
  assert.equal(normalName("  Lake-Louise "), "lake louise");
  assert.equal(normalName("Mont-Sainte-Anne"), normalName("mont sainte anne"));
  assert.equal(normalName("Québec"), "quebec");
});

test("the same name, spelt differently, is pre-selected", () => {
  assert.equal(suggestTarget("lake louise", [shared, { id: "c", name: "Canmore" }]), "s");
});

test("a name inside the other one is pre-selected", () => {
  assert.equal(suggestTarget("Lake Louise Nordic", [shared, { id: "c", name: "Canmore" }]), "s");
  assert.equal(suggestTarget("Lake Louise", [{ id: "n", name: "Lake Louise Nordic Centre" }]), "n");
});

test("only whole words count", () => {
  assert.equal(suggestTarget("Lake", [{ id: "x", name: "Lakeside" }]), null);
});

test("two equally good matches, or none, pre-select nothing", () => {
  assert.equal(suggestTarget("Canmore", [shared]), null);
  assert.equal(suggestTarget("Lake Louise", [shared, { id: "t", name: "lake louise" }]), null);
  assert.equal(suggestTarget("", [shared]), null);
});

test("an exact match wins over a near one", () => {
  assert.equal(suggestTarget("Lake Louise", [{ id: "n", name: "Lake Louise Nordic" }, shared]), "s");
});
