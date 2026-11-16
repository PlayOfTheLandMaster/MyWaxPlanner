import { test } from "node:test";
import assert from "node:assert/strict";
import { formOwner, skisOf } from "./owner";

const skis = [
  { id: "mine", skier_id: null },
  { id: "annas", skier_id: "anna" },
  { id: "annas2", skier_id: "anna" },
];

test("only the owner's pairs", () => {
  assert.deepEqual(skisOf(skis, null).map((k) => k.id), ["mine"]);
  assert.deepEqual(skisOf(skis, "anna").map((k) => k.id), ["annas", "annas2"]);
});

test("whose skis: the pair's owner, else the session's skier, else the one picked", () => {
  assert.equal(formOwner(skis, { ski_id: "annas", skier_id: null }, null), "anna");
  assert.equal(formOwner(skis, { ski_id: null, skier_id: "anna" }, null), "anna");
  assert.equal(formOwner(skis, { ski_id: null, skier_id: null }, "anna"), null);
  assert.equal(formOwner(skis, null, "anna"), "anna");
  assert.equal(formOwner(skis, null, null), null);
});
