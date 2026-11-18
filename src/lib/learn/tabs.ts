// The Learn tab's own tabs, each its own list. A new one is an entry here and
// a component in learn/page.tsx; the bar spreads to fit however many there are.

export const LEARN_TABS = [
  { key: "notes", label: "Notes" },
  { key: "videos", label: "Videos" },
] as const;

export type LearnTab = (typeof LEARN_TABS)[number]["key"];

/** Notes first: they are what a skier keeps adding to. */
export const DEFAULT_TAB: LearnTab = "notes";

/** The tab named in the address, or the default for anything else. */
export function learnTab(v: string | undefined): LearnTab {
  return LEARN_TABS.some((t) => t.key === v) ? (v as LearnTab) : DEFAULT_TAB;
}
