import { test } from "node:test";
import assert from "node:assert/strict";
import { shareFilename, shareSummary, temp, type ShareInput } from "./share";

const base: ShareInput = {
  occurred_at: "2026-11-15T18:57:00Z",
  technique: "classic",
  mode: "recreational",
  event_name: null,
  event_distance_km: null,
  event_result: null,
  glide_rating: 4,
  grip_rating: 5,
  durability_rating: null,
  kick_feel: "good",
  notes: "Private note about my kid",
  finish_notes: null,
  venue: { name: "Canmore Nordic Centre" },
  conditions: { snow_temp_c: -5, air_temp_c: -2.5, snow_type: "fine_grained", snow_humidity_band: "dry" },
  layers: [
    { zone: "glide", position: 1, layer_role: "cleaning", custom_product: "Base cleaner", product: null },
    { zone: "glide", position: 2, layer_role: "base", custom_product: null, product: { name: "V20 Green Hardwax", brand: { name: "Swix" } } },
    { zone: "grip", position: 1, layer_role: "kick", custom_product: null, product: { name: "Blue", brand: { name: "Rex" } } },
  ],
};

const tz = "Etc/GMT+7";

test("temperatures use a true minus sign", () => {
  assert.equal(temp(-5), "−5 °C");
  assert.equal(temp(2.25), "+2.3 °C");
  assert.equal(temp(0), "0 °C");
});

test("a recreational session is titled by its venue", () => {
  const s = shareSummary(base, { notes: false, timeZone: tz });
  assert.equal(s.kicker, "Classic");
  assert.equal(s.title, "Canmore Nordic Centre");
  assert.equal(s.place, null);
  assert.equal(s.date, "Sunday, November 15, 2026");
  assert.deepEqual(s.conditions, ["Snow −5 °C", "Air −2.5 °C", "Fine-grained, older", "Snow humidity: dry"]);
  const withDebris = (debris: string) => shareSummary({ ...base, conditions: { ...base.conditions!, debris } }, { notes: false, timeZone: tz });
  assert.equal(withDebris("needles").conditions.at(-1), "Debris: needles");
  assert.equal(withDebris("none").conditions.at(-1), "No debris");
  assert.deepEqual(s.ratings, ["Glide: Good (4/5)", "Grip: Excellent (5/5)", "Kick: good"]);
});

test("cleaning is left out of the waxes", () => {
  const s = shareSummary(base, { notes: false, timeZone: tz });
  assert.deepEqual(s.glide, [{ role: "Base layer", wax: "Swix V20 Green Hardwax" }]);
  assert.deepEqual(s.grip, [{ role: "Kick layer", wax: "Rex Blue" }]);
});

test("notes appear only when asked for", () => {
  assert.equal(shareSummary(base, { notes: false, timeZone: tz }).notes, null);
  assert.equal(shareSummary(base, { notes: true, timeZone: tz }).notes, "Private note about my kid");
});

test("a race is titled by its event, with the venue, distance and result", () => {
  const s = shareSummary(
    { ...base, mode: "race", event_name: "Alberta Cup", event_distance_km: 10, event_result: " 3rd U16 " },
    { notes: false, timeZone: tz },
  );
  assert.equal(s.kicker, "Classic · Race · 10 km");
  assert.equal(s.title, "Alberta Cup");
  assert.equal(s.place, "Canmore Nordic Centre");
  assert.equal(s.result, "3rd U16");
});

test("skate shows no grip, kick or grip waxes", () => {
  const s = shareSummary({ ...base, technique: "skate", grip_rating: null, kick_feel: null }, { notes: false, timeZone: tz });
  assert.deepEqual(s.grip, []);
  assert.deepEqual(s.ratings, ["Glide: Good (4/5)"]);
});

test("the summary never carries a skier's name", () => {
  const withSkier = { ...base, skier: { name: "Ingrid" }, ski: { name: "Ingrid's race skis" } } as ShareInput;
  const text = JSON.stringify(shareSummary(withSkier, { notes: false, timeZone: tz }));
  assert.ok(!text.includes("Ingrid"));
});

test("file names are dated and tidy", () => {
  assert.equal(shareFilename(base, tz, "png"), "wax-2026-11-15-canmore-nordic-centre.png");
  assert.equal(shareFilename({ ...base, event_name: "Coupe de l'Été!", venue: null }, tz, "pdf"), "wax-2026-11-15-coupe-de-lete.pdf");
});

test("a classic share names the grip type, never the skis", () => {
  const s = shareSummary({ ...base, technique: "classic", grip_type: "skin" }, { notes: false, timeZone: tz });
  assert.equal(s.kicker, "Classic · Grip: skins");
  const skate = shareSummary({ ...base, technique: "skate", grip_type: "skin" }, { notes: false, timeZone: tz });
  assert.equal(skate.kicker, "Skate");
});
