import { test } from "node:test";
import assert from "node:assert/strict";
import { todayTitle } from "./today-title";

test("the title names the reader's day, not the server's", () => {
  // 03:00 UTC on 18 November is still the evening of the 17th in Calgary.
  const now = new Date("2026-11-18T03:00:00Z");
  assert.equal(todayTitle(now, "America/Edmonton"), "Today - Tuesday, November 17");
  assert.equal(todayTitle(now, "Europe/Oslo"), "Today - Wednesday, November 18");
});
