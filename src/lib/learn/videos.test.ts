import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { formatTime, parseTime, parseYouTube, TOPICS } from "./videos";

test("YouTube links of every shape", () => {
  const id = "dQw4w9WgXcQ";
  assert.deepEqual(parseYouTube(`https://youtu.be/${id}?t=95`), { id, start: 95 });
  assert.deepEqual(parseYouTube(`https://www.youtube.com/watch?v=${id}&t=1m35s`), { id, start: 95 });
  assert.deepEqual(parseYouTube(`https://m.youtube.com/watch?v=${id}`), { id, start: 0 });
  assert.deepEqual(parseYouTube(`youtube.com/shorts/${id}`), { id, start: 0 });
  assert.deepEqual(parseYouTube(`https://www.youtube.com/embed/${id}?start=30`), { id, start: 30 });
  assert.deepEqual(parseYouTube(id), { id, start: 0 });
  assert.equal(parseYouTube("https://vimeo.com/12345"), null);
  assert.equal(parseYouTube("not a link"), null);
});

test("times", () => {
  assert.equal(parseTime("1:35"), 95);
  assert.equal(parseTime("1:02:03"), 3723);
  assert.equal(parseTime("2m"), 120);
  assert.equal(parseTime("abc"), null);
  assert.equal(formatTime(95), "1:35");
  assert.equal(formatTime(3723), "1:02:03");
});

test("topics match the database", () => {
  const sql = readFileSync(join(process.cwd(), "supabase/migrations/20261120000000_learn_videos.sql"), "utf8");
  const block = sql.slice(sql.indexOf("topic text not null check (topic in ("), sql.indexOf("))", sql.indexOf("topic text not null")));
  assert.deepEqual([...block.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]), [...TOPICS]);
});
