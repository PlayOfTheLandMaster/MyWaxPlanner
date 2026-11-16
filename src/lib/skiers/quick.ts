// Which skiers get a one-tap button in the picker. A coach with a squad
// switches between the same few athletes most days, so those come first;
// everyone else is a search away. Pure, so it is testable.

/** Up to this many skiers, every one gets a button and there is no search. */
export const SHOW_ALL_UP_TO = 6;
/** With more, this many get a button (besides the account holder). */
export const QUICK = 4;

/**
 * The skiers to show as buttons: the one picked now, then the most recently
 * picked (newest first), then A–Z to fill up. Ids no longer on the list are
 * skipped, so a deleted skier never leaves a hole.
 */
export function quickPicks<T extends { id: string; name: string }>(
  skiers: T[],
  current: string,
  recent: string[],
  limit = QUICK,
): T[] {
  if (skiers.length <= SHOW_ALL_UP_TO) return skiers;
  const byId = new Map(skiers.map((k) => [k.id, k]));
  const order = [current, ...recent, ...[...skiers].sort((a, b) => a.name.localeCompare(b.name)).map((k) => k.id)];
  const out: T[] = [];
  for (const id of order) {
    const k = byId.get(id);
    if (k && !out.includes(k)) out.push(k);
    if (out.length === limit) break;
  }
  return out;
}

/** Remembers a pick: newest first, no repeats, at most ten kept. */
export function remember(recent: string[], id: string): string[] {
  if (id === "me") return recent;
  return [id, ...recent.filter((r) => r !== id)].slice(0, 10);
}

/** Skiers whose name contains every typed word, ignoring case and accents. */
export function search<T extends { name: string }>(skiers: T[], query: string): T[] {
  const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const words = fold(query).split(/\s+/).filter(Boolean);
  const sorted = [...skiers].sort((a, b) => a.name.localeCompare(b.name));
  return words.length === 0 ? sorted : sorted.filter((k) => words.every((w) => fold(k.name).includes(w)));
}
