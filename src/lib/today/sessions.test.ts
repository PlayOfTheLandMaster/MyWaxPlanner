import { test } from "node:test";
import assert from "node:assert/strict";
import { sortOpenSessions, stageOf, type OpenSession } from "./sessions";

const s = (id: string, occurred_at: string, more: Partial<OpenSession> = {}): OpenSession => ({
  id,
  occurred_at,
  technique: "classic",
  mode: "recreational",
  venue_name: null,
  event_name: null,
  waxed_at: null,
  done_at: null,
  ...more,
});

const now = new Date("2026-11-17T21:00:00Z");

test("every session not marked Done is active, earliest first", () => {
  const out = sortOpenSessions(
    [
      s("red", "2026-11-17T21:00:00Z", { waxed_at: "x" }),
      s("canmore", "2026-11-17T20:00:00Z"),
      s("done", "2026-11-17T19:01:00Z", { done_at: "y" }),
    ],
    now,
  );
  assert.deepEqual(
    out.active.map((r) => r.id),
    ["canmore", "red"],
  );
  assert.deepEqual(
    out.toRate.map((r) => r.id),
    ["done"],
  );
});

test("a session left open from long ago is asked to be rated, not shown as active", () => {
  const out = sortOpenSessions([s("old", "2026-11-15T18:00:00Z")], now);
  assert.equal(out.active.length, 0);
  assert.deepEqual(
    out.toRate.map((r) => r.id),
    ["old"],
  );
});

test("a later session today is still active", () => {
  assert.equal(sortOpenSessions([s("later", "2026-11-18T01:00:00Z")], now).active.length, 1);
});

test("to rate: newest three, and a count of the rest", () => {
  const rows = ["10", "11", "12", "13", "14"].map((d) => s(d, `2026-11-${d}T18:00:00Z`, { done_at: "x" }));
  const out = sortOpenSessions(rows, now);
  assert.deepEqual(
    out.toRate.map((r) => r.id),
    ["14", "13", "12"],
  );
  assert.equal(out.moreToRate, 2);
});

test("the stage says whether the skis are waxed", () => {
  assert.equal(stageOf({ waxed_at: null }), "Not waxed yet");
  assert.equal(stageOf({ waxed_at: "2026-11-17T20:00:00Z" }), "Waxed — ready to ski");
});
