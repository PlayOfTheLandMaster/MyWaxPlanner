// What a waxing-session save may contain. The session form posts plain fields
// plus its layers as JSON; this turns them into the three arguments of the
// save_wax_session() database function, or a message a skier can act on.

import { HUMIDITY_BANDS, LAYER_ROLES, SNOW_TYPES } from "@/lib/catalogue/vocab";
import { TECHNIQUES } from "@/lib/skis/input";
import { DEBRIS, KICK_FEELS, METHODS, MODES, SKIES, STATUSES, TRACKS, ZONES, type Status, type Zone } from "./vocab";

export type LayerInput = {
  zone: Zone;
  layer_role: string | null;
  user_product_id: string | null;
  custom_product: string | null;
  method: string | null;
  iron_temp_c: number | null;
  passes: number | null;
  scrape_brush_steps: string | null;
  notes: string | null;
};

export type SessionPayload = {
  session: Record<string, unknown>;
  actual: Record<string, unknown> | null;
  layers: LayerInput[];
};

export type SessionResult = { payload: SessionPayload; error?: undefined } | { payload?: undefined; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const text = (v: unknown): string | null => {
  const s = typeof v === "string" ? v.trim().replace(/\s+/g, " ") : "";
  return s === "" ? null : s;
};

/** Multi-line text keeps its line breaks. */
const longText = (v: unknown): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? null : s;
};

const oneOf = <T extends string>(list: readonly T[], v: unknown): T | null => {
  const s = text(v);
  return s !== null && (list as readonly string[]).includes(s) ? (s as T) : null;
};

class Invalid extends Error {}

/** A number from a form field: commas and pasted minus signs are fine. */
function num(v: unknown, what: string, min: number, max: number, whole = false): number | null {
  const s = text(typeof v === "number" ? String(v) : v);
  if (s === null) return null;
  const n = Number(s.replace(",", ".").replace(/[−–]/g, "-"));
  if (!Number.isFinite(n) || n < min || n > max || (whole && !Number.isInteger(n))) {
    throw new Invalid(`${what} should be a number from ${min} to ${max}.`);
  }
  return whole ? n : Math.round(n * 10) / 10;
}

function id(v: unknown): string | null {
  const s = text(v);
  return s !== null && UUID.test(s) ? s : null;
}

/**
 * The date and time the skier picked (their own clock, from a
 * datetime-local field) as an exact moment. tz_offset is the browser's
 * Date.getTimezoneOffset(), in minutes: 420 in Calgary in winter.
 */
/**
 * A session is done once it has been rated: any of glide, grip, durability or
 * kick feel. Until then it stays as it was, and a new one starts as planned,
 * so Today can ask how it went. Nobody sets the status by hand any more; the
 * form carries the previous status in a hidden field only so that editing an
 * older, unrated session that was already done does not undo it.
 */
export function statusFor(
  r: { glide_rating: number | null; grip_rating: number | null; durability_rating: number | null; kick_feel: string | null },
  previous: Status | null,
): Status {
  if (r.glide_rating !== null || r.grip_rating !== null || r.durability_rating !== null || r.kick_feel !== null) {
    return "completed";
  }
  return previous ?? "planned";
}

export function localToIso(local: string | null, tzOffset: string | null): string | null {
  if (!local) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(local);
  if (!m) return null;
  const offset = Number(tzOffset ?? "0");
  const utc = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) + (Number.isFinite(offset) ? offset : 0) * 60_000;
  return new Date(utc).toISOString();
}

export function readSession(form: FormData): SessionResult {
  try {
    return { payload: read(form) };
  } catch (e) {
    if (e instanceof Invalid) return { error: e.message };
    throw e;
  }
}

