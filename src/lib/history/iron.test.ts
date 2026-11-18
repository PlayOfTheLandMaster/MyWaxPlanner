import { test } from "node:test";
import assert from "node:assert/strict";
import { ironForWax } from "./iron";

const wax = (iron: number | null) => ({ iron_temp_c: iron });

test("choosing a wax fills in its iron temperature", () => {
  assert.equal(ironForWax("", undefined, wax(145)), "145");
  assert.equal(ironForWax("", undefined, wax(null)), "");
});

test("changing the wax replaces the old wax's figure, or clears it", () => {
  assert.equal(ironForWax("145", wax(145), wax(130)), "130");
  assert.equal(ironForWax("145", wax(145), wax(null)), "");
});

test("a number typed by hand is kept whatever wax is chosen", () => {
  assert.equal(ironForWax("135", wax(145), wax(130)), "135");
  assert.equal(ironForWax("135", undefined, wax(130)), "135");
});
