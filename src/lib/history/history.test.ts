import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { localToIso, readSession, statusFor } from "./input";
import { parseFilters, periodRange, seasonOf, seasonRange, toQuery } from "./filters";
import { KICK_FEELS, METHODS, SKIES, TRACKS } from "./vocab";

const form = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};

const base = { technique: "classic", occurred_at: "2026-11-15T09:30", tz_offset: "420" };

test("a Calgary morning becomes the right moment", () => {
  // 09:30 in Calgary (UTC−7 in winter) is 16:30 UTC.
  assert.equal(localToIso("2026-11-15T09:30", "420"), "2026-11-15T16:30:00.000Z");
  assert.equal(localToIso("", "420"), null);
});

test("a classic race session with conditions and layers", () => {
  const { payload, error } = readSession(
    form({
      ...base,
      mode: "race",
      event_name: " Lake Louise Loppet ",
      event_distance_km: "30",
      venue_id: "new",
      new_venue_name: "Lake Louise",
      glide_rating: "4",
      grip_rating: "3",
      kick_feel: "good",
      snow_temp_c: "−6",
      air_rh_pct: "72",
      snow_type: "fine_grained",
      layers: JSON.stringify([
        { zone: "glide", layer_role: "base", custom_product: "Base wax", method: "iron", iron_temp_c: "130" },
        { zone: "grip", layer_role: "kick", custom_product: "Blue hardwax", method: "cork", passes: "3" },
        { zone: "glide", custom_product: "" },
      ]),
    }),
  );
  assert.equal(error, undefined);
  assert.equal(payload?.session.event_name, "Lake Louise Loppet");
  assert.equal(payload?.session.new_venue_name, "Lake Louise");
  assert.equal(payload?.session.venue_id, null);
  assert.equal(payload?.actual?.snow_temp_c, -6);
  assert.equal(payload?.layers.length, 2, "the empty row is skipped");
  assert.equal(payload?.layers[0].iron_temp_c, 130);
});

test("a skate session drops grip ratings and grip layers", () => {
  const { payload } = readSession(
    form({
      ...base,
      technique: "skate",
      grip_rating: "5",
      kick_feel: "icing",
      layers: JSON.stringify([{ zone: "grip", custom_product: "Klister" }]),
    }),
  );
  assert.equal(payload?.session.grip_rating, null);
  assert.equal(payload?.session.kick_feel, null);
  assert.equal(payload?.layers.length, 0);
  assert.equal(payload?.actual, null, "no conditions entered means none saved");
});

test("recreational sessions drop race details", () => {
  const { payload } = readSession(form({ ...base, mode: "recreational", event_name: "Loppet" }));
  assert.equal(payload?.session.event_name, null);
});

test("snow above freezing is refused with a clear message", () => {
  const { error } = readSession(form({ ...base, snow_temp_c: "2" }));
  assert.match(error ?? "", /Snow temperature/);
});

test("a new venue needs a name", () => {
  const { error } = readSession(form({ ...base, venue_id: "new" }));
  assert.match(error ?? "", /venue/);
});

test("seasons run August to July", () => {
  assert.equal(seasonOf(new Date("2026-11-15T00:00:00Z")), "2026-27");
  assert.equal(seasonOf(new Date("2027-03-01T00:00:00Z")), "2026-27");
  assert.equal(seasonOf(new Date("2026-07-31T00:00:00Z")), "2025-26");
  assert.deepEqual(seasonRange("2026-27"), { from: "2026-08-01T00:00:00Z", to: "2027-08-01T00:00:00Z" });
  assert.equal(seasonRange("2026-28"), null);
  assert.equal(periodRange("all", new Date()), null);
});

test("filters survive a round trip through the address bar and drop junk", () => {
  const f = parseFilters({ technique: "skate", glide: "4", tmin: "-10", tmax: "−5", ski: "not-an-id", sort: "glide" });
  assert.equal(f.technique, "skate");
  assert.equal(f.glide, 4);
  assert.equal(f.tmax, -5);
  assert.equal(f.ski, undefined);
  assert.equal(f.period, "season");
  assert.equal(toQuery(f), "?technique=skate&glide=4&tmin=-10&tmax=-5&sort=glide");
  assert.equal(toQuery(f, { glide: undefined, sort: "date" }), "?technique=skate&tmin=-10&tmax=-5");
});

test("history vocabularies match the database", () => {
  const sql = readFileSync(join(process.cwd(), "supabase/migrations/20261115000000_initial_schema.sql"), "utf8");
  const words = (marker: string) => {
    const start = sql.indexOf(marker);
    assert.ok(start >= 0, marker);
    const block = sql.slice(start + marker.length, sql.indexOf(")", start + marker.length));
    return [...block.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
  };
  assert.deepEqual(words("method text check (method in ("), [...METHODS]);
  assert.deepEqual(words("sky text check (sky in ("), [...SKIES]);
  assert.deepEqual(words("track text check (track in ("), [...TRACKS]);
  assert.deepEqual(words("create type public.kick_feel as enum ("), [...KICK_FEELS]);
});

test("whose skis: me, everyone, a skier, or unset (the skier picked on Today)", () => {
  assert.equal(parseFilters({ skier: "me" }).skier, "me");
  assert.equal(parseFilters({ skier: "all" }).skier, "all");
  assert.equal(parseFilters({ skier: "0b7c2c1e-1111-4222-8333-944455556666" }).skier, "0b7c2c1e-1111-4222-8333-944455556666");
  assert.equal(parseFilters({ skier: "nobody" }).skier, undefined);
  assert.equal(parseFilters({}).skier, undefined);
});

test("a session is done once it has any rating, and planned until then", () => {
  const none = { glide_rating: null, grip_rating: null, durability_rating: null, kick_feel: null };
  assert.equal(statusFor(none, null), "planned");
  assert.equal(statusFor({ ...none, glide_rating: 4 }, null), "completed");
  assert.equal(statusFor({ ...none, kick_feel: "good" }, "planned"), "completed");
  // Editing an older session that was already done, with no ratings, keeps it done.
  assert.equal(statusFor(none, "completed"), "completed");
  assert.equal(statusFor(none, "planned"), "planned");
});

test("the form's status no longer decides: ratings do", () => {
  const rated = readSession(form({ ...base, status: "planned", glide_rating: "5" }));
  assert.equal(rated.payload?.session.status, "completed");
  const unrated = readSession(form({ ...base }));
  assert.equal(unrated.payload?.session.status, "planned");
});
