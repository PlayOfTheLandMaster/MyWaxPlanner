import { test } from "node:test";
import assert from "node:assert/strict";
import { skisLabel } from "./possessive";

test("the Skis label names whose skis they are", () => {
  assert.equal(skisLabel("Anna E."), "Anna E's Skis");
  assert.equal(skisLabel("Finn P."), "Finn P's Skis");
  assert.equal(skisLabel("Chris"), "Chris's Skis");
  assert.equal(skisLabel(null), "Skis");
  assert.equal(skisLabel("  "), "Skis");
});
