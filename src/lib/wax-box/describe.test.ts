import { test } from "node:test";
import assert from "node:assert/strict";
import { rangeText } from "./describe";

const wax = (basis: "air" | "snow", pub: [number | null, number | null], snow: [number | null, number | null]) => ({
  published_temp_min_c: pub[0],
  published_temp_max_c: pub[1],
  temp_min_c: snow[0],
  temp_max_c: snow[1],
  brand: { temperature_basis: basis },
});

test("a snow range is shown as a snow range", () => {
  assert.equal(rangeText(wax("snow", [-12, -6], [-12, -6])), "−12 to −6 °C snow");
});

test("an air-rated wax with no snow range says so", () => {
  assert.equal(rangeText(wax("air", [-3, 1], [null, null])), "−3 to +1 °C air · no snow range yet");
});

test("an air-rated wax with a snow range shows the snow range", () => {
  assert.equal(rangeText(wax("air", [-3, 1], [-5, -1])), "−5 to −1 °C snow");
});

test("no range at all is nothing", () => {
  assert.equal(rangeText(wax("snow", [null, null], [null, null])), null);
});
