import { test } from "node:test";
import assert from "node:assert/strict";
import { airHumidityBand, estimateSnowTemp, guessSnowHumidity, guessSnowType, type Hour } from "./snow";
import { skyOf, summarise, venueNow, type Venue } from "./forecast";

const hour = (time: string, temp_c: number, more: Partial<Hour> = {}): Hour => ({
  time,
  temp_c,
  rh_pct: 70,
  snowfall_cm: 0,
  rain_mm: 0,
  cloud_pct: 100,
  wind_kmh: 5,
  weather_code: 3,
  is_day: true,
  ...more,
});

test("air humidity bands follow the spec", () => {
  assert.equal(airHumidityBand(45), "dry");
  assert.equal(airHumidityBand(80), "mid");
  assert.equal(airHumidityBand(81), "wet");
});

test("snow is never warmer than 0 °C", () => {
  assert.equal(estimateSnowTemp(hour("2026-11-15T13:00", 6), -2), 0);
  assert.equal(estimateSnowTemp(hour("2026-11-15T13:00", 0.5), -2), 0);
});

test("a clear early morning runs colder than the air; cloud does not", () => {
  const clear = estimateSnowTemp(hour("2026-11-15T08:00", -5, { cloud_pct: 0 }), -5);
  const cloudy = estimateSnowTemp(hour("2026-11-15T08:00", -5, { cloud_pct: 100 }), -5);
  assert.equal(cloudy, -5);
  assert.equal(clear, -8);
});

test("a cold night keeps the snow colder than a milder morning", () => {
  assert.ok(estimateSnowTemp(hour("2026-11-15T11:00", -4), -16) < -4);
});

test("snowball and snow type guesses", () => {
  assert.equal(guessSnowHumidity(-12, 50, false), "dry");
  assert.equal(guessSnowHumidity(-4, 70, false), "mid");
  assert.equal(guessSnowHumidity(-1, 90, false), "wet");
  assert.equal(guessSnowType({ newSnow24h: 8, fallingNow: false, maxTemp48h: -5, snowTemp: -8, rainedRecently: false }), "falling");
  assert.equal(guessSnowType({ newSnow24h: 0, fallingNow: false, maxTemp48h: 4, snowTemp: -6, rainedRecently: false }), "icy");
  assert.equal(guessSnowType({ newSnow24h: 0, fallingNow: false, maxTemp48h: -6, snowTemp: -10, rainedRecently: false }), "fine_grained");
});

test("sky from weather codes and cloud", () => {
  assert.equal(skyOf([hour("t", -5, { weather_code: 73 })]), "snowing");
  assert.equal(skyOf([hour("t", -5, { weather_code: 0, cloud_pct: 5 })]), "sun");
});

test("a session window at Lake Louise, read in venue time", () => {
  const venue: Venue = { id: "v", name: "Lake Louise", latitude: 51.42, longitude: -116.18, elevation_m: 1540 };
  const hours: Hour[] = [];
  for (let h = 0; h < 24; h++) {
    const time = `2026-11-15T${String(h).padStart(2, "0")}:00`;
    hours.push(hour(time, h < 8 ? -14 : -6, { snowfall_cm: h === 3 ? 2 : 0 }));
  }
  const w = summarise(hours, venue, { utc_offset_seconds: -7 * 3600, timezone: "America/Edmonton", elevation: 1540 }, "2026-11-15T11:30", 3);
  assert.equal(w.start, "2026-11-15T11:00");
  assert.equal(w.startIso, "2026-11-15T18:00:00.000Z");
  assert.equal(w.hours.length, 3);
  assert.equal(w.overnight_low_c, -14);
  assert.equal(w.new_snow_cm, 2);
  assert.equal(w.air_temp_c, -6);
  assert.ok(w.snow_temp_c < -6, "the cold night pulls the snow below the air");
  assert.equal(w.snow_type, "fresh_set");
  assert.throws(() => summarise(hours, venue, { utc_offset_seconds: 0, timezone: "UTC", elevation: 0 }, "2026-11-30T10:00", 2));
});

test("venue time comes from the venue's offset, not the phone's", () => {
  // 17:20 UTC is 10:20 in the Rockies; the next whole hour is 11:00.
  assert.deepEqual(venueNow(-7 * 3600, new Date("2026-11-15T17:20:00Z")), { date: "2026-11-15", hour: "11:00" });
});
