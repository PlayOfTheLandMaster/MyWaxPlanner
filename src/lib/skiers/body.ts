// Birth year and month and weight: the same three optional fields for a
// skier and for the account holder. Kept apart from the forms so the rules
// (and the age sum) can be tested.

export type Body = { birth_year: number | null; birth_month: number | null; weight_kg: number | null };

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const FIRST_YEAR = 1920;

/** Years for the Birth year pull-down, newest first. */
export function birthYears(now = new Date()): number[] {
  const last = now.getFullYear();
  return Array.from({ length: last - FIRST_YEAR + 1 }, (_, i) => last - i);
}

/** Reads the three fields; any can be blank. Returns an error the person can act on. */
export function readBody(form: FormData, now = new Date()): Body | { error: string } {
  const text = (k: string) => String(form.get(k) ?? "").trim();
  const yearText = text("birth_year");
  const monthText = text("birth_month");
  const weightText = text("weight_kg").replace(",", ".");

  const year = yearText ? Number(yearText) : null;
  if (year !== null && (!Number.isInteger(year) || year < FIRST_YEAR || year > now.getFullYear())) {
    return { error: "Pick a birth year from the list." };
  }
  const month = monthText ? Number(monthText) : null;
  if (month !== null && (!Number.isInteger(month) || month < 1 || month > 12)) return { error: "Pick a birth month from the list." };
  if (month !== null && year === null) return { error: "Add the birth year too, or clear the month." };
  if (year !== null && month !== null && new Date(year, month - 1, 1) > now) return { error: "That birth month is in the future." };

  const weight = weightText ? Number(weightText) : null;
  if (weight !== null && (!Number.isFinite(weight) || weight < 10 || weight > 250)) {
    return { error: "Weight should be in kilograms, between 10 and 250." };
  }
  return { birth_year: year, birth_month: month, weight_kg: weight === null ? null : Math.round(weight * 10) / 10 };
}

/**
 * Age in whole years. With only the year, the age they turn this year — the
 * way cross-country age classes count — marked as approximate.
 */
export function ageOf(b: Pick<Body, "birth_year" | "birth_month">, now = new Date()): { years: number; exact: boolean } | null {
  if (b.birth_year === null) return null;
  const turnsThisYear = now.getFullYear() - b.birth_year;
  if (b.birth_month === null) return { years: turnsThisYear, exact: false };
  return { years: turnsThisYear - (now.getMonth() + 1 < b.birth_month ? 1 : 0), exact: true };
}

/** "Age 13 · 42 kg", "Turns 13 this year", or "" when nothing is filled in. */
export function describeBody(b: Body, now = new Date()): string {
  const age = ageOf(b, now);
  const parts: string[] = [];
  if (age) parts.push(age.exact ? `Age ${age.years}` : `Turns ${age.years} this year`);
  if (b.weight_kg !== null) parts.push(`${Number(b.weight_kg)} kg`);
  return parts.join(" · ");
}
