// What a shared session says: the summary behind the "Share" page, its
// picture and its PDF. Pure, so the page and the picture can't disagree and
// the rules are testable.
//
// Deliberately never includes the skier's name (the owner's choice: pictures
// may show children's waxing on Facebook), nor the skis, nor anything that
// would identify the account. Notes appear only when the sharer ticks them.

import { HUMIDITY_LABELS, LAYER_ROLE_LABELS, SNOW_TYPE_LABELS } from "@/lib/catalogue/labels";
import type { HumidityBand, LayerRole, SnowType } from "@/lib/catalogue/vocab";
import { TECHNIQUE_LABELS } from "@/lib/skis/input";
import { DEBRIS_LABELS, KICK_FEEL_LABELS, MODE_LABELS, RATING_WORDS, type Debris } from "./vocab";
import type { Session } from "./load";

export type ShareInput = {
  occurred_at: string;
  technique: "classic" | "skate";
  mode: "recreational" | "race";
  /** The skis' grip type (classic only): waxable, skin, zero or hairies. The skis themselves are never named. */
  grip_type?: string | null;
  event_name: string | null;
  event_distance_km: number | null;
  event_result: string | null;
  glide_rating: number | null;
  grip_rating: number | null;
  durability_rating: number | null;
  kick_feel: "slipping" | "good" | "icing" | null;
  notes: string | null;
  finish_notes: string | null;
  venue: { name: string } | null;
  conditions: {
    snow_temp_c: number | null;
    air_temp_c: number | null;
    snow_type: string | null;
    snow_humidity_band: string | null;
    /** Optional so a forecast (which never has it) still fits. */
    debris?: string | null;
  } | null;
  layers: {
    zone: "glide" | "grip";
    position: number;
    layer_role: string | null;
    custom_product: string | null;
    product: { name: string; brand: { name: string } | null } | null;
  }[];
};

export type ShareSummary = {
  /** "Race · 10 km" or "Classic"; the line above the venue. */
  kicker: string;
  /** The event, or else the venue, or "Ski session". */
  title: string;
  /** The venue, when the title is the event's name. */
  place: string | null;
  date: string;
  result: string | null;
  /** "Snow −5 °C", "Air −3 °C", the snow type, "Snow humidity: dry", "Debris: needles". */
  conditions: string[];
  glide: { role: string; wax: string }[];
  grip: { role: string; wax: string }[];
  /** "Glide: Good (4/5)" and so on. */
  ratings: string[];
  notes: string | null;
};

/** "−5 °C" with a true minus sign, which reads better in a picture. */
export function temp(n: number): string {
  const r = Math.round(n * 10) / 10;
  return `${r < 0 ? "−" : r > 0 ? "+" : ""}${Math.abs(r)} °C`;
}

export function shareDate(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

function waxes(layers: ShareInput["layers"], zone: "glide" | "grip") {
  return layers
    .filter((l) => l.zone === zone && l.layer_role !== "cleaning")
    .sort((a, b) => a.position - b.position)
    .map((l) => ({
      role: l.layer_role ? (LAYER_ROLE_LABELS[l.layer_role as LayerRole] ?? l.layer_role) : "Layer",
      wax: l.product ? [l.product.brand?.name, l.product.name].filter(Boolean).join(" ") : (l.custom_product ?? ""),
    }))
    .filter((w) => w.wax);
}

function rating(label: string, n: number | null): string | null {
  return n ? `${label}: ${RATING_WORDS[n]} (${n}/5)` : null;
}

/** The grip type as a share says it: short, for the line above the title. */
const GRIP_WORDS: Record<string, string> = { waxable: "waxable", skin: "skins", zero: "zero skis", hairies: "hairies" };

export function shareSummary(s: ShareInput, opts: { notes: boolean; timeZone: string }): ShareSummary {
  const race = s.mode === "race";
  const kicker = [
    TECHNIQUE_LABELS[s.technique],
    s.technique === "classic" && s.grip_type ? `Grip: ${GRIP_WORDS[s.grip_type] ?? s.grip_type}` : null,
    race ? MODE_LABELS.race : null,
    race && s.event_distance_km ? `${Number(s.event_distance_km)} km` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const venue = s.venue?.name ?? null;
  const title = s.event_name ?? venue ?? "Ski session";
  const c = s.conditions;
  const conditions = c
    ? [
        c.snow_temp_c !== null ? `Snow ${temp(Number(c.snow_temp_c))}` : null,
        c.air_temp_c !== null ? `Air ${temp(Number(c.air_temp_c))}` : null,
        c.snow_type ? (SNOW_TYPE_LABELS[c.snow_type as SnowType] ?? null) : null,
        c.snow_humidity_band
          ? `Snow humidity: ${(HUMIDITY_LABELS[c.snow_humidity_band as HumidityBand] ?? c.snow_humidity_band).toLowerCase()}`
          : null,
        // Recorded on the day; "None" is worth saying too.
        c.debris
          ? c.debris === "none"
            ? "No debris"
            : `Debris: ${(DEBRIS_LABELS[c.debris as Debris] ?? c.debris).toLowerCase()}`
          : null,
      ].filter((x): x is string => Boolean(x))
    : [];
  const ratings = [
    rating("Glide", s.glide_rating),
    s.technique === "classic" ? rating("Grip", s.grip_rating) : null,
    rating("Lasted", s.durability_rating),
    s.technique === "classic" && s.kick_feel ? `Kick: ${KICK_FEEL_LABELS[s.kick_feel].toLowerCase()}` : null,
  ].filter((x): x is string => Boolean(x));
  const notes = opts.notes
    ? [s.notes, s.finish_notes].map((n) => n?.trim()).filter(Boolean).join("\n\n") || null
    : null;
  return {
    kicker,
    title,
    place: s.event_name ? venue : null,
    date: shareDate(s.occurred_at, opts.timeZone),
    result: race ? (s.event_result?.trim() || null) : null,
    conditions,
    glide: waxes(s.layers, "glide"),
    grip: s.technique === "classic" ? waxes(s.layers, "grip") : [],
    ratings,
    notes,
  };
}

/** A file name for the picture: "wax-2026-11-15-canmore-nordic-centre.png". */
export function shareFilename(s: ShareInput, timeZone: string, ext: "png" | "pdf"): string {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(s.occurred_at),
  );
  const slug = (s.event_name ?? s.venue?.name ?? "session")
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "-")
    .slice(0, 40)
    .replace(/-$/, "");
  return `wax-${day}-${slug || "session"}.${ext}`;
}

/** The loaded session, cut down to what a share may say. Actual conditions win over the forecast. */
export function toShareInput(s: Session): ShareInput {
  return {
    occurred_at: s.occurred_at,
    technique: s.technique as ShareInput["technique"],
    mode: s.mode,
    grip_type: s.ski?.category ?? null,
    event_name: s.event_name,
    event_distance_km: s.event_distance_km,
    event_result: s.event_result,
    glide_rating: s.glide_rating,
    grip_rating: s.grip_rating,
    durability_rating: s.durability_rating,
    kick_feel: s.kick_feel,
    notes: s.notes,
    finish_notes: s.finish_notes,
    venue: s.venue,
    conditions: s.actual ?? s.forecast,
    layers: s.layers,
  };
}
