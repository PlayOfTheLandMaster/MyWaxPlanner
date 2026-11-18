import { test } from "node:test";
import assert from "node:assert/strict";
import { applySnowRanges, readIronTemp, readSnowRange } from "./snow-range";

const form = (min: string, max: string) => {
  const f = new FormData();
  f.set("snow_temp_min_c", min);
  f.set("snow_temp_max_c", max);
  return f;
};

test("reads a range, typographic minus signs included", () => {
  assert.deepEqual(readSnowRange(form("–8", "−2")).range, { temp_min_c: -8, temp_max_c: -2, old_temp_min_c: null, old_temp_max_c: null });
});

test("one end is enough", () => {
  assert.deepEqual(readSnowRange(form("", "0")).range, { temp_min_c: null, temp_max_c: 0, old_temp_min_c: null, old_temp_max_c: null });
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
  assert.deepEqual(out[0], { id: "a", temp_min_c: -8, temp_max_c: -2, snow_range_is_yours: true, iron_is_yours: false });
  assert.deepEqual(out[1], { id: "b", temp_min_c: -10, temp_max_c: -4, snow_range_is_yours: false, iron_is_yours: false });
});

test("the waxes passed in are not changed", () => {
  const waxes = [{ id: "a", temp_min_c: null, temp_max_c: null }];
  applySnowRanges(waxes, new Map([["a", { temp_min_c: -8, temp_max_c: -2 }]]));
  assert.equal(waxes[0].temp_min_c, null);
});

test("your own old-snow range is read, checked and applied", () => {
  const f = new FormData();
  f.set("snow_temp_min_c", "-8");
  f.set("snow_temp_max_c", "-2");
  f.set("old_snow_temp_min_c", "-10");
  f.set("old_snow_temp_max_c", "-3");
  const { range } = readSnowRange(f);
  assert.deepEqual(range, { temp_min_c: -8, temp_max_c: -2, old_temp_min_c: -10, old_temp_max_c: -3 });
  f.set("old_snow_temp_min_c", "-1");
  assert.match(readSnowRange(f).error ?? "", /old-snow range runs backwards/);
  const [w] = applySnowRanges([{ id: "a", temp_min_c: null as number | null, temp_max_c: null as number | null, old_temp_min_c: null as number | null }], new Map([["a", range!]]));
  assert.equal(w.old_temp_min_c, -10);
});

test("your iron temperature fills a gap and never replaces the maker's", () => {
  const ranges = new Map([
    ["gap", { temp_min_c: null, temp_max_c: null, iron_temp_c: 140 }],
    ["printed", { temp_min_c: null, temp_max_c: null, iron_temp_c: 140 }],
  ]);
  const [gap, printed] = applySnowRanges(
    [
      { id: "gap", temp_min_c: -10, temp_max_c: -4, iron_temp_c: null as number | null },
      { id: "printed", temp_min_c: -10, temp_max_c: -4, iron_temp_c: 150 as number | null },
    ],
    ranges,
  );
  assert.equal(gap.iron_temp_c, 140);
  assert.equal(gap.iron_is_yours, true);
  // A row holding only an iron temperature leaves the wax's own range alone.
  assert.equal(gap.temp_min_c, -10);
  assert.equal(gap.snow_range_is_yours, false);
  assert.equal(printed.iron_temp_c, 150);
  assert.equal(printed.iron_is_yours, false);
});

test("reads your iron temperature; blank clears it", () => {
  const f = (v: string) => {
    const d = new FormData();
    d.set("iron_temp_c", v);
    return d;
  };
  assert.equal(readIronTemp(f("135")).iron, 135);
  assert.equal(readIronTemp(f("")).iron, null);
  assert.match(readIronTemp(f("250")).error ?? "", /between 80 and 180/);
  assert.match(readIronTemp(f("hot")).error ?? "", /number/);
});
