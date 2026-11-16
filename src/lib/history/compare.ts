// Comparing sessions side by side: the rows of the table and which of them
// differ. Pure, so it is testable; the page loads the sessions.

import { HUMIDITY_LABELS, LAYER_ROLE_LABELS, SNOW_TYPE_LABELS } from "@/lib/catalogue/labels";
import type { HumidityBand, LayerRole, SnowType } from "@/lib/catalogue/vocab";
import { TECHNIQUE_LABELS } from "@/lib/skis/input";
import type { Session } from "./load";
import { temp } from "./share";
import { KICK_FEEL_LABELS, MODE_LABELS, SKY_LABELS, TRACK_LABELS, ZONE_ROLES, type Sky, type Track } from "./vocab";

export type CompareRow = {
  label: string;
  /** One value per session, in column order; null shows as a dash. */
  values: (string | null)[];
  /** The sessions disagree here, so it is worth a look. */
  differs: boolean;
};

export type CompareSection = { title: string; rows: CompareRow[] };

export const MAX_COMPARE = 4;

/** The session ids from the address: valid uuids, no repeats, at most four. */
export function parseCompareIds(raw: string | string[] | undefined): { ids: string[]; tooMany: boolean } {
  const list = (Array.isArray(raw) ? raw : raw ? [raw] : []).flatMap((v) => v.split(","));
  const ids = [...new Set(list.map((v) => v.trim()).filter((v) => /^[0-9a-f-]{36}$/i.test(v)))];
  return { ids: ids.slice(0, MAX_COMPARE), tooMany: ids.length > MAX_COMPARE };
}

function row(label: string, values: (string | null)[]): CompareRow {
  const filled = values.map((v) => (v === null || v === "" ? null : v));
  return { label, values: filled, differs: new Set(filled).size > 1 };
}

function waxName(l: Session["layers"][number]): string | null {
  if (l.product) return [l.product.brand?.name, l.product.name].filter(Boolean).join(" ");
  return l.custom_product;
}

/** One row per layer role used by any of the sessions, in prep order. */
function layerRows(sessions: Session[], zone: "glide" | "grip"): CompareRow[] {
  const used = new Set(sessions.flatMap((s) => s.layers.filter((l) => l.zone === zone).map((l) => l.layer_role ?? "")));
  const roles = [...ZONE_ROLES[zone].filter((r) => used.has(r)), ...(used.has("") ? [""] : [])];
  return roles.map((role) =>
    row(
      role ? (LAYER_ROLE_LABELS[role as LayerRole] ?? role) : "Other layer",
      sessions.map((s) => {
        const names = s.layers
          .filter((l) => l.zone === zone && (l.layer_role ?? "") === role)
          .sort((a, b) => a.position - b.position)
          .map(waxName)
          .filter(Boolean);
        return names.length ? names.join(" + ") : null;
      }),
    ),
  );
}

const rating = (n: number | null) => (n ? `${n}/5` : null);

export function compareSections(sessions: Session[], dateOf: (iso: string) => string): CompareSection[] {
  const cond = (s: Session) => s.actual ?? s.forecast;
  const forecastOnly = (s: Session) => !s.actual && Boolean(s.forecast);
  const anyClassic = sessions.some((s) => s.technique === "classic");

  const sections: CompareSection[] = [
    {
      title: "When and where",
      rows: [
        { ...row("Date", sessions.map((s) => dateOf(s.occurred_at))), differs: false },
        row("Venue", sessions.map((s) => s.venue?.name ?? null)),
        row("Skier", sessions.map((s) => s.skier?.name ?? "Me")),
        row("Skis", sessions.map((s) => s.ski?.name ?? null)),
        row("Technique", sessions.map((s) => TECHNIQUE_LABELS[s.technique as "classic"] ?? s.technique)),
        row("Kind", sessions.map((s) => MODE_LABELS[s.mode])),
        row("Event", sessions.map((s) => [s.event_name, s.event_result].filter(Boolean).join(" · ") || null)),
      ],
    },
    {
      title: "Conditions",
      rows: [
        row("Snow", sessions.map((s) => {
          const c = cond(s);
          if (c?.snow_temp_c == null) return null;
          return `${temp(Number(c.snow_temp_c))}${c.snow_temp_estimated ? " (est.)" : ""}${forecastOnly(s) ? " (forecast)" : ""}`;
        })),
        row("Air", sessions.map((s) => {
          const c = cond(s);
          return c?.air_temp_c == null ? null : `${temp(Number(c.air_temp_c))}${forecastOnly(s) ? " (forecast)" : ""}`;
        })),
        row("Snow type", sessions.map((s) => {
          const t = cond(s)?.snow_type;
          return t ? (SNOW_TYPE_LABELS[t as SnowType] ?? t) : null;
        })),
        row("Snow humidity", sessions.map((s) => {
          const h = cond(s)?.snow_humidity_band;
          return h ? (HUMIDITY_LABELS[h as HumidityBand] ?? h) : null;
        })),
        row("Air humidity", sessions.map((s) => {
          const c = cond(s);
          if (c?.air_rh_pct != null) return `${Math.round(Number(c.air_rh_pct))} %`;
          return c?.air_humidity_band ? (HUMIDITY_LABELS[c.air_humidity_band as HumidityBand] ?? c.air_humidity_band) : null;
        })),
        row("New snow", sessions.map((s) => {
          const n = cond(s)?.new_snow_cm;
          return n == null ? null : `${Number(n)} cm`;
        })),
        row("Sky", sessions.map((s) => {
          const k = cond(s)?.sky;
          return k ? (SKY_LABELS[k as Sky] ?? k) : null;
        })),
        row("Track", sessions.map((s) => {
          const t = cond(s)?.track;
          return t ? (TRACK_LABELS[t as Track] ?? t) : null;
        })),
      ],
    },
    { title: "Glide wax", rows: layerRows(sessions, "glide") },
    ...(anyClassic ? [{ title: "Grip wax", rows: layerRows(sessions, "grip") }] : []),
    {
      title: "How it went",
      rows: [
        row("Glide", sessions.map((s) => rating(s.glide_rating))),
        ...(anyClassic
          ? [
              row("Grip", sessions.map((s) => rating(s.grip_rating))),
              row("Kick", sessions.map((s) => (s.kick_feel ? KICK_FEEL_LABELS[s.kick_feel] : null))),
            ]
          : []),
        row("Lasted", sessions.map((s) => rating(s.durability_rating))),
        // Notes always differ; marking them would only add noise.
        { ...row("Notes", sessions.map((s) => [s.notes, s.finish_notes].map((n) => n?.trim()).filter(Boolean).join(" — ") || null)), differs: false },
      ],
    },
  ];

  // A row empty in every column says nothing; a section with no rows goes too.
  return sections
    .map((sec) => ({ ...sec, rows: sec.rows.filter((r) => r.values.some((v) => v !== null)) }))
    .filter((sec) => sec.rows.length > 0);
}
