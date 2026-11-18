import { test } from "node:test";
import assert from "node:assert/strict";
import { parseBrandsCsv, parseProductsCsv, readNumber, readProduct } from "./csv";
import type { TemperatureBasis } from "./vocab";

const basis = new Map<string, TemperatureBasis>([
  ["snowco", "snow"],
  ["airco", "air"],
]);

const HEADER =
  "brand,name,sku,category,form,published_temp_min_c,published_temp_max_c,snow_temp_min_c,snow_temp_max_c,snow_types,humidity_bands,fluoro_status,layer_roles,iron_temp_c,price,currency,buy_url,active";

test("brands: reads a valid file", () => {
  const { rows, errors } = parseBrandsCsv(
    "name,temperature_basis,website\nSnowCo,snow,https://snow.example\nAirCo,Air,\n",
  );
  assert.deepEqual(errors, []);
  assert.deepEqual(rows, [
    { name: "SnowCo", temperature_basis: "snow", website: "https://snow.example" },
    { name: "AirCo", temperature_basis: "air", website: null },
  ]);
});

test("brands: a duplicate name names the first line it appeared on", () => {
  const { errors } = parseBrandsCsv("name,temperature_basis\nSnowCo,snow\nsnowco,air\n");
  assert.deepEqual(errors, [{ line: 3, message: 'brand "snowco" is already on line 2' }]);
});

test("brands: an unknown basis is an error, not a default", () => {
  const { rows, errors } = parseBrandsCsv("name,temperature_basis\nSnowCo,both\n");
  assert.equal(rows.length, 0);
  assert.equal(errors[0].line, 2);
});

test("brands: a missing required column stops the file", () => {
  const { errors } = parseBrandsCsv("name,website\nSnowCo,\n");
  assert.match(errors[0].message, /temperature_basis/);
});

test("numbers: typographic minus signs and degree marks are read", () => {
  assert.equal(readNumber("–8"), -8); // en dash, as in the spec
  assert.equal(readNumber("−12"), -12); // U+2212 minus
  assert.equal(readNumber("-2.5 °C"), -2.5);
  assert.equal(readNumber("0,5"), 0.5);
  assert.equal(readNumber(""), null);
  assert.equal(readNumber("cold"), "invalid");
});

test("products: a full row from a snow-rated brand copies its range to snow temperature", () => {
  const { rows, errors, warnings } = parseProductsCsv(
    `${HEADER}\nSnowCo,Blue,SC-1,Hydrocarbon,block,–12,–6,,,fine_grained; Fresh Set,dry|mid,Fluoro-free,base;temperature,130,24.95,cad,https://snow.example/blue,yes\n`,
    basis,
  );
  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
  assert.deepEqual(rows[0], {
    brand: "SnowCo",
    name: "Blue",
    sku: "SC-1",
    category: "hydrocarbon",
    form: "block",
    published_temp_min_c: -12,
    published_temp_max_c: -6,
    temp_min_c: -12,
    temp_max_c: -6,
    old_published_temp_min_c: null,
    old_published_temp_max_c: null,
    old_temp_min_c: null,
    old_temp_max_c: null,
    snow_types: ["fine_grained", "fresh_set"],
    humidity_bands: ["dry", "mid"],
    fluoro_status: "fluoro_free",
    layer_roles: ["base", "temperature"],
    iron_temp_c: 130,
    price: 24.95,
    currency: "CAD",
    buy_url: "https://snow.example/blue",
    active: true,
  });
});

test("products: an air-rated brand's range is never treated as a snow range", () => {
  const { rows, warnings } = parseProductsCsv(
    "brand,name,category,published_temp_min_c,published_temp_max_c\nAirCo,Red,hardwax,-3,1\n",
    basis,
  );
  assert.equal(rows[0].published_temp_min_c, -3);
  assert.equal(rows[0].temp_min_c, null);
  assert.equal(rows[0].temp_max_c, null);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0].message, /air temperature/);
});

