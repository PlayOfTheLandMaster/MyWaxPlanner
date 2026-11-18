import { test } from "node:test";
import assert from "node:assert/strict";
import { learnTab } from "./tabs";

test("the tab comes from the address, Notes when it names none or a wrong one", () => {
  assert.equal(learnTab("videos"), "videos");
  assert.equal(learnTab("notes"), "notes");
  assert.equal(learnTab(undefined), "notes");
  assert.equal(learnTab("recipes"), "notes");
});