function read(form: FormData): SessionPayload {
  const technique = oneOf(TECHNIQUES, form.get("technique"));
  if (!technique) throw new Invalid("Choose classic or skate.");
  const classic = technique === "classic";

  const occurredAt = localToIso(text(form.get("occurred_at")), text(form.get("tz_offset")));
  if (!occurredAt) throw new Invalid("Give the date and time you skied (or plan to).");

  const mode = oneOf(MODES, form.get("mode")) ?? "recreational";
  const race = mode === "race";

  const venueChoice = text(form.get("venue_id"));
  const newVenue = venueChoice === "new" ? text(form.get("new_venue_name")) : null;
  if (venueChoice === "new" && !newVenue) throw new Invalid("Type the new venue's name, or pick one from the list.");

  const rating = (field: string, what: string) => num(form.get(field), what, 1, 5, true);

  const session = {
    occurred_at: occurredAt,
    // Set from the ratings below (statusFor).
    status: "planned" as Status,
    technique,
    ski_id: id(form.get("ski_id")),
    mode,
    event_name: race ? text(form.get("event_name")) : null,
    event_distance_km: race ? num(form.get("event_distance_km"), "Race distance", 0.1, 500) : null,
    event_result: race ? text(form.get("event_result")) : null,
    venue_id: newVenue ? null : id(venueChoice),
    new_venue_name: newVenue,
    finish_notes: longText(form.get("finish_notes")),
    finish_tags: (text(form.get("finish_tags")) ?? "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    glide_rating: rating("glide_rating", "Glide rating"),
    // Grip is a classic-only idea; the database refuses it on skate sessions.
    grip_rating: classic ? rating("grip_rating", "Grip rating") : null,
    durability_rating: rating("durability_rating", "Durability rating"),
    durability_km: num(form.get("durability_km"), "Kilometres it lasted", 0, 2000),
    durability_hours: num(form.get("durability_hours"), "Hours it lasted", 0, 500),
    kick_feel: classic ? oneOf(KICK_FEELS, form.get("kick_feel")) : null,
    notes: longText(form.get("notes")),
  };
  session.status = statusFor(session, oneOf(STATUSES, form.get("status")));

  const snowTemp = num(form.get("snow_temp_c"), "Snow temperature", -40, 0);
  const actualFields = {
    air_temp_c: num(form.get("air_temp_c"), "Air temperature", -50, 30),
    snow_temp_c: snowTemp,
    air_rh_pct: num(form.get("air_rh_pct"), "Air humidity", 0, 100, true),
    snow_humidity_band: oneOf(HUMIDITY_BANDS, form.get("snow_humidity_band")),
    snow_type: oneOf(SNOW_TYPES, form.get("snow_type")),
    new_snow_cm: num(form.get("new_snow_cm"), "New snow", 0, 300),
    sky: oneOf(SKIES, form.get("sky")),
    wind_kmh: num(form.get("wind_kmh"), "Wind", 0, 200),
    debris: oneOf(DEBRIS, form.get("debris")),
    track: oneOf(TRACKS, form.get("track")),
  };
  const actual = Object.values(actualFields).some((v) => v !== null) ? actualFields : null;

  return { session, actual, layers: readLayers(form.get("layers"), classic) };
}

function readLayers(raw: FormDataEntryValue | null, classic: boolean): LayerInput[] {
  let list: unknown;
  try {
    list = JSON.parse(typeof raw === "string" && raw ? raw : "[]");
  } catch {
    throw new Invalid("The layers could not be read. Reload the page and try again.");
  }
  if (!Array.isArray(list)) throw new Invalid("The layers could not be read. Reload the page and try again.");
  if (list.length > 30) throw new Invalid("A session can have at most 30 layers.");

  const layers: LayerInput[] = [];
  list.forEach((item: Record<string, unknown>, i: number) => {
    const n = i + 1;
    const zone = oneOf(ZONES, item?.zone);
    if (!zone) throw new Invalid(`Layer ${n}: choose glide or grip.`);
    if (zone === "grip" && !classic) return; // a skate ski has no grip zone
    const userProduct = id(item.user_product_id);
    const custom = text(item.custom_product);
    // An empty row (nothing chosen, nothing typed) is just skipped.
    if (!userProduct && !custom) return;
    const ironed = oneOf(METHODS, item.method);
    layers.push({
      zone,
      layer_role: oneOf(LAYER_ROLES, item.layer_role),
      user_product_id: userProduct,
      custom_product: userProduct ? null : custom,
      method: ironed,
      iron_temp_c: num(item.iron_temp_c, `Layer ${n}: iron temperature`, 80, 180, true),
      passes: num(item.passes, `Layer ${n}: passes`, 0, 50, true),
      scrape_brush_steps: text(item.scrape_brush_steps),
      notes: text(item.notes),
    });
  });
  return layers;
}
