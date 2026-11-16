// The account holder's name: a first name and the initial of their last name,
// shown as "Finn P." wherever the app used to say "Me". Pure, so the sign-up
// form, the Account page and the display all follow the same rules.

export const FALLBACK = "Me";

export type NameInput = { first_name: string; last_initial: string };

/** "Finn P.", or "Finn" with no initial, or "Me" before a name is known. */
export function displayName(first: string | null | undefined, initial: string | null | undefined): string {
  const f = first?.trim();
  if (!f) return FALLBACK;
  const i = initial?.trim();
  return i ? `${f} ${i.toUpperCase()}.` : f;
}

/**
 * Checks what was typed. The first name is required (1–40 characters); the
 * initial is one letter, and a whole surname is accepted and cut to its first
 * letter, since that is what people type. Returns the clean values or an error.
 */
export function readName(form: { get(name: string): unknown }): NameInput | { error: string } {
  const first = String(form.get("first_name") ?? "").trim().replace(/\s+/g, " ");
  const last = String(form.get("last_initial") ?? "").trim();
  if (!first) return { error: "Enter your first name." };
  if (first.length > 40) return { error: "Keep your first name under 40 characters." };
  const initial = last.match(/\p{L}/u)?.[0]?.toUpperCase() ?? "";
  if (!initial) return { error: "Enter the first letter of your last name." };
  return { first_name: first, last_initial: initial };
}
