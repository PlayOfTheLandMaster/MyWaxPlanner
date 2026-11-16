import { test } from "node:test";
import assert from "node:assert/strict";
import { timerMinutes } from "./timer";

test("a single wait", () => {
  assert.equal(timerMinutes("Smooth it with your thumb, then let it set outside for 15 minutes."), 15);
  assert.equal(timerMinutes("Clean the base with Glide Wax Cleaner, then let it dry 10 minutes."), 10);
});

test("a range gives its longer end", () => {
  assert.equal(timerMinutes("Apply a thin, even coat; let it dry 10–15 minutes."), 15);
  assert.equal(timerMinutes("Let the skis cool to room temperature (15–20 minutes)."), 20);
  assert.equal(timerMinutes("cool 5-10 mins"), 10);
});

test("'or more' keeps the number given", () => {
  assert.equal(timerMinutes("Let the skis cool to room temperature (30 minutes or more)."), 30);
});

test("no minutes, no timer", () => {
  assert.equal(timerMinutes("Iron in a thin layer over the grip zone; let it cool fully."), null);
  assert.equal(timerMinutes("Brush with nylon, 10 passes."), null);
});
