import { test } from "node:test";
import assert from "node:assert/strict";
import { ageOf, birthYears, describeBody, readBody } from "./body";

const now = new Date(2026, 10, 15); // 15 Nov 2026
const form = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};

test("age counts the birthday month", () => {
  assert.deepEqual(ageOf({ birth_year: 2013, birth_month: 11 }, now), { years: 13, exact: true });
  assert.deepEqual(ageOf({ birth_year: 2013, birth_month: 12 }, now), { years: 12, exact: true });
  assert.deepEqual(ageOf({ birth_year: 2013, birth_month: null }, now), { years: 13, exact: false });
  assert.equal(ageOf({ birth_year: null, birth_month: null }, now), null);
});

test("describe", () => {
  assert.equal(describeBody({ birth_year: 2013, birth_month: 3, weight_kg: 42 }, now), "Age 13 · 42 kg");
  assert.equal(describeBody({ birth_year: 2013, birth_month: null, weight_kg: null }, now), "Turns 13 this year");
  assert.equal(describeBody({ birth_year: null, birth_month: null, weight_kg: 72.5 }, now), "72.5 kg");
  assert.equal(describeBody({ birth_year: null, birth_month: null, weight_kg: null }, now), "");
});

test("read: blanks, decimals with a comma, and bad values", () => {
  assert.deepEqual(readBody(form({}), now), { birth_year: null, birth_month: null, weight_kg: null });
  assert.deepEqual(readBody(form({ birth_year: "1965", birth_month: "4", weight_kg: "78,46" }), now), {
    birth_year: 1965,
    birth_month: 4,
    weight_kg: 78.5,
  });
  assert.ok("error" in readBody(form({ birth_month: "4" }), now));
  assert.ok("error" in readBody(form({ birth_year: "2027" }), now));
  assert.ok("error" in readBody(form({ birth_year: "2026", birth_month: "12" }), now));
  assert.ok("error" in readBody(form({ weight_kg: "5" }), now));
  assert.ok("error" in readBody(form({ weight_kg: "abc" }), now));
});

test("years list runs newest first", () => {
  const years = birthYears(now);
  assert.equal(years[0], 2026);
  assert.equal(years.at(-1), 1920);
});
