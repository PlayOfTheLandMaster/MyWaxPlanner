// The catalogue's fixed vocabularies. The database enforces the same lists in
// CHECK constraints and enums (supabase/migrations/20261115000000_initial_schema.sql);
// vocab.test.ts reads that file and fails if the two disagree, so a value the
// seeder accepts can never be one the database refuses half-way through a load.

export const PRODUCT_CATEGORIES = [
  // glide
  "base_prep",
  "hydrocarbon",
  "synthetic",
  "liquid_glider",
  "paste_glider",
  "powder",
  "top_coat",
  // grip
  "hardwax",
  "klister",
  "binder",
  "grip_spray",
  "skin_care",
  // solvents and cleaners
  "base_cleaner",
  "wax_remover",
  "fluoro_remover",
  "skin_cleaner",
  "citrus_solvent",
  // consumables
  "fibertex",
  "fiberlene",
  "cork",
  "sandpaper",
  "structure_insert",
] as const;

export const PRODUCT_FORMS = [
  "block",
  "liquid",
  "spray",
  "paste",
  "powder",
  "tube",
  "gel",
  "sheet",
  "roll",
  "insert",
  "other",
] as const;

export const SNOW_TYPES = [
  "falling",
  "fresh_set",
  "fine_grained",
  "transformed",
  "icy",
  "wet",
  "dirty",
  "man_made",
] as const;

export const LAYER_ROLES = [
  "cleaning",
  "base",
  "temperature",
  "top_coat",
  "powder",
  "binder",
  "kick",
  "cover",
  "skin_care",
  "finish",
] as const;

export const HUMIDITY_BANDS = ["dry", "mid", "wet"] as const;
export const FLUORO_STATUSES = ["fluoro_free", "low", "high", "unknown"] as const;
export const TEMPERATURE_BASES = ["air", "snow"] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];
export type ProductForm = (typeof PRODUCT_FORMS)[number];
export type SnowType = (typeof SNOW_TYPES)[number];
export type LayerRole = (typeof LAYER_ROLES)[number];
export type HumidityBand = (typeof HUMIDITY_BANDS)[number];
export type FluoroStatus = (typeof FLUORO_STATUSES)[number];
export type TemperatureBasis = (typeof TEMPERATURE_BASES)[number];
