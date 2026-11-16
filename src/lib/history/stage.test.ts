import { test } from "node:test";
import assert from "node:assert/strict";
import { stageOf } from "./stage";

const at = "2026-11-21T16:00:00.000Z"; // the session's start
const now = (iso: string) => new Date(iso);

test("before the start it is time to wax", () => {
  assert.equal(stageOf({ status: "planned", occurred_at: at }, now("2026-11-21T07:00:00Z")), "wax");
});

test("from the start, for three hours, the skier is out skiing", () => {
  assert.equal(stageOf({ status: "planned", occurred_at: at }, now("2026-11-21T16:00:00Z")), "ski");
  assert.equal(stageOf({ status: "planned", occurred_at: at }, now("2026-11-21T18:59:00Z")), "ski");
});

test("after that it is time to rate", () => {
  assert.equal(stageOf({ status: "planned", occurred_at: at }, now("2026-11-21T19:00:00Z")), "rate");
  assert.equal(stageOf({ status: "planned", occurred_at: at }, now("2026-12-30T12:00:00Z")), "rate");
});

test("a rated session is done whenever it was", () => {
  assert.equal(stageOf({ status: "completed", occurred_at: at }, now("2026-11-21T07:00:00Z")), "done");
});

test("an unreadable time is treated as not started yet", () => {
  assert.equal(stageOf({ status: "planned", occurred_at: "soon" }, now("2026-11-21T07:00:00Z")), "wax");
});
