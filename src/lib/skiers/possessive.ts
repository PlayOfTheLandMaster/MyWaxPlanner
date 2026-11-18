// "Anna E's Skis": a skier's name made possessive for a label. A trailing
// full stop (names are saved as "Anna E.") is dropped first, as the owner
// writes it; a name ending in s takes 's as well ("Chris's"). Pure, tested.
export function possessive(name: string): string {
  const n = name.trim().replace(/\.$/, "");
  return n ? `${n}'s` : "";
}

/** The Skis picker's label: whose skis they are, or just "Skis". */
export function skisLabel(name: string | null | undefined): string {
  const p = possessive(name ?? "");
  return p ? `${p} Skis` : "Skis";
}
