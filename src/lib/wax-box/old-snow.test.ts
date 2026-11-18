import { test } from "node:test";
import assert from "node:assert/strict";
import { NEW_SNOW, OLD_SNOW, rangeFor } from "./old-snow";
import { SNOW_TYPES } from "@/lib/catalogue/vocab";

const swix = { temp_min_c: -7, temp_max_c: -1, old_temp_min_c: -10, old_temp_max_c: -3 };
const oneRange = { temp_min_c: -7, temp_max_c: -1 };

test("every snow type is either new or old", () => {
  assert.deepEqual([...NEW_SNOW, ...OLD_SNOW].sort(), [...SNOW_TYPES].sort());
  assert.ok(OLD_SNOW.includes("wet") && OLD_SNOW.includes("man_made"));
});

test("new snow uses the first range, old snow the second when there is one", () => {
  assert.deepEqual(rangeFor(swix, "falling"), { temp_min_c: -7, temp_max_c: -1, old: false });
  assert.deepEqual(rangeFor(swix, "transformed"), { temp_min_c: -10, temp_max_c: -3, old: true });
  assert.deepEqual(rangeFor(swix, null), { temp_min_c: -7, temp_max_c: -1, old: false });
  assert.deepEqual(rangeFor(oneRange, "icy"), { temp_min_c: -7, temp_max_c: -1, old: false });
});
