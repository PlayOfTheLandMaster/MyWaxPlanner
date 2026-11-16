import { test } from "node:test";
import assert from "node:assert/strict";
import { backLabel, isFormPage, previous, record } from "./trail";

const walk = (...urls: string[]) => urls.reduce<string[]>((t, u) => record(t, u), []);

test("Log a session from Today, then Cancel, goes back to Today", () => {
  const t = walk("/", "/history/new");
  assert.equal(previous(t, "/history/new"), "/");
});

test("Today → How did it go (edit) → Cancel goes back to Today", () => {
  const t = walk("/", "/history/abc/edit");
  assert.equal(previous(t, "/history/abc/edit"), "/");
});

test("after saving, back skips the form that was left", () => {
  const t = walk("/", "/history/new", "/history/xyz?saved=1");
  assert.equal(previous(t, "/history/xyz?saved=1"), "/");
});

test("filters update the page's entry instead of piling up", () => {
  const t = walk("/history", "/history?technique=skate", "/history?technique=skate&q=blue", "/history/1");
  assert.deepEqual(t, ["/history?technique=skate&q=blue", "/history/1"]);
  assert.equal(previous(t, "/history/1"), "/history?technique=skate&q=blue");
});

test("returning to a page cuts the trail there", () => {
  const t = walk("/", "/account", "/account/skiers/1", "/wax-box/skis/new?skier=1", "/account/skiers/1");
  assert.deepEqual(t, ["/", "/account", "/account/skiers/1"]);
  assert.equal(previous(t, "/account/skiers/1"), "/account");
});

test("a page not yet recorded looks back from the end", () => {
  assert.equal(previous(["/", "/wax-box"], "/wax-box/add"), "/wax-box");
});

test("nothing to go back to", () => {
  assert.equal(previous([], "/history/new"), null);
  assert.equal(previous(["/history/new"], "/history/new"), null);
});

test("form pages and labels", () => {
  assert.ok(isFormPage("/history/new"));
  assert.ok(isFormPage("/wax-box/1/edit?x=1"));
  assert.ok(isFormPage("/learn/add"));
  assert.ok(!isFormPage("/history/1"));
  assert.equal(backLabel("/?venue=1"), "Today");
  assert.equal(backLabel("/history?skier=me"), "History");
  assert.equal(backLabel("/history/1"), "Session");
  assert.equal(backLabel("/account/skiers/1"), "Skier");
  assert.equal(backLabel("/wax-box/skis?skier=me"), "Skis");
  assert.equal(backLabel("/wax-box/1"), "Wax");
});

test("labels for the newer pages", () => {
  assert.equal(backLabel("/history/compare?ids=1"), "Compare");
  assert.equal(backLabel("/history/insights"), "Insights");
  assert.equal(backLabel("/session/1/share"), "Share");
  assert.equal(backLabel("/session/1"), "Session");
  assert.equal(backLabel("/wax-box/tools"), "Tools");
  assert.equal(backLabel("/plan"), "Session");
  assert.equal(backLabel("/plan/draft?c=x"), "Plan");
});

test("wax-along is never a place to go back to", () => {
  const s = "/session/00000000-0000-0000-0000-000000000001";
  assert.ok(isFormPage(`${s}/wax`));
  assert.equal(previous(["/plan", s, `${s}/wax`, `${s}/share`], `${s}/share`), s);
});

test("after Use this plan, back from the session skips the plan step", () => {
  const s = "/session/00000000-0000-0000-0000-000000000001?saved=plan";
  assert.equal(previous(["/", "/plan", "/plan/draft?c=x&go=1", s], s), "/plan");
  // Anywhere else, the plan step is a normal place to go back to.
  assert.equal(previous(["/plan/draft?c=x&go=1", "/wax-box/1"], "/wax-box/1"), "/plan/draft?c=x&go=1");
});
