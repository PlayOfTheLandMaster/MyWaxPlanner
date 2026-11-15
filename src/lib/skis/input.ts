// What a ski save may contain. Every ski action runs this, because a form is
// not a check: the database refuses the same things, but its messages are
// written for programmers.

export const TECHNIQUES = ["classic", "skate"] as const;
export const SKI_CATEGORIES = ["waxable", "skin", "zero", "hairies"] as const;

export type Technique = (typeof TECHNIQUES)[number];
export type SkiCategory = (typeof SKI_CATEGORIES)[number];

export const TECHNIQUE_LABELS: Record<Technique, string> = { classic: "Classic", skate: "Skate" };

export const SKI_CATEGORY_LABELS: Record<SkiCategory, string> = {
  waxable: "Waxable (grip wax)",
  skin: "Skin",
  zero: "Zero",
  hairies: "Hairies / crown",
};

// Cross-country ski makers offered in the Brand pull-down, A to Z. Anything
// else is typed in under "Other", so this list never blocks a save; the
// column stays plain text.
export const SKI_BRANDS = [
  "Alpina",
  "Atomic",
  "Fischer",
  "Kästle",
  "Madshus",
  "Peltonen",
  "Rossignol",
  "Salomon",
  "Sporten",
  "Yoko",
] as const;

export type SkiInput = {
  name: string;
  /** Whose skis: one of the account's skiers, or null for the account holder ("Me"). */
  skier_id: string | null;
  technique: Technique;
  category: SkiCategory | null;
  brand: string | null;
  model: string | null;
  base_material: string | null;
  grind: string | null;
  flex: string | null;
  grip_zone_cm: number | null;
  notes: string | null;
};

export type SkiResult = { ski: SkiInput; error?: undefined } | { ski?: undefined; error: string };

const text = (v: FormDataEntryValue | null): string | null => {
  const s = typeof v === "string" ? v.trim().replace(/\s+/g, " ") : "";
  return s === "" ? null : s;
};

export function readSki(form: FormData): SkiResult {
  const name = text(form.get("name"));
  if (!name) return { error: "Give the pair a name, such as “Race classic” or “Rock skis”." };

  const technique = text(form.get("technique"));
  if (!(TECHNIQUES as readonly string[]).includes(technique ?? "")) {
    return { error: "Choose classic or skate." };
  }

  // Only classic skis have a grip type; a skate ski's is always empty, which
  // the database also insists on.
  let category: SkiCategory | null = null;
  if (technique === "classic") {
    const c = text(form.get("category"));
    if (c !== null) {
      if (!(SKI_CATEGORIES as readonly string[]).includes(c)) return { error: "Choose a grip type." };
      category = c as SkiCategory;
    }
  }

  // Grip zone length only means something on a waxable classic ski.
  let gripZone: number | null = null;
  const rawZone = technique === "classic" && category === "waxable" ? text(form.get("grip_zone_cm")) : null;
  if (rawZone !== null) {
    const n = Number(rawZone.replace(",", "."));
    if (!Number.isFinite(n) || n <= 0 || n >= 150) {
      return { error: "Grip zone length should be in centimetres, between 1 and 149." };
    }
    gripZone = Math.round(n * 10) / 10;
  }

  const skier = text(form.get("skier_id"));
  return {
    ski: {
      name,
      skier_id: skier && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(skier) ? skier : null,
      technique: technique as Technique,
      category,
      brand: text(form.get("brand")),
      model: text(form.get("model")),
      base_material: text(form.get("base_material")),
      grind: text(form.get("grind")),
      flex: text(form.get("flex")),
      grip_zone_cm: gripZone,
      notes: text(form.get("notes")),
    },
  };
}
