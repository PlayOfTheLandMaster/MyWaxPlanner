// Turns the catalogue CSVs into rows ready for the database, and says exactly
// which line is wrong when one is. Pure: no database, no files, so it can be
// tested and so `npm run seed -- --check` can run before any credentials exist.
//
// Nothing is guessed. A value the seeder cannot read is an error with its line
// number, never a quiet default, because a wrong temperature range in the
// catalogue turns into a wrong wax on race day.

import { parse } from "csv-parse/sync";
import {
  FLUORO_STATUSES,
  HUMIDITY_BANDS,
  LAYER_ROLES,
  PRODUCT_CATEGORIES,
  PRODUCT_FORMS,
  SNOW_TYPES,
  TEMPERATURE_BASES,
  type FluoroStatus,
  type HumidityBand,
  type LayerRole,
  type ProductCategory,
  type ProductForm,
  type SnowType,
  type TemperatureBasis,
} from "./vocab";

export type BrandRow = {
  name: string;
  temperature_basis: TemperatureBasis;
  website: string | null;
};

export type ProductRow = {
  brand: string; // matched to brands.name, case-insensitively
  name: string;
  sku: string | null;
  category: ProductCategory;
  form: ProductForm | null;
  published_temp_min_c: number | null;
  published_temp_max_c: number | null;
  temp_min_c: number | null;
  temp_max_c: number | null;
  /** A second range for old or transformed snow (e.g. Swix grip waxes), same shape as the first. */
  old_published_temp_min_c: number | null;
  old_published_temp_max_c: number | null;
  old_temp_min_c: number | null;
  old_temp_max_c: number | null;
  snow_types: SnowType[];
  humidity_bands: HumidityBand[];
  fluoro_status: FluoroStatus;
  layer_roles: LayerRole[];
  iron_temp_c: number | null;
  price: number | null;
  currency: string | null;
  buy_url: string | null;
  active: boolean;
};

export type Problem = { line: number; message: string };

export type Parsed<T> = { rows: T[]; errors: Problem[]; warnings: Problem[] };

export const BRAND_COLUMNS = ["name", "temperature_basis", "website"] as const;

export const PRODUCT_COLUMNS = [
  "brand",
  "name",
  "sku",
  "category",
  "form",
  "published_temp_min_c",
  "published_temp_max_c",
  "snow_temp_min_c",
  "snow_temp_max_c",
  "old_published_temp_min_c",
  "old_published_temp_max_c",
  "old_snow_temp_min_c",
  "old_snow_temp_max_c",
  "snow_types",
  "humidity_bands",
  "fluoro_status",
  "layer_roles",
  "iron_temp_c",
  "price",
  "currency",
  "buy_url",
  "active",
] as const;

const REQUIRED_BRAND_COLUMNS = ["name", "temperature_basis"];
const REQUIRED_PRODUCT_COLUMNS = ["brand", "name", "category"];

type Record = { [column: string]: string };

