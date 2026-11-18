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
  assert.equal(rangeText(wax("snow", [-12, -6], [-12, -6])), "−6 to −12 °C snow");
});

test("an air-rated wax with no snow range says so", () => {
  assert.equal(rangeText(wax("air", [-3, 1], [null, null])), "+1 to −3 °C air · no snow range yet");
});

test("an air-rated wax with a snow range shows the snow range", () => {
  assert.equal(rangeText(wax("air", [-3, 1], [-5, -1])), "−1 to −5 °C snow");
});

test("no range at all is nothing", () => {
  assert.equal(rangeText(wax("snow", [null, null], [null, null])), null);
});

test("a wax with an old-snow range names both", () => {
  const swix = { ...wax("air", [-7, -1], [-8, -2]), old_published_temp_min_c: -10, old_published_temp_max_c: -3, old_temp_min_c: -11, old_temp_max_c: -4 };
  assert.equal(rangeText(swix), "New snow −2 to −8 °C snow · Old snow −4 to −11 °C snow");
  const noSnow = { ...swix, old_temp_min_c: null, old_temp_max_c: null };
  assert.equal(rangeText(noSnow), "New snow −2 to −8 °C snow · Old snow −3 to −10 °C air · no snow range yet");
});
