import { test } from "node:test";
import assert from "node:assert/strict";
import { displayName, readName } from "./name";

const form = (first: string, last: string) => ({ get: (k: string) => (k === "first_name" ? first : k === "last_initial" ? last : null) });

test("display: first name and initial, else the first name, else Me", () => {
  assert.equal(displayName("Anna", "s"), "Anna S.");
  assert.equal(displayName("Anna", null), "Anna");
  assert.equal(displayName("  ", "S"), "Me");
  assert.equal(displayName(null, null), "Me");
});

test("read: trims, keeps one letter of the surname, upper-cased", () => {
  assert.deepEqual(readName(form("  Anna   Maria ", "smith")), { first_name: "Anna Maria", last_initial: "S" });
  assert.deepEqual(readName(form("Åsa", "ø")), { first_name: "Åsa", last_initial: "Ø" });
  assert.deepEqual(readName(form("Anna", " .K")), { first_name: "Anna", last_initial: "K" });
});

test("read: both are required", () => {
  assert.deepEqual(readName(form("", "S")), { error: "Enter your first name." });
  assert.deepEqual(readName(form("Anna", "")), { error: "Enter the first letter of your last name." });
  assert.deepEqual(readName(form("Anna", "1")), { error: "Enter the first letter of your last name." });
  assert.ok("error" in readName(form("x".repeat(41), "S")));
});

test("split: a stored name back into its two fields", async () => {
  const { splitName } = await import("./name");
  assert.deepEqual(splitName("Anna S."), { first_name: "Anna", last_initial: "S" });
  assert.deepEqual(splitName("Anna Maria K."), { first_name: "Anna Maria", last_initial: "K" });
  assert.deepEqual(splitName("Anna"), { first_name: "Anna", last_initial: "" });
  assert.deepEqual(splitName(null), { first_name: "", last_initial: "" });
});
