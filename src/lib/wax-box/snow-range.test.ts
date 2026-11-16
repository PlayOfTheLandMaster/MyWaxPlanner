import { test } from "node:test";
import assert from "node:assert/strict";
import { applySnowRanges, readSnowRange } from "./snow-range";

const form = (min: string, max: string) => {
  const f = new FormData();
  f.set("snow_temp_min_c", min);
  f.set("snow_temp_max_c", max);
  return f;
};

test("reads a range, typographic minus signs included", () => {
  assert.deepEqual(readSnowRange(form("–8", "−2")).range, { temp_min_c: -8, temp_max_c: -2 });
});

test("one end is enough", () => {
  assert.deepEqual(readSnowRange(form("", "0")).range, { temp_min_c: null, temp_max_c: 0 });
});

test("refuses an empty, backwards, unreadable or out-of-range entry", () => {
  assert.match(readSnowRange(form("", "")).error ?? "", /at least one/);
  assert.match(readSnowRange(form("-2", "-8")).error ?? "", /backwards/);
  assert.match(readSnowRange(form("cold", "")).error ?? "", /temperature/);
  assert.match(readSnowRange(form("-60", "")).error ?? "", /between/);
});

test("the skier's range replaces the wax's own and is marked as theirs", () => {
  const waxes = [
    { id: "a", temp_min_c: null, temp_max_c: null },
    { id: "b", temp_min_c: -10, temp_max_c: -4 },
  ];
  const out = applySnowRanges(waxes, new Map([["a", { temp_min_c: -8, temp_max_c: -2 }]]));
  assert.deepEqual(out[0], { id: "a", temp_min_c: -8, temp_max_c: -2, snow_range_is_yours: true });
  assert.deepEqual(out[1], { id: "b", temp_min_c: -10, temp_max_c: -4, snow_range_is_yours: false });
});

test("the waxes passed in are not changed", () => {
  const waxes = [{ id: "a", temp_min_c: null, temp_max_c: null }];
  applySnowRanges(waxes, new Map([["a", { temp_min_c: -8, temp_max_c: -2 }]]));
  assert.equal(waxes[0].temp_min_c, null);
});
