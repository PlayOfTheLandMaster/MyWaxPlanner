import { test } from "node:test";
import assert from "node:assert/strict";
import { dayIn, splitByDay } from "./groups";

const now = new Date("2026-11-17T03:30:00Z"); // 20:30 on Nov 16 in UTC−7

test("today is the reader's day, not the server's", () => {
  assert.equal(dayIn(now, "UTC"), "2026-11-17");
  assert.equal(dayIn(now, "Etc/GMT+7"), "2026-11-16");
});

test("today and later are current, soonest first; earlier days are unrated, latest first", () => {
  const rows = [
    { id: "yesterday", occurred_at: "2026-11-15T18:00:00Z" },
    { id: "this-morning", occurred_at: "2026-11-16T17:00:00Z" },
    { id: "tomorrow", occurred_at: "2026-11-17T17:00:00Z" },
    { id: "last-week", occurred_at: "2026-11-09T18:00:00Z" },
  ];
  const { current, unrated } = splitByDay(rows, now, "Etc/GMT+7");
  assert.deepEqual(current.map((r) => r.id), ["this-morning", "tomorrow"]);
  assert.deepEqual(unrated.map((r) => r.id), ["yesterday", "last-week"]);
});

test("a session marked Done is unrated even on its own day", () => {
  const rows = [{ id: "done-today", occurred_at: "2026-11-16T17:00:00Z", done_at: "2026-11-16T20:00:00Z" }, { id: "today", occurred_at: "2026-11-16T18:00:00Z" }];
  const { current, unrated } = splitByDay(rows, now, "Etc/GMT+7");
  assert.deepEqual(current.map((r) => r.id), ["today"]);
  assert.deepEqual(unrated.map((r) => r.id), ["done-today"]);
});
