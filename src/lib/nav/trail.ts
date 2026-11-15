// The trail of pages a person has visited in this tab, so every Cancel and
// "← back" link returns to where they actually came from. Pure functions; the
// browser side lives in components/nav-trail.tsx.
//
// Rules:
// - One entry per page (path). Changing a page's filters or search updates
//   its entry rather than adding another.
// - Arriving at a page already on the trail means going back to it: the
//   trail is cut there. Going back never builds up a loop.
// - Form pages (new, edit, add) are skipped when going back, so Cancel or
//   "back" after a save never lands on a form that was already left.

const MAX = 30;

export const pathOf = (url: string) => url.split(/[?#]/)[0] || "/";

/** Pages whose only purpose is to fill in a form. */
export function isFormPage(url: string): boolean {
  return /\/(new|edit|add)$/.test(pathOf(url));
}

/** The trail after arriving at url. */
export function record(trail: readonly string[], url: string): string[] {
  const path = pathOf(url);
  const at = trail.findIndex((u) => pathOf(u) === path);
  const next = at >= 0 ? [...trail.slice(0, at), url] : [...trail, url];
  return next.slice(-MAX);
}

/** Where "back" from the current page goes, or null when the trail does not say. */
export function previous(trail: readonly string[], current: string): string | null {
  const path = pathOf(current);
  const at = trail.findIndex((u) => pathOf(u) === path);
  for (let i = (at >= 0 ? at : trail.length) - 1; i >= 0; i--) {
    const u = trail[i];
    if (pathOf(u) !== path && !isFormPage(u)) return u;
  }
  return null;
}

/** A short name for a back link: "Today", "History", "Skier"… */
export function backLabel(url: string): string {
  const p = pathOf(url);
  if (p === "/") return "Today";
  if (p.startsWith("/account/skiers/")) return "Skier";
  if (p.startsWith("/account")) return "Account";
  if (p.startsWith("/wax-box/skis/")) return "Ski";
  if (p.startsWith("/wax-box/skis")) return "Skis";
  if (/^\/wax-box\/[^/]+$/.test(p)) return "Wax";
  if (p.startsWith("/wax-box")) return "Wax box";
  if (/^\/history\/[^/]+$/.test(p)) return "Session";
  if (p.startsWith("/history")) return "History";
  if (/^\/plan\/[^/]+$/.test(p)) return "Plan";
  if (p.startsWith("/plan")) return "Plan";
  if (/^\/learn\/[^/]+$/.test(p)) return "Video";
  if (p.startsWith("/learn")) return "Learn";
  if (p.startsWith("/venues")) return "Venues";
  return "Back";
}