/** Reads CSV text into records keyed by lower-cased header, with line numbers. */
function readCsv(text: string): { records: { line: number; record: Record }[]; headers: string[] } {
  const rows = parse(text, {
    bom: true,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
    info: true,
  }) as unknown as { record: string[]; info: { lines: number } }[];

  if (rows.length === 0) return { records: [], headers: [] };

  const headers = rows[0].record.map((h) => normalizeHeader(h));
  const records = rows.slice(1).map(({ record, info }) => {
    const out: Record = {};
    headers.forEach((h, i) => {
      out[h] = record[i] ?? "";
    });
    return { line: info.lines, record: out };
  });
  return { records, headers };
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

/** "Fluoro-free", "fluoro free", "FLUORO_FREE" → "fluoro_free". */
function normalizeWord(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function missingColumns(headers: string[], required: string[]): string[] {
  return required.filter((c) => !headers.includes(c));
}

function unknownColumns(headers: string[], known: readonly string[]): string[] {
  return headers.filter((h) => h !== "" && !known.includes(h));
}

/**
 * A temperature in °C. Accepts the typographic minus (−) and en dash (–) that
 * brand sheets and this spec use for negative numbers, because "–8" pasted
 * from a PDF is not "-8" to parseFloat and would otherwise be an error on
 * nearly every row.
 */
export function readNumber(raw: string): number | null | "invalid" {
  const value = raw.trim().replace(/[−–‒—]/g, "-").replace(/\s*°\s*c?$/i, "");
  if (value === "") return null;
  if (!/^[+-]?\d+([.,]\d+)?$/.test(value)) return "invalid";
  return Number(value.replace(",", "."));
}

/** A list cell: "fine_grained; transformed" or "fine_grained|transformed". */
function readList<T extends string>(
  raw: string,
  allowed: readonly T[],
  column: string,
  errors: string[],
): T[] {
  if (raw.trim() === "") return [];
  const out: T[] = [];
  for (const part of raw.split(/[;|]/)) {
    const word = normalizeWord(part);
    if (word === "") continue;
    if ((allowed as readonly string[]).includes(word)) {
      if (!out.includes(word as T)) out.push(word as T);
    } else {
      errors.push(`${column}: "${part.trim()}" is not one of ${allowed.join(", ")}`);
    }
  }
  return out;
}

function readActive(raw: string): boolean | "invalid" {
  const v = normalizeWord(raw);
  if (v === "" || ["true", "yes", "y", "1", "active"].includes(v)) return true;
  if (["false", "no", "n", "0", "discontinued", "inactive"].includes(v)) return false;
  return "invalid";
}

function readFluoro(raw: string): FluoroStatus | "invalid" {
  const v = normalizeWord(raw);
  if (v === "") return "unknown";
  if (["fluoro_free", "ff", "pfas_free", "none", "no"].includes(v)) return "fluoro_free";
  if ((FLUORO_STATUSES as readonly string[]).includes(v)) return v as FluoroStatus;
  return "invalid";
}

function blankToNull(raw: string | undefined): string | null {
  const v = (raw ?? "").trim();
  return v === "" ? null : v;
}

export function parseBrandsCsv(text: string): Parsed<BrandRow> {
  const { records, headers } = readCsv(text);
  const errors: Problem[] = [];
  const warnings: Problem[] = [];

  const missing = missingColumns(headers, REQUIRED_BRAND_COLUMNS);
  if (missing.length > 0) {
    return { rows: [], errors: [{ line: 1, message: `missing column(s): ${missing.join(", ")}` }], warnings };
  }
  const unknown = unknownColumns(headers, BRAND_COLUMNS);
  if (unknown.length > 0) {
    warnings.push({ line: 1, message: `ignored column(s): ${unknown.join(", ")}` });
  }

  const rows: BrandRow[] = [];
  const seen = new Map<string, number>();
  for (const { line, record } of records) {
    const name = record.name.trim();
    if (name === "") {
      errors.push({ line, message: "name is empty" });
      continue;
    }
    const key = name.toLowerCase();
    if (seen.has(key)) {
      errors.push({ line, message: `brand "${name}" is already on line ${seen.get(key)}` });
      continue;
    }
    seen.set(key, line);

    const basis = normalizeWord(record.temperature_basis);
    if (!(TEMPERATURE_BASES as readonly string[]).includes(basis)) {
      errors.push({ line, message: `temperature_basis must be "air" or "snow", not "${record.temperature_basis}"` });
      continue;
    }
    rows.push({ name, temperature_basis: basis as TemperatureBasis, website: blankToNull(record.website) });
  }
  return { rows, errors, warnings };
}

export type ReadProduct = { row: ProductRow | null; errors: string[]; warnings: string[] };

/**
 * Checks one product, given as column name → text. Shared by the CSV loader
 * and the app's "Add a wax" form, so a wax typed in by hand is held to exactly
 * the rules a loaded one is.
 *
 * @param basis how the product's brand rates temperatures, or undefined when
 *   the brand is not known (the caller reports that; no snow range is derived).
 */
export function readProduct(
  record: { [column: string]: string },
  basis: TemperatureBasis | undefined,
): ReadProduct {
  const errors: string[] = [];
  const warnings: string[] = [];
  const get = (c: string) => record[c] ?? "";

  const brand = get("brand").trim();
  const name = get("name").trim();
  if (brand === "") errors.push("brand is empty");
  if (name === "") errors.push("name is empty");

  const category = normalizeWord(get("category"));
  if (!(PRODUCT_CATEGORIES as readonly string[]).includes(category)) {
    errors.push(`category "${get("category")}" is not one of ${PRODUCT_CATEGORIES.join(", ")}`);
  }

  const formRaw = normalizeWord(get("form"));
  if (formRaw !== "" && !(PRODUCT_FORMS as readonly string[]).includes(formRaw)) {
    errors.push(`form "${get("form")}" is not one of ${PRODUCT_FORMS.join(", ")}`);
  }

  const num = (column: string): number | null => {
    const v = readNumber(get(column));
    if (v === "invalid") {
      errors.push(`${column}: "${get(column)}" is not a number`);
      return null;
    }
    return v;
  };

  const pubMin = num("published_temp_min_c");
  const pubMax = num("published_temp_max_c");
  let snowMin = num("snow_temp_min_c");
  let snowMax = num("snow_temp_max_c");
  const oldPubMin = num("old_published_temp_min_c");
  const oldPubMax = num("old_published_temp_max_c");
  let oldSnowMin = num("old_snow_temp_min_c");
  let oldSnowMax = num("old_snow_temp_max_c");
  const iron = num("iron_temp_c");
  const price = num("price");

  if (pubMin !== null && pubMax !== null && pubMin > pubMax) {
    errors.push(`published range ${pubMin} to ${pubMax} °C runs backwards`);
  }
  if (snowMin !== null && snowMax !== null && snowMin > snowMax) {
    errors.push(`snow range ${snowMin} to ${snowMax} °C runs backwards`);
  }
  if (oldPubMin !== null && oldPubMax !== null && oldPubMin > oldPubMax) {
    errors.push(`old-snow range ${oldPubMin} to ${oldPubMax} °C runs backwards`);
  }
  if (oldSnowMin !== null && oldSnowMax !== null && oldSnowMin > oldSnowMax) {
    errors.push(`old-snow snow range ${oldSnowMin} to ${oldSnowMax} °C runs backwards`);
  }
  if (iron !== null && (iron < 80 || iron > 180)) {
    errors.push(`iron_temp_c ${iron} is outside 80–180 °C`);
  }
  if (price !== null && price < 0) {
    errors.push(`price ${price} is negative`);
  }

  // Normalizing to snow temperature. A snow-rated brand's published range
  // already is one. An air-rated brand's is not, and converting air to snow
  // depends on sun, humidity and the night before — so the snow range is
  // supplied or the product is left without one and named in a warning.
  // Recommendations will skip it until it has one, rather than compare an
  // air figure as if it were a snow figure.
  if (snowMin === null && snowMax === null && (pubMin !== null || pubMax !== null)) {
    if (basis === "snow") {
      snowMin = pubMin;
      snowMax = pubMax;
    } else if (basis === "air") {
      warnings.push(
        `"${brand} ${name}" is rated by air temperature and has no snow_temp range yet; it will not be recommended until it has one`,
      );
    }
  }

  // The old-snow range follows the same rule. An air-rated brand without its
  // snow version simply falls back to the first range on old snow.
  if (oldSnowMin === null && oldSnowMax === null && (oldPubMin !== null || oldPubMax !== null)) {
    if (basis === "snow") {
      oldSnowMin = oldPubMin;
      oldSnowMax = oldPubMax;
    } else if (basis === "air") {
      warnings.push(
        `"${brand} ${name}" has an old-snow range by air temperature but no old_snow_temp range; on old snow its first range is used`,
      );
    }
  }

  const snowTypes = readList(get("snow_types"), SNOW_TYPES, "snow_types", errors);
  const humidity = readList(get("humidity_bands"), HUMIDITY_BANDS, "humidity_bands", errors);
  const roles = readList(get("layer_roles"), LAYER_ROLES, "layer_roles", errors);

  const fluoro = readFluoro(get("fluoro_status"));
  if (fluoro === "invalid") {
    errors.push(`fluoro_status "${get("fluoro_status")}" is not one of fluoro_free, low, high, unknown`);
  }

  const active = readActive(get("active"));
  if (active === "invalid") {
    errors.push(`active "${get("active")}" should be yes or no`);
  }

  const currency = blankToNull(get("currency"))?.toUpperCase() ?? null;
  if (currency !== null && !/^[A-Z]{3}$/.test(currency)) {
    errors.push(`currency "${get("currency")}" should be a 3-letter code such as CAD`);
  }

  const buyUrl = blankToNull(get("buy_url"));
  if (buyUrl !== null && !/^https?:\/\//i.test(buyUrl)) {
    errors.push(`buy_url "${buyUrl}" should start with https://`);
  }

  if (errors.length > 0) return { row: null, errors, warnings };

  return {
    row: {
      brand,
      name,
      sku: blankToNull(get("sku")),
      category: category as ProductCategory,
      form: formRaw === "" ? null : (formRaw as ProductForm),
      published_temp_min_c: pubMin,
      published_temp_max_c: pubMax,
      temp_min_c: snowMin,
      temp_max_c: snowMax,
      old_published_temp_min_c: oldPubMin,
      old_published_temp_max_c: oldPubMax,
      old_temp_min_c: oldSnowMin,
      old_temp_max_c: oldSnowMax,
      snow_types: snowTypes,
      humidity_bands: humidity,
      fluoro_status: fluoro as FluoroStatus,
      layer_roles: roles,
      iron_temp_c: iron,
      price,
      currency,
      buy_url: buyUrl,
      active: active as boolean,
    },
    errors,
    warnings,
  };
}

/**
 * @param brandBasis lower-cased brand name → that brand's temperature basis.
 *   Every product's brand must be in it.
 */
export function parseProductsCsv(
  text: string,
  brandBasis: Map<string, TemperatureBasis>,
): Parsed<ProductRow> {
  const { records, headers } = readCsv(text);
  const errors: Problem[] = [];
  const warnings: Problem[] = [];

  const missing = missingColumns(headers, REQUIRED_PRODUCT_COLUMNS);
  if (missing.length > 0) {
    return { rows: [], errors: [{ line: 1, message: `missing column(s): ${missing.join(", ")}` }], warnings };
  }
  const unknown = unknownColumns(headers, PRODUCT_COLUMNS);
  if (unknown.length > 0) {
    warnings.push({ line: 1, message: `ignored column(s): ${unknown.join(", ")}` });
  }

  const rows: ProductRow[] = [];
  const seen = new Map<string, number>();

  for (const { line, record } of records) {
    const brand = (record.brand ?? "").trim();
    const name = (record.name ?? "").trim();
    const basis = brandBasis.get(brand.toLowerCase());
    const result = readProduct(record, basis);

    const lineErrors = [...result.errors];
    if (brand !== "" && !basis) {
      lineErrors.splice(0, 0, `brand "${brand}" is not in brands.csv or the database`);
    }
    if (brand !== "" && name !== "") {
      const key = `${brand.toLowerCase()}\u0000${name.toLowerCase()}`;
      if (seen.has(key)) {
        lineErrors.splice(0, 0, `"${brand} ${name}" is already on line ${seen.get(key)}`);
      } else {
        seen.set(key, line);
      }
    }

    for (const message of lineErrors) errors.push({ line, message });
    for (const message of result.warnings) warnings.push({ line, message });
    if (lineErrors.length === 0 && result.row) rows.push(result.row);
  }

  return { rows, errors, warnings };
}