test("products: an air-rated brand keeps the snow range the CSV supplies", () => {
  const { rows, warnings } = parseProductsCsv(
    "brand,name,category,published_temp_min_c,published_temp_max_c,snow_temp_min_c,snow_temp_max_c\nAirCo,Red,hardwax,-3,1,-5,-1\n",
    basis,
  );
  assert.deepEqual(warnings, []);
  assert.equal(rows[0].temp_min_c, -5);
  assert.equal(rows[0].temp_max_c, -1);
});

test("products: only the required columns are required", () => {
  const { rows, errors } = parseProductsCsv("brand,name,category\nSnowCo,Cork,cork\n", basis);
  assert.deepEqual(errors, []);
  assert.equal(rows[0].fluoro_status, "unknown");
  assert.equal(rows[0].active, true);
  assert.deepEqual(rows[0].snow_types, []);
});

test("products: every problem on a row is reported, with its line, and the row is skipped", () => {
  const { rows, errors } = parseProductsCsv(
    "brand,name,category,published_temp_min_c,published_temp_max_c,snow_types,fluoro_status,iron_temp_c\n" +
      "SnowCo,Good,hardwax,,,,,\n" +
      "NoSuchBrand,Bad,glidey,-2,-8,slush,maybe,300\n",
    basis,
  );
  assert.equal(rows.length, 1);
  assert.ok(errors.every((e) => e.line === 3));
  const text = errors.map((e) => e.message).join("\n");
  assert.match(text, /NoSuchBrand/);
  assert.match(text, /category "glidey"/);
  assert.match(text, /runs backwards/);
  assert.match(text, /"slush"/);
  assert.match(text, /fluoro_status "maybe"/);
  assert.match(text, /iron_temp_c 300/);
});

test("products: the same product twice is an error, whatever the case", () => {
  const { errors } = parseProductsCsv(
    "brand,name,category\nSnowCo,Blue,hardwax\nsnowco,BLUE,hardwax\n",
    basis,
  );
  assert.deepEqual(errors, [{ line: 3, message: '"snowco BLUE" is already on line 2' }]);
});

test("products: a discontinued product is kept but marked inactive", () => {
  const { rows } = parseProductsCsv("brand,name,category,active\nSnowCo,Old,hardwax,discontinued\n", basis);
  assert.equal(rows[0].active, false);
});

test("products: headers are matched loosely and unknown columns are reported", () => {
  const { rows, warnings } = parseProductsCsv("Brand,Name,Category,Colour\nSnowCo,Blue,hardwax,blue\n", basis);
  assert.equal(rows.length, 1);
  assert.match(warnings[0].message, /colour/);
});

test("products: a quoted cell may contain commas", () => {
  const { rows } = parseProductsCsv('brand,name,category\nSnowCo,"Blue, Extra",hardwax\n', basis);
  assert.equal(rows[0].name, "Blue, Extra");
});

test("products: line numbers count from the header, skipping blank lines correctly", () => {
  const { errors } = parseProductsCsv("brand,name,category\nSnowCo,A,hardwax\n\nSnowCo,B,nope\n", basis);
  assert.equal(errors[0].line, 4);
});

test("products: a second range for old snow, copied for a snow-rated brand and kept apart for an air-rated one", () => {
  const snow = readProduct(
    { brand: "SnowCo", name: "Kick", category: "hardwax", published_temp_min_c: "-7", published_temp_max_c: "-1", old_published_temp_min_c: "-10", old_published_temp_max_c: "-3" },
    "snow",
  );
  assert.equal(snow.row?.old_temp_min_c, -10);
  assert.equal(snow.row?.old_temp_max_c, -3);
  const air = readProduct(
    { brand: "Swix", name: "VP45", category: "hardwax", published_temp_min_c: "-7", published_temp_max_c: "-1", old_published_temp_min_c: "-10", old_published_temp_max_c: "-3" },
    "air",
  );
  assert.equal(air.row?.old_temp_min_c, null);
  assert.equal(air.row?.old_published_temp_min_c, -10);
  assert.ok(air.warnings.some((w) => w.includes("old-snow range")));
  const backwards = readProduct({ brand: "SnowCo", name: "Kick", category: "hardwax", old_published_temp_min_c: "-3", old_published_temp_max_c: "-10" }, "snow");
  assert.ok(backwards.errors.some((e) => e.includes("runs backwards")));
});
