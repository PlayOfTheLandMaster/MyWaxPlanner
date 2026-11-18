// The recommendation engine. Pure functions, no database: the Plan page loads
// the data, this decides. Brand-neutral by construction: a wax is scored only
// on what it says about itself (category, ranges, snow types, humidity,
// fluoro status) and on how it went for this skier before. Brand never counts.
//
// 1. Rules (the `rules` table) decide which layers the plan has and which
//    wax categories suit each layer under today's conditions.
// 2. Every wax of a suitable category is scored on temperature, snow type,
//    humidity, category weight and the skier's own history.
// 3. The best wax in the box is the pick; better ones from the catalogue are
//    offered to buy. Race plans only use fluoro-free waxes.
// 4. The procedure is built from the layers, using only tools the skier owns.

import type { Product } from "@/lib/wax-box/load";
import type { HumidityBand, SnowType } from "@/lib/catalogue/vocab";
import { rangeFor } from "@/lib/wax-box/old-snow";

export type Mode = "recreational" | "race";
export type GripType = "waxable" | "skin" | "zero" | "hairies" | null;

export type Conditions = {
  snow_temp_c: number | null;
  air_temp_c: number | null;
  snow_type: SnowType | null;
  snow_humidity_band: HumidityBand | null;
  air_humidity_band: HumidityBand | null;
  new_snow_cm: number | null;
};

export type Rule = {
  technique: "classic" | "skate" | null;
  mode: Mode | null;
  layer_role: string;
  snow_temp_min_c: number | null;
  snow_temp_max_c: number | null;
  snow_types: string[];
  snow_humidity_bands: string[];
  product_category: string;
  weight: number;
  notes: string | null;
};

export type Candidate = Product & {
  /** Set when the wax is in the skier's box. */
  user_product_id: string | null;
  amount_left: "full" | "half" | "low" | "empty" | null;
  price: number | null;
  currency: string | null;
  buy_url: string | null;
};

export type HistoryRow = {
  snow_temp_c: number | null;
  product_ids: string[];
  glide_rating: number | null;
  grip_rating: number | null;
};

export type Ski = { name: string; grind: string | null; grip_zone_cm: number | null } | null;

export type Request = {
  technique: "classic" | "skate";
  gripType: GripType;
  mode: Mode;
  /** Limit the temperature wax to one category, e.g. "liquid_glider", or "any". */
  family: string;
  conditions: Conditions;
  ski: Ski;
};

export type Fit = "great" | "good" | "workable";
export type Pick = { product: Candidate; score: number; fit: Fit; reasons: string[] };

export type LayerPlan = {
  role: string;
  zone: "glide" | "grip";
  categories: string[];
  pick: Pick | null;
  /** Waxes from the catalogue that would beat the pick (or fill the gap). */
  market: Pick[];
  note: string | null;
};

export type Step = { text: string; tools: string[] };
export type Gap = { kind: "wax" | "tool"; text: string };

export type Recommendation = {
  layers: LayerPlan[];
  procedure: { title: string; steps: Step[] }[];
  gaps: Gap[];
  warnings: string[];
  /** Grip: what to carry if the snow warms or cools. */
  carry: Pick[];
};

export const GLIDE_ROLES = ["cleaning", "base", "temperature", "top_coat", "powder"];
export const GRIP_ROLES = ["binder", "kick", "cover", "skin_care"];
const ROLE_ORDER = [...GLIDE_ROLES, ...GRIP_ROLES];

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

export function ruleMatches(rule: Rule, req: Request): boolean {
  const c = req.conditions;
  if (rule.technique && rule.technique !== req.technique) return false;
  if (rule.mode && rule.mode !== req.mode) return false;
  const t = c.snow_temp_c;
  if (rule.snow_temp_min_c !== null && (t === null || t < rule.snow_temp_min_c)) return false;
  if (rule.snow_temp_max_c !== null && (t === null || t > rule.snow_temp_max_c)) return false;
  if (rule.snow_types.length && (!c.snow_type || !rule.snow_types.includes(c.snow_type))) return false;
  if (rule.snow_humidity_bands.length && (!c.snow_humidity_band || !rule.snow_humidity_bands.includes(c.snow_humidity_band))) {
    return false;
  }
  // Grip layers only exist on skis that take them.
  const role = rule.layer_role;
  if (["binder", "kick", "cover"].includes(role) && !(req.technique === "classic" && req.gripType === "waxable")) return false;
  if (role === "skin_care" && !(req.technique === "classic" && req.gripType === "skin")) return false;
  return true;
}

