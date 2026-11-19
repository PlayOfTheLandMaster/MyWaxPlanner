import { test } from "node:test";
import assert from "node:assert/strict";
import { likeToday, likeTodayRange, type PastJob } from "./like-today";

const job = (id: string, over: Partial<PastJob>): PastJob => ({
  id,
  occurred_at: "2026-01-10T10:00:00Z",
  venue_id: "canmore",
  venue_name: "Canmore",
  snow_temp_c: -3,
  snow_humidity_band: "mid",
  snow_type: "icy",
  glide_rating: null,
  ...over,
});
const today = { snow_temp_c: -3, snow_humidity_band: "mid", snow_type: "icy" };

test("only snow within 2 °C and the same snowball result", () => {
  const groups = likeToday(
    [job("a", {}), job("b", { snow_temp_c: -5 }), job("c", { snow_temp_c: -5.5 }), job("d", { snow_humidity_band: "wet" }), job("e", { snow_temp_c: null })],
    today,
  );
  assert.deepEqual(groups.flatMap((g) => g.jobs.map((j) => j.id)), ["a", "b"]);
});

test("grouped by location, the location with the closest match first, no location last", () => {
  const groups = likeToday(
    [
      job("far", { venue_id: "sovereign", venue_name: "Sovereign Lake", snow_temp_c: -4.5 }),
      job("none", { venue_id: null, venue_name: null }),
      job("near", { venue_id: "canmore", venue_name: "Canmore", snow_temp_c: -3.5 }),
      job("next", { venue_id: "sovereign", venue_name: "Sovereign Lake", snow_temp_c: -3 }),
    ],
    today,
  );
  assert.deepEqual(
    groups.map((g) => [g.name, g.jobs.map((j) => j.id)]),
    [
      ["Sovereign Lake", ["next", "far"]],
      ["Canmore", ["near"]],
      ["No location recorded", ["none"]],
    ],
  );
});

test("the same snow type ranks ahead, then the better glide", () => {
  const [g] = likeToday(
    [job("other", { snow_type: "transformed" }), job("ok", { glide_rating: 3 }), job("best", { glide_rating: 5 })],
    today,
  );
  assert.deepEqual(g.jobs.map((j) => [j.id, j.sameSnowType]), [["best", true], ["ok", true], ["other", false]]);
});

test("a venue deleted since keeps its name as its own group", () => {
  const groups = likeToday([job("x", { venue_id: null, venue_name: "Old Trail" })], today);
  assert.equal(groups[0].name, "Old Trail");
});

test("the database range never goes above 0 °C", () => {
  assert.deepEqual(likeTodayRange({ snow_temp_c: -1, snow_humidity_band: "wet", snow_type: null }), { tmin: -3, tmax: 0, snowhum: "wet" });
});
