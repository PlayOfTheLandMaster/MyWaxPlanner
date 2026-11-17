import { test } from "node:test";
import assert from "node:assert/strict";
import { checkFor, readSnowCheck, readSnowForm } from "./check";

const form = (f: Record<string, string>) => {
  const d = new FormData();
  for (const [k, v] of Object.entries(f)) d.set(k, v);
  return d;
};
const where = { day: "2026-11-17", venue_id: "v1" };
const now = new Date("2026-11-17T16:00:00Z");

test("a good form becomes a check for that venue and day", () => {
  const r = readSnowForm(form({ snow_temp_c: "−4,5", snow_humidity_band: "mid", snow_type: "fine_grained", track: "glazed" }), where, now);
  assert.ok("check" in r);
  assert.equal(r.check.snow_temp_c, -4.5);
  assert.equal(r.check.track, "glazed");
  assert.equal(r.check.day, "2026-11-17");
});

test("snow warmer than 0 °C, or a missing snowball answer, is refused", () => {
  assert.ok("error" in readSnowForm(form({ snow_temp_c: "2", snow_humidity_band: "mid", snow_type: "wet" }), where, now));
  assert.ok("error" in readSnowForm(form({ snow_temp_c: "-2", snow_type: "wet" }), where, now));
});

test("a check only counts for its own venue and day", () => {
  const r = readSnowForm(form({ snow_temp_c: "-4", snow_humidity_band: "dry", snow_type: "fine_grained" }), where, now);
  assert.ok("check" in r);
  const stored = readSnowCheck(JSON.parse(JSON.stringify(r.check)));
  assert.ok(stored);
  assert.ok(checkFor(stored, "v1", "2026-11-17"));
  assert.equal(checkFor(stored, "v1", "2026-11-18"), null);
  assert.equal(checkFor(stored, "v2", "2026-11-17"), null);
});

test("a damaged record reads as no check", () => {
  assert.equal(readSnowCheck({ day: "yesterday" }), null);
  assert.equal(readSnowCheck(null), null);
});