/** The plan's layers and, for each, its wax categories with their weights. */
export function layersFor(rules: Rule[], req: Request): { role: string; weights: Map<string, number>; notes: string[] }[] {
  const byRole = new Map<string, { weights: Map<string, number>; notes: string[] }>();
  for (const r of rules) {
    if (!ruleMatches(r, req)) continue;
    const entry = byRole.get(r.layer_role) ?? { weights: new Map<string, number>(), notes: [] as string[] };
    entry.weights.set(r.product_category, Math.max(entry.weights.get(r.product_category) ?? 0, r.weight));
    if (r.notes) entry.notes.push(r.notes);
    byRole.set(r.layer_role, entry);
  }
  // A cover only makes sense over klister.
  const kick = byRole.get("kick");
  if (byRole.has("cover") && !(kick && topCategory(kick.weights) === "klister")) byRole.delete("cover");
  // The skier asked for one kind of glide wax: keep only that for the temperature layer.
  const temp = byRole.get("temperature");
  if (temp && req.family !== "any") {
    temp.weights = new Map([[req.family, 2]]);
  }
  return ROLE_ORDER.filter((r) => byRole.has(r)).map((role) => ({ role, ...byRole.get(role)! }));
}

const topCategory = (w: Map<string, number>) => [...w.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

const deg = (n: number) => `${n > 0 ? "+" : ""}${n}`.replace("-", "−");

/** 1 when the snow temperature sits well inside the wax's range, falling to 0 four degrees outside it. */
export function temperatureFit(p: { temp_min_c: number | null; temp_max_c: number | null }, t: number | null): number | null {
  if (t === null) return null;
  const min = p.temp_min_c === null ? null : Number(p.temp_min_c);
  const max = p.temp_max_c === null ? null : Number(p.temp_max_c);
  if (min === null && max === null) return null;
  const lo = min ?? -40;
  const hi = max ?? 0;
  if (t < lo) return Math.max(0, 1 - (lo - t) / 4);
  if (t > hi) return Math.max(0, 1 - (t - hi) / 4);
  // Inside the range: best in the middle, still good at the edges.
  const width = Math.max(1, hi - lo);
  const fromEdge = Math.min(t - lo, hi - t);
  return 0.8 + 0.2 * Math.min(1, fromEdge / (width / 2));
}

function historyBoost(p: Candidate, zone: "glide" | "grip", t: number | null, history: HistoryRow[]): { boost: number; reason: string | null } {
  if (t === null) return { boost: 0, reason: null };
  const ratings = history
    .filter((h) => h.snow_temp_c !== null && Math.abs(h.snow_temp_c - t) <= 3 && h.product_ids.includes(p.id))
    .map((h) => (zone === "glide" ? h.glide_rating : h.grip_rating))
    .filter((r): r is number => r !== null);
  if (!ratings.length) return { boost: 0, reason: null };
  const avg = ratings.reduce((s, r) => s + r, 0) / ratings.length;
  return {
    boost: 0.1 * (avg - 3), // a 5 adds 0.2, a 1 takes 0.2 away
    reason: `you rated it ${avg.toFixed(1)}/5 in similar snow (${ratings.length}×)`,
  };
}

export function scoreProduct(
  p: Candidate,
  role: string,
  weights: Map<string, number>,
  req: Request,
  history: HistoryRow[],
): Pick | null {
  const c = req.conditions;
  const weight = weights.get(p.category);
  if (weight === undefined) return null;
  if (p.amount_left === "empty") return null;
  // Race-legal only: FIS and most national federations ban fluorinated wax.
  if (req.mode === "race" && (p.fluoro_status === "low" || p.fluoro_status === "high")) return null;

  const reasons: string[] = [];
  const zone: "glide" | "grip" = GRIP_ROLES.includes(role) ? "grip" : "glide";
  const maxWeight = Math.max(...weights.values());

  // Temperature matters most for the temperature wax and the kick wax; base,
  // cleaning and top coats are often all-round.
  const tempCritical = role === "temperature" || role === "kick" || role === "cover";
  // On old or transformed snow, a wax with a second range is judged by that one.
  const r = rangeFor(p, c.snow_type);
  const tf = temperatureFit(r, c.snow_temp_c);
  let score: number;
  if (tf === null) {
    score = tempCritical ? 0.35 : 0.65;
    if (tempCritical) reasons.push("no temperature range on record");
  } else {
    score = tf;
    const range = `${r.old ? "old-snow range " : ""}${r.temp_min_c === null ? "…" : deg(Number(r.temp_min_c))} to ${r.temp_max_c === null ? "…" : deg(Number(r.temp_max_c))} °C`;
    reasons.push(
      tf >= 0.8 ? `${range} covers ${deg(c.snow_temp_c!)} °C snow` : `${range}, a little off ${deg(c.snow_temp_c!)} °C`,
    );
    if (!tempCritical) score = 0.5 + score / 2;
  }

  if (c.snow_type && p.snow_types.length) {
    if (p.snow_types.includes(c.snow_type)) {
      score += 0.1;
      reasons.push("made for this snow type");
    } else score -= 0.1;
  }
  if (c.snow_humidity_band && p.humidity_bands.length) {
    if (p.humidity_bands.includes(c.snow_humidity_band)) {
      score += 0.05;
      reasons.push(`${c.snow_humidity_band} snow`);
    } else score -= 0.05;
  }
  if (p.layer_roles.length && p.layer_roles.includes(role)) score += 0.03;
  // The category the rules prefer gets a small lead (e.g. synthetic for race).
  score -= 0.1 * (1 - weight / maxWeight);
  if (req.mode === "race" && p.fluoro_status === "unknown") {
    score -= 0.05;
    reasons.push("fluoro status not recorded — check it's race-legal");
  }
  if (p.amount_left === "low") reasons.push("running low");

  const h = historyBoost(p, zone, c.snow_temp_c, history);
  score += h.boost;
  if (h.reason) reasons.push(h.reason);

  score = Math.max(0, Math.min(1.2, score));
  const fit: Fit = score >= 0.8 ? "great" : score >= 0.55 ? "good" : "workable";
  if (score < 0.3) return null;
  return { product: p, score: Math.round(score * 100) / 100, fit, reasons };
}

// ---------------------------------------------------------------------------
// The plan
// ---------------------------------------------------------------------------

export function recommend(
  req: Request,
  rules: Rule[],
  box: Candidate[],
  catalogue: Candidate[],
  history: HistoryRow[],
  ownedTools: Set<string>,
): Recommendation {
  const warnings: string[] = [];
  const gaps: Gap[] = [];
  const c = req.conditions;
  if (c.snow_temp_c === null) warnings.push("No snow temperature: waxes are chosen without a temperature match.");

  const layers: LayerPlan[] = layersFor(rules, req).map(({ role, weights, notes }) => {
    const rank = (list: Candidate[]) =>
      list
        .map((p) => scoreProduct(p, role, weights, req, history))
        .filter((x): x is Pick => x !== null)
        // Ties are broken by the wax's id: a fixed order that says nothing about
        // brand or price. Price used to break ties, which put brands with no
        // stored price (and prices from one shop, in one currency) last, and
        // name order would always put the same brands first.
        .sort((a, b) => b.score - a.score || (a.product.id < b.product.id ? -1 : a.product.id > b.product.id ? 1 : 0));
    const pick = rank(box)[0] ?? null;
    const ownedIds = new Set(box.map((b) => b.id));
    const market = rank(catalogue.filter((p) => !ownedIds.has(p.id)))
      .filter((m) => !pick || m.score > pick.score + 0.05)
      .slice(0, 3);
    const zone: "glide" | "grip" = GRIP_ROLES.includes(role) ? "grip" : "glide";
    const categories = [...weights.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
    if (!pick) gaps.push({ kind: "wax", text: `${ROLE_TEXT[role] ?? role}: nothing suitable in your box (${categories.map((k) => CATEGORY_TEXT[k] ?? k).join(" or ")}).` });
    return { role, zone, categories, pick, market, note: notes[0] ?? null };
  });

  if (!layers.some((l) => l.role === "temperature")) warnings.push("No glide layer matched the rules. Check the rules table.");
  structureWarnings(req, warnings);

  // Grip: the next warmer and colder kick wax, to carry in a pocket.
  const carry: Pick[] = [];
  const kick = layers.find((l) => l.role === "kick");
  if (kick?.pick && c.snow_temp_c !== null) {
    const others = box.filter((p) => (p.category === "hardwax" || p.category === "klister") && p.id !== kick.pick!.product.id && p.amount_left !== "empty");
    const mid = (p: Candidate) => {
      const r = rangeFor(p, c.snow_type);
      return ((r.temp_min_c ?? -20) + (r.temp_max_c ?? 0)) / 2;
    };
    const current = mid(kick.pick.product);
    const warmer = others.filter((p) => mid(p) > current).sort((a, b) => mid(a) - mid(b))[0];
    const colder = others.filter((p) => mid(p) < current).sort((a, b) => mid(b) - mid(a))[0];
    for (const [p, why] of [
      [warmer, "if it slips as the day warms"],
      [colder, "if it ices or the snow cools"],
    ] as const) {
      if (p) carry.push({ product: p, score: 0, fit: "workable", reasons: [why] });
    }
  }

  const procedure = buildProcedure(req, layers, ownedTools, gaps);
  return { layers, procedure, gaps, warnings, carry };
}

function structureWarnings(req: Request, warnings: string[]) {
  const grind = req.ski?.grind?.toLowerCase() ?? "";
  const t = req.conditions.snow_type;
  const wetOrCoarse = t === "wet" || t === "transformed" || req.conditions.snow_humidity_band === "wet";
  const coldFine = (t === "falling" || t === "fresh_set" || t === "fine_grained") && (req.conditions.snow_temp_c ?? 0) <= -8;
  if (/fine|cold|linear/.test(grind) && wetOrCoarse) {
    warnings.push(`${req.ski!.name} has a ${req.ski!.grind} grind; on wet or coarse snow, add rills or use a pair with a medium–coarse structure.`);
  }
  if (/coarse|wet|warm/.test(grind) && coldFine) {
    warnings.push(`${req.ski!.name} has a ${req.ski!.grind} grind; on cold fine snow a finer structure will glide better.`);
  }
}

const ROLE_TEXT: Record<string, string> = {
  cleaning: "Cleaning",
  base: "Base layer",
  temperature: "Glide wax",
  top_coat: "Top coat",
  powder: "Powder",
  binder: "Grip binder",
  kick: "Kick wax",
  cover: "Cover layer",
  skin_care: "Skin care",
};

const CATEGORY_TEXT: Record<string, string> = {
  base_prep: "base/prep wax",
  base_cleaner: "base cleaner",
  hydrocarbon: "hydrocarbon wax",
  synthetic: "fluoro-free performance wax",
  liquid_glider: "liquid glider",
  paste_glider: "paste glider",
  top_coat: "top coat",
  powder: "powder",
  binder: "binder",
  hardwax: "hardwax",
  klister: "klister",
  skin_care: "skin wax or spray",
  skin_cleaner: "skin cleaner",
};

export { ROLE_TEXT, CATEGORY_TEXT };

// ---------------------------------------------------------------------------
// Procedure
// ---------------------------------------------------------------------------

/** Owned-tool keys look like "brush:brass" or "groove_scraper:". */
export const toolKey = (type: string, subType: string | null) => `${type}:${subType ?? ""}`;

function buildProcedure(req: Request, layers: LayerPlan[], tools: Set<string>, gaps: Gap[]) {
  const has = (type: string, sub?: string) =>
    [...tools].some((k) => k.startsWith(`${type}:`) && (sub === undefined || k === `${type}:${sub}`));
  const missing = new Set<string>();
  const need = (what: string, ok: boolean) => {
    if (!ok) missing.add(what);
    return ok;
  };
  const name = (l: LayerPlan) => (l.pick ? `${l.pick.product.brand.name} ${l.pick.product.name}` : `a ${CATEGORY_TEXT[l.categories[0]] ?? l.categories[0]}`);
  const ironTemp = (l: LayerPlan, fallback: number) => l.pick?.product.iron_temp_c ?? fallback;

  const iron = has("iron");
  const plexi = has("scraper", "plexi");
  const groove = has("groove_scraper");
  const stiff = has("brush", "brass") ? "brass" : has("brush", "steel") ? "steel" : has("brush", "combi") ? "combi (metal side)" : null;
  const nylon = has("brush", "nylon") || has("brush", "combi");
  const horse = has("brush", "horsehair");
  const roto = has("roto_brush", "nylon") || has("roto_brush", "horsehair");
  const cork = has("cork") || has("roto_brush", "cork");
  const fibertex = has("fibertex");
  const profile = has("profile") || has("vise");
  const heat = has("heat_gun");
  const rills = has("structure_tool");
  const warm = (req.conditions.snow_temp_c ?? -10) > -4;

  const scrapeBrush = (): Step[] => [
    {
      text: `Scrape with ${need("Plexi scraper", plexi) ? "the plexi scraper" : "a plexi scraper"} in long tip-to-tail strokes${groove ? " and clear the groove with the groove scraper" : ""}.`,
      tools: ["Plexi scraper", ...(groove ? ["Groove scraper"] : [])],
    },
    {
      text: [
        stiff ? `${stiff} brush 10 strokes` : null,
        nylon ? "nylon brush 10–15 strokes" : null,
        horse ? "horsehair to finish" : null,
      ]
        .filter(Boolean)
        .join(", ")
        .replace(/^./, (s) => s.toUpperCase()) + (stiff || nylon || horse ? ", always tip to tail." : "Brush tip to tail until the structure shows."),
      tools: [stiff ? "Metal brush" : "", nylon ? "Nylon brush" : "", horse ? "Horsehair brush" : ""].filter(Boolean),
    },
  ];
  if (!stiff && !nylon) missing.add("Nylon brush");

  const glide: Step[] = [];
  const grip: Step[] = [];
  if (profile) glide.push({ text: "Clamp the skis base-up in the profile or vise.", tools: ["Waxing profile"] });
  if (req.technique === "classic" && req.gripType === "waxable") {
    glide.push({
      text: `Mark the grip zone${req.ski?.grip_zone_cm ? ` (${req.ski.grip_zone_cm} cm)` : ""} and keep every glide product off it.`,
      tools: [],
    });
  }

  for (const l of layers.filter((x) => x.zone === "glide")) {
    const n = name(l);
    switch (l.role) {
      case "cleaning":
        if (need("Wax iron", iron)) {
          glide.push({ text: `Hot scrape: iron in ${n} at ${ironTemp(l, 120)} °C and scrape it off while still warm, to lift dirt and old wax.`, tools: ["Wax iron", "Plexi scraper"] });
        } else {
          glide.push({ text: `Clean the base with ${n}, then let it dry 10 minutes.`, tools: [] });
        }
        if (stiff) glide.push({ text: `Open the structure with the ${stiff} brush, tip to tail.`, tools: ["Metal brush"] });
        break;
      case "base":
      case "temperature": {
        const liquid = l.pick?.product.form === "liquid" || l.pick?.product.category === "liquid_glider" || l.pick?.product.category === "paste_glider";
        if (liquid) {
          glide.push({ text: `Apply a thin, even coat of ${n}; let it dry 10–15 minutes.`, tools: [] });
          glide.push({ text: `${cork ? "Cork it in, then" : "Then"} ${horse || nylon ? `brush with ${horse ? "horsehair" : "nylon"}` : "polish with fibertex"}.`, tools: [] });
        } else if (need("Wax iron", iron)) {
          glide.push({ text: `Crayon or drip ${n} along the base and iron it in at ${ironTemp(l, l.role === "base" ? 130 : 120)} °C: one slow, steady pass, never stopping.`, tools: ["Wax iron"] });
          glide.push({ text: `Let the skis cool to room temperature (${req.mode === "race" ? "30 minutes or more" : "15–20 minutes"}).`, tools: [] });
          glide.push(...scrapeBrush());
        } else {
          glide.push({ text: `Rub ${n} on and cork it in hard; without an iron it will wear off sooner.`, tools: [] });
        }
        break;
      }
      case "top_coat":
      case "powder":
        glide.push({ text: `Top coat: apply ${n} thinly, let it dry, ${cork ? "cork it in, " : ""}then ${horse ? "horsehair" : "nylon"} brush and ${fibertex ? "polish with fibertex" : "finish with a light brush"}.`, tools: [] });
        break;
    }
  }

  if (roto && layers.some((l) => l.zone === "glide")) {
    glide.push({ text: "Finish with the roto brush (nylon then horsehair), 5–6 passes each, at moderate speed, tip to tail.", tools: ["Roto brush"] });
  }
  if (warm && (req.conditions.snow_type === "wet" || req.conditions.snow_type === "transformed")) {
    glide.push(
      rills
        ? { text: "Add rills with the structure tool (0.75–1 mm insert), tip and tail, after brushing.", tools: ["Structure tool"] }
        : { text: "Wet, coarse snow: rills would help; a structure tool adds them.", tools: [] },
    );
  }

  for (const l of layers.filter((x) => x.zone === "grip")) {
    const n = name(l);
    const zoneLen = req.ski?.grip_zone_cm ? `${req.ski.grip_zone_cm} cm` : "the marked";
    switch (l.role) {
      case "binder":
        grip.push({ text: "Lightly sand the grip zone (100–120 grit) if it is smooth.", tools: [] });
        grip.push({
          text: iron ? `Iron in a thin layer of ${n} over ${zoneLen} zone; let it cool fully.` : `Rub on a thin layer of ${n}, warm it smooth${heat ? " with the heat gun" : ""}, let it cool.`,
          tools: iron ? ["Wax iron"] : [],
        });
        break;
      case "kick":
        if (l.pick?.product.category === "klister" || (!l.pick && l.categories[0] === "klister")) {
          grip.push({ text: `Warm the tube of ${n}; apply a thin herringbone or ladder pattern down each side of the groove in ${zoneLen} zone.`, tools: [] });
          grip.push({ text: `Smooth it ${heat ? "with the heat gun" : "with your thumb or the klister spatula"}, then let it set outside for 15 minutes.`, tools: heat ? ["Heat gun"] : [] });
        } else {
          grip.push({ text: `Crayon ${n} in thin layers over ${zoneLen} zone, ${cork ? "corking each smooth" : "rubbing each smooth"}.`, tools: cork ? ["Cork"] : [] });
          grip.push({ text: `Start with ${req.mode === "race" ? "4–6" : "3–4"} layers; let the skis cool outside before testing.`, tools: [] });
        }
        break;
      case "cover":
        grip.push({ text: `Once the klister is cold, add a thin cover of ${n} and cork it lightly — it stops new snow sticking.`, tools: cork ? ["Cork"] : [] });
        break;
      case "skin_care":
        grip.push({ text: `Brush loose snow and dirt off the skins; apply ${n} and let it dry before skiing.`, tools: [] });
        break;
    }
  }
  if (layers.some((l) => l.role === "kick")) {
    grip.push({ text: "On snow: slipping → add a layer or lengthen the zone (or go warmer); icing or sticking → scrape back or go colder.", tools: [] });
  }
  if (req.mode === "race" && layers.some((l) => l.role === "kick")) {
    grip.push({ text: "Race: test two set-ups on the course before the start, and keep the warmer wax in your pocket.", tools: [] });
  }

  for (const t of missing) gaps.push({ kind: "tool", text: `${t} — the procedure works around it, but it makes this easier.` });
  return [
    { title: "Glide", steps: glide },
    ...(grip.length ? [{ title: req.gripType === "skin" ? "Skins" : "Grip", steps: grip }] : []),
  ];
}
