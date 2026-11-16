// History as a spreadsheet: one row per session, in the order the History
// list shows them. Pure, so it can be tested; the download route fetches.

import { HUMIDITY_LABELS, LAYER_ROLE_LABELS, SNOW_TYPE_LABELS } from "@/lib/catalogue/labels";
import type { HumidityBand, LayerRole, SnowType } from "@/lib/catalogue/vocab";
import { TECHNIQUE_LABELS } from "@/lib/skis/input";
import { KICK_FEEL_LABELS, MODE_LABELS, STATUS_LABELS, type KickFeel, type Mode, type Status } from "./vocab";

export type ExportSession = {
  id: string;
  occurred_at: string;
  status: Status;
  technique: "classic" | "skate";
  mode: Mode;
  skier_name: string | null;
  ski_name: string | null;
  venue_name: string | null;
  event_name: string | null;
  glide_rating: number | null;
  grip_rating: number | null;
  durability_rating: number | null;
  kick_feel: KickFeel | null;
  snow_temp_c: number | null;
  air_temp_c: number | null;
  snow_type: SnowType | null;
  snow_humidity_band: HumidityBand | null;
  air_humidity_band: HumidityBand | null;
};

export type ExportDetails = {
  event_result: string | null;
  notes: string | null;
  finish_notes: string | null;
  layers: {
    zone: "glide" | "grip";
    position: number;
    layer_role: string | null;
    custom_product: string | null;
    product: { name: string; brand: { name: string } | null } | null;
  }[];
};

export const CSV_HEADERS = [
  "Date",
  "Time",
  "Status",
  "Skier",
  "Technique",
  "Mode",
  "Skis",
  "Venue",
  "Event",
  "Result",
  "Snow °C",
  "Air °C",
  "Snow type",
  "Snow humidity",
  "Air humidity",
  "Glide waxes",
  "Grip waxes",
  "Glide rating",
  "Grip rating",
  "Durability rating",
  "Kick feel",
  "Notes",
  "Finish notes",
] as const;

type Cell = string | number | null;

/**
 * One cell. Text a spreadsheet would read as a formula (=, +, -, @ at the
 * start) gets a leading apostrophe, so a note can never run as one; numbers
 * stay numbers, so "−5" snow sorts and charts properly.
 */
export function csvCell(value: Cell): string {
  if (value === null) return "";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  let text = value;
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function csvLine(cells: Cell[]): string {
  return cells.map(csvCell).join(",");
}

/** The layers of one zone, in prep order: "Base layer: Swix V20 Green Hardwax; Kick layer: …". */
export function layerText(layers: ExportDetails["layers"], zone: "glide" | "grip"): string | null {
  const parts = layers
    .filter((l) => l.zone === zone)
    .sort((a, b) => a.position - b.position)
    .map((l) => {
      const wax = l.product ? [l.product.brand?.name, l.product.name].filter(Boolean).join(" ") : l.custom_product;
      const role = l.layer_role ? (LAYER_ROLE_LABELS[l.layer_role as LayerRole] ?? l.layer_role) : null;
      if (!wax) return role;
      return role ? `${role}: ${wax}` : wax;
    })
    .filter((p): p is string => Boolean(p));
  return parts.length > 0 ? parts.join("; ") : null;
}

/** A valid IANA time zone, or UTC. */
export function safeTimeZone(tz: string | null | undefined): string {
  if (!tz) return "UTC";
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: tz });
    return tz;
  } catch {
    return "UTC";
  }
}

/** Date as 2026-11-15 and time as 11:57 (24-hour), in the reader's time zone. */
export function dateAndTime(iso: string, timeZone: string): [string, string] {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return [`${get("year")}-${get("month")}-${get("day")}`, `${get("hour")}:${get("minute")}`];
}

export function sessionRow(s: ExportSession, d: ExportDetails | undefined, timeZone: string, me = "Me"): Cell[] {
  const [date, time] = dateAndTime(s.occurred_at, timeZone);
  return [
    date,
    time,
    STATUS_LABELS[s.status] ?? s.status,
    s.skier_name ?? me,
    TECHNIQUE_LABELS[s.technique] ?? s.technique,
    MODE_LABELS[s.mode] ?? s.mode,
    s.ski_name,
    s.venue_name,
    s.event_name,
    d?.event_result ?? null,
    s.snow_temp_c === null ? null : Number(s.snow_temp_c),
    s.air_temp_c === null ? null : Number(s.air_temp_c),
    s.snow_type ? SNOW_TYPE_LABELS[s.snow_type] : null,
    s.snow_humidity_band ? HUMIDITY_LABELS[s.snow_humidity_band] : null,
    s.air_humidity_band ? HUMIDITY_LABELS[s.air_humidity_band] : null,
    d ? layerText(d.layers, "glide") : null,
    d ? layerText(d.layers, "grip") : null,
    s.glide_rating,
    s.grip_rating,
    s.durability_rating,
    s.kick_feel ? KICK_FEEL_LABELS[s.kick_feel] : null,
    d?.notes ?? null,
    d?.finish_notes ?? null,
  ];
}

/**
 * The whole file. Starts with a byte-order mark so Excel reads the accents
 * and "°" as UTF-8 (Numbers and Google Sheets do anyway), and uses CRLF line
 * ends, as the CSV standard asks.
 */
export function historyCsv(
  sessions: ExportSession[],
  details: Map<string, ExportDetails>,
  timeZone: string,
  me = "Me",
): string {
  const lines = [csvLine([...CSV_HEADERS]), ...sessions.map((s) => csvLine(sessionRow(s, details.get(s.id), timeZone, me)))];
  return `﻿${lines.join("\r\n")}\r\n`;
}

/** e.g. "wax-history-2026-11-15.csv", dated in the reader's time zone. */
export function csvFilename(now: Date, timeZone: string): string {
  return `wax-history-${dateAndTime(now.toISOString(), timeZone)[0]}.csv`;
}
