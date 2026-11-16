import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CSV_HEADERS,
  csvCell,
  csvFilename,
  dateAndTime,
  historyCsv,
  layerText,
  safeTimeZone,
  sessionRow,
  type ExportDetails,
  type ExportSession,
} from "./csv";

const session: ExportSession = {
  id: "s1",
  occurred_at: "2026-11-15T18:57:00Z",
  status: "completed",
  technique: "classic",
  mode: "recreational",
  skier_name: null,
  ski_name: "Fischer Speedmax",
  venue_name: "Canmore Nordic Centre",
  event_name: null,
  glide_rating: 4,
  grip_rating: 3,
  durability_rating: null,
  kick_feel: "good",
  snow_temp_c: -5,
  air_temp_c: -3.5,
  snow_type: "fine_grained",
  snow_humidity_band: "dry",
  air_humidity_band: null,
};

const details: ExportDetails = {
  event_result: null,
  notes: 'Fast, "really" fast',
  finish_notes: "=cmd()",
  layers: [
    { zone: "grip", position: 2, layer_role: "kick", custom_product: null, product: { name: "V40 Blue", brand: { name: "Swix" } } },
    { zone: "grip", position: 1, layer_role: "binder", custom_product: "Old binder", product: null },
    { zone: "glide", position: 1, layer_role: "base", custom_product: null, product: { name: "V20 Green Hardwax", brand: { name: "Swix" } } },
  ],
};

test("cells: numbers stay numbers, quotes and commas are quoted", () => {
  assert.equal(csvCell(-5), "-5");
  assert.equal(csvCell(null), "");
  assert.equal(csvCell("a,b"), '"a,b"');
  assert.equal(csvCell('say "hi"'), '"say ""hi"""');
  assert.equal(csvCell("two\nlines"), '"two\nlines"');
});

test("cells: text a spreadsheet would run as a formula is defused", () => {
  assert.equal(csvCell("=SUM(A1)"), "'=SUM(A1)");
  assert.equal(csvCell("+1"), "'+1");
  assert.equal(csvCell("-glazed"), "'-glazed");
  assert.equal(csvCell("@me"), "'@me");
  assert.equal(csvCell("plain"), "plain");
});

test("layers are listed per zone in prep order, with brand and role", () => {
  assert.equal(layerText(details.layers, "glide"), "Base layer: Swix V20 Green Hardwax");
  assert.equal(layerText(details.layers, "grip"), "Grip binder: Old binder; Kick layer: Swix V40 Blue");
  assert.equal(layerText([], "grip"), null);
});

test("dates are in the reader's time zone, 24-hour", () => {
  assert.deepEqual(dateAndTime("2026-11-15T18:57:00Z", "Etc/GMT+7"), ["2026-11-15", "11:57"]);
  assert.deepEqual(dateAndTime("2026-11-16T03:30:00Z", "Pacific/Honolulu"), ["2026-11-15", "17:30"]);
  assert.deepEqual(dateAndTime("2026-11-15T18:57:00Z", "UTC"), ["2026-11-15", "18:57"]);
});

test("an unknown time zone falls back to UTC", () => {
  assert.equal(safeTimeZone("Not/AZone"), "UTC");
  assert.equal(safeTimeZone(null), "UTC");
  assert.equal(safeTimeZone("Europe/Oslo"), "Europe/Oslo");
});

test("a row has one cell per header", () => {
  const row = sessionRow(session, details, "America/Edmonton");
  assert.equal(row.length, CSV_HEADERS.length);
  assert.equal(row[3], "Me");
  assert.equal(row[10], -5);
  assert.equal(row[11], -3.5);
});

test("a session with no details still exports", () => {
  const row = sessionRow(session, undefined, "UTC");
  assert.equal(row.length, CSV_HEADERS.length);
  assert.equal(row[15], null);
});

test("the file starts with a BOM and uses CRLF", () => {
  const csv = historyCsv([session], new Map([["s1", details]]), "America/Edmonton");
  assert.ok(csv.startsWith("﻿Date,Time,"));
  const lines = csv.slice(1).split("\r\n");
  assert.equal(lines.length, 3); // header, one row, trailing empty
  assert.ok(lines[1].includes('"Fast, ""really"" fast"'));
  assert.ok(lines[1].includes("'=cmd()"));
});

test("the file name carries the reader's date", () => {
  assert.equal(csvFilename(new Date("2026-11-16T03:30:00Z"), "Pacific/Honolulu"), "wax-history-2026-11-15.csv");
});
