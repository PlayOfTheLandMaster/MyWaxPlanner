// An unsaved wax job, kept in the browser while it is being filled in, so
// leaving the page (for another tab, the Wax box…) and coming back loses
// nothing. Per device and browser, for the day it was started only, and
// cleared by Save or Cancel. Nothing reaches the database until Save. Pure,
// so the rules can be tested; the form does the reading and writing.

export const DRAFT_PREFIX = "mwp-draft:";

export type Draft = {
  v: 1;
  /** The reader's own date it was started, "2026-11-18": only today's is restored. */
  day: string;
  /** The form's own state: technique, skis, layers and the rest. */
  state: Record<string, unknown>;
  /** Plain named fields (notes, conditions…), as typed: name → value(s). */
  fields: Record<string, string | string[]>;
};

/** Where a form's draft is kept: one per form (Record, a copy, an edit) and skier. */
export function draftKey(form: string): string {
  return `${DRAFT_PREFIX}${form}`;
}

/** The draft stored under a key, if it is today's and well formed; else null. */
export function readDraft(raw: string | null, today: string): Draft | null {
  if (!raw) return null;
  try {
    const d = JSON.parse(raw) as Partial<Draft>;
    if (d.v !== 1 || d.day !== today || typeof d.state !== "object" || d.state === null || typeof d.fields !== "object" || d.fields === null) return null;
    return d as Draft;
  } catch {
    return null;
  }
}

/** The form's named fields worth keeping: not hidden ones, not those the form's own state already holds. */
export function draftFields(entries: Iterable<[string, FormDataEntryValue]>, skip: ReadonlySet<string>): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const [name, value] of entries) {
    if (skip.has(name) || typeof value !== "string") continue;
    const prev = out[name];
    out[name] = prev === undefined ? value : Array.isArray(prev) ? [...prev, value] : [prev, value];
  }
  return out;
}

/** Whether anything was entered: an empty draft is not worth a "restored" note. */
export function hasContent(fields: Record<string, string | string[]>): boolean {
  return Object.values(fields).some((v) => (Array.isArray(v) ? v.some((x) => x.trim() !== "") : v.trim() !== ""));
}

/**
 * Whether a draft holds a wax job someone actually started: a wax on a layer,
 * a finish step, or something typed. A tap on the technique or the skis alone
 * is not one, or every visit after a stray tap said "restored" (the owner was
 * confused by exactly that, with nothing on the Sessions tab).
 */
export function worthRestoring(d: Draft): boolean {
  const layers = Array.isArray(d.state.layers) ? (d.state.layers as { user_product_id?: string; custom_product?: string }[]) : [];
  const tags = Array.isArray(d.state.tags) ? d.state.tags : [];
  return layers.some((l) => !!l.user_product_id || !!l.custom_product?.trim()) || tags.length > 0 || hasContent(d.fields);
}
