import { test } from "node:test";
import assert from "node:assert/strict";
import { nextCard, progress, setupSteps } from "./steps";

const fresh = {
  style: null,
  home: false,
  skiers: 0,
  skis: 0,
  waxes: 0,
  tools: 0,
} as const;

test("choosing how you wax comes first", () => {
  assert.equal(setupSteps(fresh)[0].key, "style");
});

test("nothing while the page's own step is still undone", () => {
  assert.equal(nextCard(setupSteps(fresh), "venue", true), null);
});

test("the count includes the optional step", () => {
  assert.deepEqual(progress(setupSteps({ ...fresh, style: "guided", home: true, skiers: 1, skis: 1 })), {
    done: 4,
    total: 6,
    todo: 2,
  });
});

test("home venue set: next is skiers, optional", () => {
  const c = nextCard(setupSteps({ ...fresh, style: "guided", home: true }), "venue", false);
  assert.ok(c && c.kind === "next");
  assert.equal(c.next.key, "skiers");
  assert.equal(c.left, 3);
});

test("skips steps already done and wraps round to earlier ones", () => {
  const c = nextCard(setupSteps({ ...fresh, style: "guided", skiers: 1, skis: 2, waxes: 1 }), "waxes", false);
  assert.ok(c && c.kind === "next");
  assert.equal(c.next.key, "tools");
  const d = nextCard(
    setupSteps({
      ...fresh,
      style: "guided",
      skiers: 1,
      skis: 2,
      waxes: 1,
      tools: 3,
    }),
    "tools",
    false,
  );
  assert.ok(d && d.kind === "next");
  assert.equal(d.next.key, "venue");
});

test("no skiers is not unfinished: the checklist completes without them", () => {
  const steps = setupSteps({
    style: "guided",
    home: true,
    skiers: 0,
    skis: 1,
    waxes: 1,
    tools: 1,
  });
  assert.equal(progress(steps).todo, 0);
  assert.deepEqual(nextCard(steps, "tools", true), { kind: "finished" });
  assert.equal(nextCard(steps, "tools", false), null);
});

test("an expert can finish without ticking tools", () => {
  const steps = setupSteps({
    style: "expert",
    home: true,
    skiers: 0,
    skis: 1,
    waxes: 1,
    tools: 0,
  });
  assert.equal(progress(steps).todo, 0);
  assert.deepEqual(nextCard(steps, "waxes", true), { kind: "finished" });
});

test("a guided waxer still needs tools", () => {
  assert.equal(
    progress(
      setupSteps({
        style: "guided",
        home: true,
        skiers: 0,
        skis: 1,
        waxes: 1,
        tools: 0,
      }),
    ).todo,
    1,
  );
});

test("adding a skier first still leads on to the required steps", () => {
  const c = nextCard(setupSteps({ ...fresh, style: "guided", skiers: 1 }), "skiers", true);
  assert.ok(c && c.kind === "next");
  assert.equal(c.next.key, "skis");
});
