import { test } from "node:test";
import assert from "node:assert/strict";
import { comparePlan } from "./plan-compare";

const planned = [
  { zone: "glide", layer_role: "cleaning", product_id: "clean", name: "Glide Cleaner" },
  { zone: "glide", layer_role: "base", product_id: "p-base", name: "UP Polar" },
  { zone: "glide", layer_role: "temperature", product_id: "p-blue", name: "RACE Blue Powder" },
  { zone: "grip", layer_role: "kick", product_id: "p-violet", name: "PURE RACE Violet" },
  { zone: "grip", layer_role: "binder", product_id: null, name: null }, // a gap: nothing in the box
];

test("as planned: nothing swapped, nothing skipped", () => {
  const r = comparePlan(planned, [
    { id: "l1", zone: "glide", layer_role: "base", product_id: "p-base" },
    { id: "l2", zone: "glide", layer_role: "temperature", product_id: "p-blue" },
    { id: "l3", zone: "grip", layer_role: "kick", product_id: "p-violet" },
    { id: "l4", zone: "grip", layer_role: "binder", product_id: null },
  ]);
  assert.equal(r.swapped.size, 0);
  assert.deepEqual(r.skipped, []);
});

test("a swapped wax names the one that was planned", () => {
  const r = comparePlan(planned, [
    { id: "l1", zone: "glide", layer_role: "base", product_id: "p-base" },
    { id: "l2", zone: "glide", layer_role: "temperature", product_id: "p-green" },
    { id: "l3", zone: "grip", layer_role: "kick", product_id: "p-violet" },
  ]);
  assert.equal(r.swapped.get("l2"), "RACE Blue Powder");
  assert.equal(r.swapped.has("l1"), false);
});

test("a planned layer that was not used is skipped; cleaning and gaps are not", () => {
  const r = comparePlan(planned, [{ id: "l2", zone: "glide", layer_role: "temperature", product_id: "p-blue" }]);
  assert.deepEqual(
    r.skipped.map((p) => p.name),
    ["UP Polar", "PURE RACE Violet"],
  );
});

test("filling a gap in the plan is not a swap, and an extra layer is not compared", () => {
  const r = comparePlan(planned, [
    { id: "l4", zone: "grip", layer_role: "binder", product_id: "p-binder" },
    { id: "l9", zone: "glide", layer_role: "top_coat", product_id: "p-top" },
  ]);
  assert.equal(r.swapped.size, 0);
});

test("with no plan there is nothing to compare", () => {
  const r = comparePlan([], [{ id: "l1", zone: "glide", layer_role: "base", product_id: "x" }]);
  assert.equal(r.swapped.size, 0);
  assert.deepEqual(r.skipped, []);
});
