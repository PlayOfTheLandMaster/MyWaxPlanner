// The getting-started checklist on Today, and the "what next" card each of its
// steps shows once it is done. A new account used to set a home venue and then
// find nothing on the Venues page pointing anywhere else.

export type StepKey = "venue" | "skis" | "waxes" | "tools";

export type Step = { key: StepKey; done: boolean; label: string; href: string };

export type SetupFacts = {
  home: boolean;
  skis: number;
  waxes: number;
  tools: number;
};

/** The four steps in order. Links carry ?start=1 so a page knows it was opened from the checklist. */
export function setupSteps(f: SetupFacts): Step[] {
  return [
    {
      key: "venue",
      done: f.home,
      label: "Pick a home venue",
      href: "/venues?start=1",
    },
    {
      key: "skis",
      done: f.skis > 0,
      label: "Add your skis",
      href: "/wax-box/skis/new?start=1",
    },
    {
      key: "waxes",
      done: f.waxes > 0,
      label: "Add your waxes",
      href: "/wax-box/add?start=1",
    },
    {
      key: "tools",
      done: f.tools > 0,
      label: "Tick the tools you own",
      href: "/wax-box/tools?start=1",
    },
  ];
}

export type NextCard =
  | { kind: "next"; doneLabel: string; next: Step; left: number }
  | { kind: "finished" }
  | null;

const DONE_LABELS: Record<StepKey, string> = {
  venue: "Home venue set.",
  skis: "Skis added.",
  waxes: "Waxes added.",
  tools: "Tools ticked.",
};

/**
 * What the page for `current` should offer: the next step still to do (the
 * first undone one after this, wrapping round), or "all set" when every step
 * is done and the page was opened from the checklist. Nothing while this
 * step itself is still undone, or once setup is long finished.
 */
export function nextCard(
  steps: Step[],
  current: StepKey,
  fromChecklist: boolean,
): NextCard {
  const i = steps.findIndex((s) => s.key === current);
  if (i < 0 || !steps[i].done) return null;
  const order = [...steps.slice(i + 1), ...steps.slice(0, i)];
  const next = order.find((s) => !s.done);
  if (next)
    return {
      kind: "next",
      doneLabel: DONE_LABELS[current],
      next,
      left: steps.filter((s) => !s.done).length,
    };
  return fromChecklist ? { kind: "finished" } : null;
}
