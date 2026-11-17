import { test } from "node:test";
import assert from "node:assert/strict";
import { isExpert, readStyle } from "./style";

test("only the two known styles are read; anything else is not chosen", () => {
  assert.equal(readStyle("expert"), "expert");
  assert.equal(readStyle("guided"), "guided");
  assert.equal(readStyle("pro"), null);
  assert.equal(readStyle(null), null);
});

test("not chosen counts as guided", () => {
  assert.equal(isExpert(null), false);
  assert.equal(isExpert("expert"), true);
});
