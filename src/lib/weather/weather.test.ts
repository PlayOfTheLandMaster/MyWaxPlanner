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
  assert.equal(w.start, "2026-11-15T11:30", "the skier's own start time is kept");
  assert.equal(w.startIso, "2026-11-15T18:30:00.000Z");
  assert.equal(w.hours[0].time, "2026-11-15T11:00", "the forecast uses the hour it falls in");
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

import { anchorOf, assumedVariants, isSkiPlace, mergePlaces, searchVariants, viewboxAround, type Place } from "./forecast";

test("joined-up names are also searched with a space", () => {
  assert.deepEqual(searchVariants("Silverstar"), ["Silverstar", "Silver Star"]);
  assert.deepEqual(searchVariants("Sovereign Lake"), ["Sovereign Lake"]);
  assert.deepEqual(searchVariants("Canmore"), ["Canmore"]);
});

test("the same spot from both gazetteers is listed once, ski places first", () => {
  const p = (name: string, lat: number, kind: string | null, source: Place["source"], elevation_m: number | null = null): Place => ({
    name,
    detail: "",
    kind,
    latitude: lat,
    longitude: -119,
    elevation_m,
    source,
  });
  const merged = mergePlaces([
    [p("Vernon", 50.26, "City", "osm"), p("Sovereign Lake Nordic Centre", 50.35, "Nordic centre", "osm")],
    [p("Vernon", 50.2601, "Town", "geonames", 383)],
  ]);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].name, "Sovereign Lake Nordic Centre");
  assert.equal(merged[1].elevation_m, 383, "the elevation is taken from the duplicate");
});

test("each search also asks with the skiing words the skier left out", () => {
  assert.deepEqual(assumedVariants("Hinton"), ["Hinton Nordic", "Hinton Ski", "Hinton Resort"]);
  assert.deepEqual(assumedVariants("Hinton nordic"), ["Hinton nordic Ski", "Hinton nordic Resort"]);
  assert.deepEqual(assumedVariants("Canmore skiing trail"), ["Canmore skiing trail Nordic", "Canmore skiing trail Resort"]);
  assert.deepEqual(assumedVariants("  "), []);
});

test("the extra searches keep only skiing places", () => {
  assert.equal(isSkiPlace({ name: "Hinton Nordic Centre", kind: "Nordic centre" }), true);
  assert.equal(isSkiPlace({ name: "Beaver Boardwalk Trail", kind: null }), true);
  assert.equal(isSkiPlace({ name: "Marmot Basin", kind: "Ski area" }), true);
  assert.equal(isSkiPlace({ name: "Hinton", kind: "Town" }), false);
  assert.equal(isSkiPlace({ name: "Hinton Skate Park", kind: "Park" }), false);
});

test("a nearby search looks around a resort, else the first town found", () => {
  const at = (name: string, kind: string | null, lat = 49): Place => ({ name, kind, detail: "", latitude: lat, longitude: -117, elevation_m: null, source: "osm" });
  // OpenStreetMap's town (no kind) comes before GeoNames' hamlet of the same name in Norway.
  assert.equal(anchorOf([at("Rossland", null), at("Rossland", "Hamlet", 59)])?.latitude, 49);
  assert.equal(anchorOf([at("Red Mountain", "Peak")])?.name, "Red Mountain");
  // A downhill resort beats the peaks of the same name.
  assert.equal(anchorOf([at("Red Mountain", "Peak"), at("Red Mountain Resort", "Ski area")])?.name, "Red Mountain Resort");
  assert.equal(anchorOf([at("Black Jack Cross Country Ski Club", "Nordic centre"), at("Rossland", null)])?.name, "Rossland");
  assert.equal(anchorOf([]), null);
});

test("a water-ski club is not a ski place", () => {
  assert.equal(isSkiPlace({ name: "Fraser Valley Water Ski Club", kind: null }), false);
  assert.equal(isSkiPlace({ name: "Black Jack Cross Country Ski Club", kind: "Nordic centre" }), true);
});

test("the box around a town is about 40 km each way, west,north,east,south", () => {
  const [w, n, e, s] = viewboxAround({ latitude: 49, longitude: -117 }).split(",").map(Number);
  assert.ok(Math.abs(n - s - 0.72) < 0.01);
  assert.ok(w < -117 && e > -117 && e - w > n - s); // longitude degrees are shorter at 49°N
});
