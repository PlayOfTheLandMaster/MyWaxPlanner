import { test } from "node:test";
import assert from "node:assert/strict";
import { nextCard, setupSteps } from "./steps";

const fresh = { home: false, skis: 0, waxes: 0, tools: 0 };

test("nothing while the page's own step is still undone", () => {
  assert.equal(nextCard(setupSteps(fresh), "venue", true), null);
});

test("home venue set: next is the skis", () => {
  const c = nextCard(setupSteps({ ...fresh, home: true }), "venue", false);
  assert.ok(c && c.kind === "next");
  assert.equal(c.next.key, "skis");
  assert.equal(c.left, 3);
});

test("skips steps already done and wraps round to earlier ones", () => {
  const c = nextCard(
    setupSteps({ home: false, skis: 2, waxes: 1, tools: 0 }),
    "waxes",
    false,
  );
  assert.ok(c && c.kind === "next");
  assert.equal(c.next.key, "tools");
  const d = nextCard(
    setupSteps({ home: false, skis: 2, waxes: 1, tools: 3 }),
    "tools",
    false,
  );
  assert.ok(d && d.kind === "next");
  assert.equal(d.next.key, "venue");
});

test("all done: 'all set' only when opened from the checklist", () => {
  const all = setupSteps({ home: true, skis: 1, waxes: 1, tools: 1 });
  assert.deepEqual(nextCard(all, "tools", true), { kind: "finished" });
  assert.equal(nextCard(all, "tools", false), null);
});
