import { test } from "node:test";
import assert from "node:assert/strict";
import { dayIn, readTodayVenue, todayVenueId } from "./today";

test("a venue picked today wins over home; tomorrow it is home again", () => {
  const picked = readTodayVenue({ venue_id: "shark", day: "2026-11-17" });
  assert.equal(todayVenueId(picked, "canmore", "2026-11-17"), "shark");
  assert.equal(todayVenueId(picked, "canmore", "2026-11-18"), "canmore");
  assert.equal(todayVenueId(null, "canmore", "2026-11-17"), "canmore");
});

test("damaged records are ignored", () => {
  assert.equal(readTodayVenue({ venue_id: "x" }), null);
  assert.equal(readTodayVenue("x"), null);
});

test("the day is the reader's own", () => {
  // 03:00 UTC is still the evening before in Calgary.
  assert.equal(dayIn(new Date("2026-11-18T03:00:00Z"), "America/Edmonton"), "2026-11-17");
});
