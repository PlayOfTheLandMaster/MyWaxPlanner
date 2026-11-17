import { test } from "node:test";
import assert from "node:assert/strict";
import { nextCard, progress, setupSteps } from "./steps";

const fresh = { home: false, skiers: 0, skis: 0, waxes: 0, tools: 0 };

test("nothing while the page's own step is still undone", () => {
  assert.equal(nextCard(setupSteps(fresh), "venue", true), null);
});

test("home venue set: next is skiers, optional, with a way past to the skis", () => {
  const c = nextCard(setupSteps({ ...fresh, home: true }), "venue", false);
  assert.ok(c && c.kind === "next");
  assert.equal(c.next.key, "skiers");
  assert.equal(c.skipTo?.key, "skis");
  assert.equal(c.left, 3);
});

test("skips steps already done and wraps round to earlier ones", () => {
  const c = nextCard(
    setupSteps({ ...fresh, skiers: 1, skis: 2, waxes: 1 }),
    "waxes",
    false,
  );
  assert.ok(c && c.kind === "next");
  assert.equal(c.next.key, "tools");
  assert.equal(c.skipTo, null);
  const d = nextCard(
    setupSteps({ ...fresh, skiers: 1, skis: 2, waxes: 1, tools: 3 }),
    "tools",
    false,
  );
  assert.ok(d && d.kind === "next");
  assert.equal(d.next.key, "venue");
});

test("no skiers is not unfinished: the checklist completes without them", () => {
  const steps = setupSteps({
    home: true,
    skiers: 0,
    skis: 1,
    waxes: 1,
    tools: 1,
  });
  assert.deepEqual(progress(steps), { done: 4, total: 4, todo: 0 });
  assert.deepEqual(nextCard(steps, "tools", true), { kind: "finished" });
  assert.equal(nextCard(steps, "tools", false), null);
});

test("adding a skier first still leads on to the required steps", () => {
  const c = nextCard(setupSteps({ ...fresh, skiers: 1 }), "skiers", true);
  assert.ok(c && c.kind === "next");
  assert.equal(c.next.key, "skis");
});
