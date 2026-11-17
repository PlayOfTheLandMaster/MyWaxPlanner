import { test } from "node:test";
import assert from "node:assert/strict";
import { countryCode, inProvince, provinceName, provincesOf } from "./search-area";

test("countryCode accepts only listed countries", () => {
  assert.equal(countryCode("CA"), "ca");
  assert.equal(countryCode("no"), "no");
  assert.equal(countryCode("xx"), null);
  assert.equal(countryCode(undefined), null);
});

test("Canada and the US offer a list; other countries are typed", () => {
  assert.ok(provincesOf("ca").includes("British Columbia"));
  assert.ok(provincesOf("us").includes("Vermont"));
  assert.deepEqual(provincesOf("no"), []);
  assert.deepEqual(provincesOf(null), []);
});

test("provinceName spells out abbreviations", () => {
  assert.equal(provinceName("bc"), "British Columbia");
  assert.equal(provinceName(" Innlandet "), "Innlandet");
  assert.equal(provinceName(""), null);
});

test("inProvince matches whole words in the address, ignoring accents", () => {
  assert.equal(inProvince("Vernon, British Columbia, Canada", "British Columbia"), true);
  assert.equal(inProvince("Canmore, Alberta, Canada", "British Columbia"), false);
  assert.equal(inProvince("Québec, Canada", "Quebec"), true);
  assert.equal(inProvince("Washington, United States", "Wash"), false);
});
