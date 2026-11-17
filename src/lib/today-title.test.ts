import { test } from "node:test";
import assert from "node:assert/strict";
import { todayDate } from "./today-title";

test("the title names the reader's day, not the server's", () => {
  // 03:00 UTC on 18 November is still the evening of the 17th in Calgary.
  const now = new Date("2026-11-18T03:00:00Z");
  assert.equal(todayDate(now, "America/Edmonton"), "Tuesday, November 17");
  assert.equal(todayDate(now, "Europe/Oslo"), "Wednesday, November 18");
});
