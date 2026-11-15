import { test } from "node:test";
import assert from "node:assert/strict";
import { searchWaxes, type Searchable } from "./search";

const p = (id: string, brand: string, name: string, category: Searchable["category"]): Searchable => ({
  id,
  name,
  category,
  brand: { name: brand },
});

const all = [
  p("1", "Swix", "V40 Blue Extra", "hardwax"),
  p("2", "Rode", "Multigrade Violet", "hardwax"),
  p("3", "Swix", "KX65 Red", "klister"),
  p("4", "Holmenkol", "Ultra Mix", "hydrocarbon"),
  p("5", "Rex", "Blå", "hardwax"),
];

const ids = (xs: Searchable[]) => xs.map((x) => x.id);

test("every word must match, in any order", () => {
  assert.deepEqual(ids(searchWaxes(all, "blue swix", new Set())), ["1"]);
  assert.deepEqual(ids(searchWaxes(all, "SWIX", new Set())), ["3", "1"]);
});

test("the type's words count", () => {
  assert.deepEqual(ids(searchWaxes(all, "klister", new Set())), ["3"]);
  assert.deepEqual(ids(searchWaxes(all, "paraffin", new Set())), ["4"]);
});

test("accents are ignored both ways", () => {
  assert.deepEqual(ids(searchWaxes(all, "bla", new Set())), ["5"]);
});

test("waxes already in the box are left out", () => {
  assert.deepEqual(ids(searchWaxes(all, "swix", new Set(["1"]))), ["3"]);
});

test("an empty search finds nothing rather than everything", () => {
  assert.deepEqual(searchWaxes(all, "   ", new Set()), []);
});
