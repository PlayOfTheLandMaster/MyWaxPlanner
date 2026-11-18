import { test } from "node:test";
import assert from "node:assert/strict";
import { brandLogoUrl, makerSite } from "./brand-logo";

test("a known maker is found however it is typed", () => {
  assert.equal(makerSite("Fischer"), "fischersports.com");
  assert.equal(makerSite("  fischer Speedmax "), "fischersports.com");
  assert.equal(makerSite("Åsnes"), "asnes.com");
  assert.equal(makerSite("Rossi"), "rossignol.com");
});

test("an unknown, blank or merely similar brand has no logo", () => {
  assert.equal(makerSite("My Custom Skis"), null);
  assert.equal(makerSite(""), null);
  assert.equal(makerSite(null), null);
  assert.equal(makerSite("Fischerman"), null);
  assert.equal(brandLogoUrl("Nobody"), null);
});

test("the logo comes from the maker's site", () => {
  assert.equal(brandLogoUrl("Madshus"), "https://www.google.com/s2/favicons?domain=madshus.com&sz=128");
});
