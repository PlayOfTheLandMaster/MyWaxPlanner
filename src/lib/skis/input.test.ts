import { test } from "node:test";
import assert from "node:assert/strict";
import { readSki } from "./input";

const form = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};

test("a full classic waxable ski", () => {
  const { ski, error } = readSki(
    form({
      name: "  Race   classic ",
      technique: "classic",
      category: "waxable",
      brand: "Fischer",
      grind: "fine cold",
      grip_zone_cm: "62,5",
      notes: "",
    }),
  );
  assert.equal(error, undefined);
  assert.equal(ski?.name, "Race classic");
  assert.equal(ski?.category, "waxable");
  assert.equal(ski?.grip_zone_cm, 62.5);
  assert.equal(ski?.notes, null);
});

test("a skate ski drops a grip type and grip zone left over from the form", () => {
  const { ski } = readSki(form({ name: "Skate", brand: "Fischer", technique: "skate", category: "skin", grip_zone_cm: "60" }));
  assert.equal(ski?.category, null);
  assert.equal(ski?.grip_zone_cm, null);
});

test("a skin ski drops a grip zone length", () => {
  const { ski } = readSki(form({ name: "Skins", brand: "Fischer", technique: "classic", category: "skin", grip_zone_cm: "60" }));
  assert.equal(ski?.grip_zone_cm, null);
});

test("a name and a technique are required", () => {
  assert.match(readSki(form({ technique: "classic" })).error ?? "", /name/);
  assert.match(readSki(form({ name: "X" })).error ?? "", /classic or skate/);
});

test("nonsense is refused rather than saved", () => {
  assert.ok(readSki(form({ name: "X", brand: "Fischer", technique: "classic", category: "rockets" })).error);
  assert.ok(readSki(form({ name: "X", brand: "Fischer", technique: "classic", category: "waxable", grip_zone_cm: "long" })).error);
  assert.ok(readSki(form({ name: "X", brand: "Fischer", technique: "classic", category: "waxable", grip_zone_cm: "200" })).error);
});

test("the maker is required on every pair", () => {
  assert.match(readSki(form({ name: "X", technique: "skate" })).error ?? "", /maker/);
  assert.equal(readSki(form({ name: "X", technique: "skate", brand: "Madshus" })).ski?.brand, "Madshus");
});
