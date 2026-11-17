// Removing one of your locations that has sessions: which other location to
// offer to move them to. The two Lake Louise entries are the case it is for —
// a duplicate added by hand beside the shared one, spelt a little differently.

export type Candidate = { id: string; name: string };

/** Lower case, accents and punctuation gone, single spaces. "Lake-Louise " → "lake louise". */
export function normalName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * The location to pre-select: the same name first, then one whose name
 * contains the other's ("Lake Louise" and "Lake Louise Nordic"). Several
 * equally good matches, or none, pre-select nothing: a guess here moves
 * someone's history, so it is only offered when it is plain.
 */
export function suggestTarget(name: string, candidates: Candidate[]): string | null {
  const n = normalName(name);
  if (!n) return null;
  const pick = (list: Candidate[]) => (list.length === 1 ? list[0].id : null);
  const same = candidates.filter((c) => normalName(c.name) === n);
  if (same.length) return pick(same);
  const near = candidates.filter((c) => {
    const m = normalName(c.name);
    return m.length > 0 && (` ${m} `.includes(` ${n} `) || ` ${n} `.includes(` ${m} `));
  });
  return pick(near);
}
