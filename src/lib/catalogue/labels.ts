// The words a person sees for each stored value. Stored values stay short and
// stable (they are in CHECK constraints); these can be reworded freely.

import type {
  FluoroStatus,
  HumidityBand,
  LayerRole,
  ProductCategory,
  ProductForm,
  SnowType,
} from "./vocab";

export const CATEGORY_GROUPS: { key: string; label: string; categories: ProductCategory[] }[] = [
  {
    key: "glide",
    label: "Glide",
    categories: ["base_prep", "hydrocarbon", "synthetic", "liquid_glider", "paste_glider", "powder", "top_coat"],
  },
  { key: "grip", label: "Grip", categories: ["hardwax", "klister", "binder", "grip_spray", "skin_care"] },
  {
    key: "solvent",
    label: "Cleaners and solvents",
    categories: ["base_cleaner", "wax_remover", "fluoro_remover", "skin_cleaner", "citrus_solvent"],
  },
  {
    key: "consumable",
    label: "Consumables",
    categories: ["fibertex", "fiberlene", "cork", "sandpaper", "structure_insert"],
  },
];

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  base_prep: "Base / prep wax",
  hydrocarbon: "Hydrocarbon (conventional) paraffin",
  synthetic: "Synthetic / fluoro-free performance wax",
  liquid_glider: "Liquid glider",
  paste_glider: "Paste glider",
  powder: "Powder",
  top_coat: "Top coat / spray",
  hardwax: "Hardwax",
  klister: "Klister",
  binder: "Binder (hardwax binder or base klister)",
  grip_spray: "Grip spray / liquid",
  skin_care: "Skin care (skin wax or spray)",
  base_cleaner: "Base cleaner",
  wax_remover: "Wax remover",
  fluoro_remover: "Fluoro remover",
  skin_cleaner: "Skin cleaner",
  citrus_solvent: "Citrus solvent",
  fibertex: "Fibertex",
  fiberlene: "Fiberlene",
  cork: "Cork",
  sandpaper: "Sandpaper",
  structure_insert: "Structure tool insert",
};

export const FORM_LABELS: Record<ProductForm, string> = {
  block: "Block / bar",
  liquid: "Liquid",
  spray: "Spray",
  paste: "Paste",
  powder: "Powder",
  tube: "Tube",
  gel: "Gel",
  sheet: "Sheet",
  roll: "Roll",
  insert: "Insert",
  other: "Other",
};

export const SNOW_TYPE_LABELS: Record<SnowType, string> = {
  falling: "Falling / fresh, covering the tracks",
  fresh_set: "Fresh, freshly set",
  fine_grained: "Fine-grained, older",
  transformed: "Transformed / coarse-grained",
  icy: "Icy / glazed",
  wet: "Wet / corn",
  dirty: "Dirty / pollen",
  man_made: "Man-made",
};

export const HUMIDITY_LABELS: Record<HumidityBand, string> = {
  dry: "Dry",
  mid: "Mid",
  wet: "Wet",
};

export const LAYER_ROLE_LABELS: Record<LayerRole, string> = {
  cleaning: "Cleaning",
  base: "Base layer",
  temperature: "Temperature wax",
  top_coat: "Top coat",
  powder: "Powder",
  binder: "Grip binder",
  kick: "Kick layer",
  cover: "Covering layer",
  skin_care: "Skin care",
  finish: "Finish",
};

export const FLUORO_LABELS: Record<FluoroStatus, string> = {
  fluoro_free: "Fluoro-free",
  low: "Low fluoro",
  high: "High fluoro",
  unknown: "Not sure",
};

export const AMOUNT_LABELS = {
  full: "Full",
  half: "Half",
  low: "Low",
  empty: "Empty",
} as const;

/** "−12 to −6 °C", "up to 0 °C", "from −4 °C", or null for no range. */
export function formatRange(min: number | null, max: number | null): string | null {
  const t = (n: number) => `${n > 0 ? "+" : ""}${n}`.replace("-", "−");
  if (min !== null && max !== null) return `${t(min)} to ${t(max)} °C`;
  if (max !== null) return `up to ${t(max)} °C`;
  if (min !== null) return `from ${t(min)} °C`;
  return null;
}
