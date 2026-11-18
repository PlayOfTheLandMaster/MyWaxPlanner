import { test } from "node:test";
import assert from "node:assert/strict";
import { afterRating, readRating } from "./rate";

const form = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};

test("a classic rating with everything filled in", () => {
  const { rating, error } = readRating(
    form({ glide_rating: "4", grip_rating: "3", kick_feel: "slipping", notes: "  Iced at the top  ", snow: "forecast", waxed: "planned" }),
    true,
  );
  assert.equal(error, undefined);
  assert.deepEqual(rating, {
    glide_rating: 4,
    grip_rating: 3,
    kick_feel: "slipping",
    notes: "Iced at the top",
    snow: "forecast",
    waxed: "planned",
  });
});

test("skate drops grip and kick, which the database refuses on skate", () => {
  const { rating } = readRating(form({ glide_rating: "5", grip_rating: "2", kick_feel: "good" }), false);
  assert.equal(rating?.grip_rating, null);
  assert.equal(rating?.kick_feel, null);
});

test("at least one rating is needed, because a rating is what makes the session done", () => {
  assert.match(readRating(form({ notes: "fine" }), false).error ?? "", /glide/);
  assert.match(readRating(form({}), true).error ?? "", /grip/);
  // Kick feel alone is enough for classic.
  assert.equal(readRating(form({ kick_feel: "good" }), true).error, undefined);
});

test("a rating outside 1 to 5 is refused", () => {
  assert.ok(readRating(form({ glide_rating: "7" }), false).error);
  assert.ok(readRating(form({ glide_rating: "2.5" }), false).error);
});

test("unknown answers to the two questions count as unanswered", () => {
  const { rating } = readRating(form({ glide_rating: "3", snow: "maybe", waxed: "sort of" }), false);
  assert.equal(rating?.snow, null);
  assert.equal(rating?.waxed, null);
});

test("after saving: back to the session, or to Today when opened from there", () => {
  assert.equal(afterRating("s1"), "/session/s1?saved=rated");
  assert.equal(afterRating("s1", "today"), "/?saved=rated");
});
